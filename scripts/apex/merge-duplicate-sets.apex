// Merge ONE duplicate Contact set into the Contact that owns the Experience Cloud login.
// Generated and run by scripts/dup-merge/build_merge_apex.py, which fills the two placeholders:
// REHEARSAL (true = do everything, then roll it all back) and the PAYLOAD json computed from the verified backup.
// Every RESULT~ line is free of names and emails; the Python wrapper prints them.
Boolean REHEARSAL = /*REHEARSAL*/;
Map<String, Object> P = (Map<String, Object>) JSON.deserializeUntyped('/*PAYLOAD*/');

void say(String sid, String s) { System.debug(LoggingLevel.ERROR, 'RESULT~' + sid + '~' + s); }
List<Id> toIds(Object o) {
    List<Id> r = new List<Id>();
    if (o != null) { for (Object x : (List<Object>) o) { r.add((Id) x); } }
    return r;
}
String errs(List<Database.Error> es) {
    String r = '';
    for (Database.Error e : es) { r += e.getStatusCode() + ': ' + e.getMessage() + ' '; }
    return r;
}
SObject build(Object patch, Type t) { return (SObject) JSON.deserialize(JSON.serialize(patch), t); }
User login(Id c) {
    List<User> us = [SELECT Username, Email, IsActive FROM User WHERE ContactId = :c LIMIT 1];
    return us.isEmpty() ? null : us[0];
}
// Database.merge takes the master plus at most two others per call.
Boolean doMerge(String sid, SObject master, List<Id> others, String what) {
    for (Integer i = 0; i < others.size(); i += 2) {
        List<Id> chunk = new List<Id>();
        for (Integer j = i; j < Math.min(i + 2, others.size()); j++) { chunk.add(others[j]); }
        for (Database.MergeResult r : Database.merge(master, chunk, false)) {
            if (!r.isSuccess()) { say(sid, what + ' merge FAILED ' + errs(r.getErrors())); return false; }
        }
    }
    say(sid, what + ' merge ok (' + others.size() + ')');
    return true;
}
Boolean doUpdate(String sid, Object patch, Type t, String what) {
    if (patch == null) { return true; }
    SObject rec = build(patch, t);
    Database.DMLOptions o = new Database.DMLOptions();
    o.duplicateRuleHeader.allowSave = true;
    Database.SaveResult r = Database.update(rec, o);
    if (!r.isSuccess()) { say(sid, what + ' update FAILED ' + errs(r.getErrors())); return false; }
    say(sid, what + ' update ok (' + (((Map<String, Object>) patch).size() - 1) + ' fields)');
    return true;
}
// Field NAMES that no longer hold the patched value (a flow or trigger rewrote them).
void check(String sid, Object patch, Type t, String what) {
    if (patch == null) { return; }
    SObject want = build(patch, t);
    List<String> fs = new List<String>(((Map<String, Object>) patch).keySet());
    fs.remove(fs.indexOf('Id'));
    SObject got = Database.query('SELECT ' + String.join(fs, ',') + ' FROM ' + String.valueOf(t) + ' WHERE Id = \'' + want.Id + '\'');
    List<String> bad = new List<String>();
    for (String f : fs) { if (want.get(f) != got.get(f)) { bad.add(f); } }
    say(sid, what + ' differs-after-update: ' + (bad.isEmpty() ? 'none' : String.join(bad, ',')));
}

String sid = (String) P.get('setId');
Id masterC = (Id) P.get('masterContact');
Id masterA = (Id) P.get('masterAccount');
List<Id> others = toIds(P.get('otherContacts'));
List<Id> acctOthers = toIds(P.get('otherAccounts'));
List<Id> riderDel = toIds(P.get('riderDelete'));
Savepoint sp = Database.setSavepoint();
Boolean ok = true;
try {
    User before = login(masterC);
    if (!riderDel.isEmpty()) {
        for (Database.DeleteResult r : Database.delete(riderDel, false)) {
            if (!r.isSuccess()) { say(sid, 'newer rider delete FAILED ' + errs(r.getErrors())); ok = false; }
        }
        if (ok) { say(sid, 'newer riders deleted (' + riderDel.size() + ')'); }
    }
    if (ok && !acctOthers.isEmpty() && !doMerge(sid, new Account(Id = masterA), acctOthers, 'Account')) {
        say(sid, 'account merge refused, moving the other contacts into the master account instead');
        List<Contact> mv = new List<Contact>();
        for (Id c : others) { mv.add(new Contact(Id = c, AccountId = masterA)); }
        for (Database.SaveResult r : Database.update(mv, false)) {
            if (!r.isSuccess()) { say(sid, 'contact move FAILED ' + errs(r.getErrors())); ok = false; }
        }
        acctOthers = new List<Id>();
    }
    if (ok) { ok = doMerge(sid, new Contact(Id = masterC), others, 'Contact'); }
    if (ok) { ok = doUpdate(sid, P.get('patchContact'), Contact.class, 'Contact'); }
    if (ok) { ok = doUpdate(sid, P.get('patchAccount'), Account.class, 'Account'); }
    if (ok) { ok = doUpdate(sid, P.get('patchRider'), Riders__c.class, 'Rider'); }
    if (ok) {
        check(sid, P.get('patchContact'), Contact.class, 'Contact');
        check(sid, P.get('patchAccount'), Account.class, 'Account');
        check(sid, P.get('patchRider'), Riders__c.class, 'Rider');
        User after = login(masterC);
        say(sid, 'login: active=' + (after != null && after.IsActive)
            + ' usernameSame=' + (before != null && after != null && before.Username == after.Username)
            + ' emailSame=' + (before != null && after != null && before.Email == after.Email));
        say(sid, 'after: otherContactsLeft=' + [SELECT COUNT() FROM Contact WHERE Id IN :others]
            + ' contactsInMasterAccount=' + [SELECT COUNT() FROM Contact WHERE AccountId = :masterA]
            + ' ridersOnMaster=' + [SELECT COUNT() FROM Riders__c WHERE ClientContact__c = :masterC]
            + ' accountsLeft=' + [SELECT COUNT() FROM Account WHERE Id IN :acctOthers]);
    }
} catch (Exception e) {
    ok = false;
    say(sid, 'EXCEPTION ' + e.getTypeName() + ': ' + e.getMessage());
}
say(sid, 'limits soql=' + Limits.getQueries() + '/' + Limits.getLimitQueries() + ' dml=' + Limits.getDmlStatements()
    + '/' + Limits.getLimitDmlStatements() + ' cpu=' + Limits.getCpuTime() + '/' + Limits.getLimitCpuTime());
if (REHEARSAL || !ok) {
    Database.rollback(sp);
    say(sid, (REHEARSAL ? 'ROLLED BACK (rehearsal) ' : 'ROLLED BACK after failure ') + 'ok=' + ok);
} else {
    say(sid, 'COMMITTED ok=true');
}
