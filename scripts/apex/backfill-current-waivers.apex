// Fill blank current-year Client waivers with the answers of the newest earlier year (same rules as the site's carry-over).
// Generated and run by scripts/dup-merge/backfill_waivers.py, which fills two placeholders:
// REHEARSAL (true = do everything, then roll it all back) and the PAYLOAD json (year + one entry per waiver:
// id, SystemModstamp, fill {field: value}, program, and the stamp each filled group depends on).
// Only the listed answer fields (and Program_Type__c when it is blank) are written; no completion stamp is ever set.
// DRY (check mode) runs every guard and builds the updates but performs no DML at all.
// Every RESULT~ line is free of names and emails; the Python wrapper prints them.
Boolean REHEARSAL = /*REHEARSAL*/;
Boolean DRY = /*DRY*/;
Map<String, Object> P = (Map<String, Object>) JSON.deserializeUntyped('/*PAYLOAD*/');

void say(String id, String s) { System.debug(LoggingLevel.ERROR, 'RESULT~' + id + '~' + s); }
String errs(List<Database.Error> es) {
    String r = '';
    for (Database.Error e : es) { r += e.getStatusCode() + ': ' + e.getMessage() + ' '; }
    return r;
}
Boolean blank(Object v) { return v == null || String.isBlank(String.valueOf(v)); }

// Form-completion stamps compared before and after so a fill can never complete a form. Main_Info__c is left out: dynamic SOQL
// cannot see it for the user that runs anonymous Apex ("No such column"), and no group we fill touches it.
List<String> STAMPS = new List<String>{
    'Parent_Guardian_Info__c', 'Emergency_Contact_Info__c', 'Group_Home_Info__c', 'Photo_Release__c',
    'Auth_for_Emerg_Med_Treatment__c', 'Client_Waiver__c', 'Medical_History_Form_PL__c', 'Payer_Info__c',
    'WeightHeight__c', 'Down_Syndrome__c', 'Seizure_Form__c', 'ScoliosisForm__c', 'Confidentiality_HIPPA__c',
    'Hippotherapy_Cancellation_Policy__c', 'Diagnoses_Info__c', 'Informed_Consent__c', 'Screening__c'
};
Map<String, Schema.SObjectField> FIELDS = Schema.SObjectType.VolunteerWaiver__c.fields.getMap();

String year = (String) P.get('year');
List<Object> items = (List<Object>) P.get('waivers');
Savepoint sp = Database.setSavepoint();
Boolean ok = true;
Integer updated = 0;
try {
    List<String> stampsSoql = new List<String>(STAMPS);
    for (Object o : items) {
        Map<String, Object> w = (Map<String, Object>) o;
        Id wid = (Id) w.get('id');
        Map<String, Object> fill = (Map<String, Object>) w.get('fill');
        String program = (String) w.get('program');
        Map<String, Object> need = (Map<String, Object>) w.get('needStampNotCompleted');
        List<String> cols = new List<String>{ 'Id', 'Client__c', 'Year__c', 'Program_Type__c', 'SystemModstamp', 'CreatedDate', 'RecordType.DeveloperName' };
        cols.addAll(stampsSoql);
        cols.addAll(fill.keySet());
        VolunteerWaiver__c live = Database.query('SELECT ' + String.join(cols, ', ') + ' FROM VolunteerWaiver__c WHERE Id = :wid');

        // Guards, checked live: still the oldest current-year Client waiver (the one the site reads), untouched since the
        // backup, target fields still blank, and no form of a group we fill is already completed.
        String bad = '';
        if (live.RecordType.DeveloperName != 'Client' || live.Year__c != year) { bad += 'wrongWaiver '; }
        Datetime backedUp = (Datetime) JSON.deserialize('"' + (String) w.get('modstamp') + '"', Datetime.class);
        if (live.SystemModstamp != backedUp) { bad += 'changedSinceBackup '; }
        Id riderId = live.Client__c; Datetime born = live.CreatedDate;
        if ([SELECT COUNT() FROM VolunteerWaiver__c WHERE Client__c = :riderId AND Year__c = :year
             AND RecordType.DeveloperName = 'Client' AND CreatedDate < :born] > 0) { bad += 'notTheOldest '; }
        for (String f : fill.keySet()) { if (!blank(live.get(f))) { bad += 'notBlank:' + f + ' '; } }
        if (program != null && !blank(live.Program_Type__c)) { bad += 'programSet '; }
        for (String stamp : need.keySet()) { if (live.get(stamp) == 'Completed') { bad += 'completed:' + stamp + ' '; } }
        if (bad != '') { say(wid, 'GUARD FAILED ' + bad); ok = false; continue; }

        Map<String, Object> stampsBefore = new Map<String, Object>();
        for (String s : STAMPS) { stampsBefore.put(s, live.get(s)); }

        VolunteerWaiver__c upd = new VolunteerWaiver__c(Id = wid);
        for (String f : fill.keySet()) {
            Object v = fill.get(f);
            Schema.DisplayType t = FIELDS.get(f).getDescribe().getType();
            if (t == Schema.DisplayType.DOUBLE || t == Schema.DisplayType.INTEGER || t == Schema.DisplayType.CURRENCY || t == Schema.DisplayType.PERCENT) {
                upd.put(f, Decimal.valueOf(String.valueOf(v)));
            } else {
                upd.put(f, String.valueOf(v));
            }
        }
        if (program != null) { upd.Program_Type__c = program; }
        if (DRY) { say(wid, 'guards ok, would fill ' + fill.size() + ' fields' + (program != null ? ' + program ' + program : '')); continue; }
        Database.SaveResult r = Database.update(upd, false);
        if (!r.isSuccess()) { say(wid, 'update FAILED ' + errs(r.getErrors())); ok = false; continue; }
        updated++;

        // After: every filled field holds the planned value and not a single stamp moved.
        List<String> cols2 = new List<String>{ 'Id', 'Program_Type__c' };
        cols2.addAll(stampsSoql);
        cols2.addAll(fill.keySet());
        VolunteerWaiver__c after = Database.query('SELECT ' + String.join(cols2, ', ') + ' FROM VolunteerWaiver__c WHERE Id = :wid');
        Boolean valuesOk = true;
        for (String f : fill.keySet()) { if (String.valueOf(after.get(f)) != String.valueOf(upd.get(f))) { valuesOk = false; } }
        Boolean stampsSame = true;
        for (String s : STAMPS) { if (after.get(s) != stampsBefore.get(s)) { stampsSame = false; } }
        if (!valuesOk || !stampsSame) { ok = false; }
        say(wid, 'filled ' + fill.size() + ' fields' + (program != null ? ' + program ' + program : '')
            + ' valuesAsPlanned=' + valuesOk + ' stampsUnchanged=' + stampsSame);
    }
} catch (Exception e) {
    ok = false;
    say('-', 'EXCEPTION ' + e.getTypeName() + ': ' + e.getMessage());
}
say('-', 'waivers planned=' + items.size() + ' updated=' + updated);
say('-', 'limits soql=' + Limits.getQueries() + '/' + Limits.getLimitQueries() + ' dml=' + Limits.getDmlStatements()
    + '/' + Limits.getLimitDmlStatements() + ' cpu=' + Limits.getCpuTime() + '/' + Limits.getLimitCpuTime());
if (REHEARSAL || !ok) {
    Database.rollback(sp);
    say('-', (REHEARSAL ? 'ROLLED BACK (rehearsal) ' : 'ROLLED BACK after failure ') + 'ok=' + ok);
} else {
    say('-', 'COMMITTED ok=true');
}
