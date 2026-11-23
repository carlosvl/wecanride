// Collapse two Riders under one login Contact into the one that holds the children and the completed forms.
// Generated and run by scripts/dup-merge/collapse_riders.py, which fills the two placeholders:
// REHEARSAL (true = do everything, then roll it all back) and the PAYLOAD json (keeper, older, field patch, waivers to move/delete).
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
String flags(Id c) {
    Contact k = [SELECT Client__c, Volunteer__c, Prospect__c, Status__c FROM Contact WHERE Id = :c];
    return 'client=' + k.Client__c + ' volunteer=' + k.Volunteer__c + ' prospect=' + k.Prospect__c + ' status=' + k.Status__c;
}

String sid = (String) P.get('setId');
Id contactId = (Id) P.get('contactId');
Id keeper = (Id) P.get('keeperRider');
Id older = (Id) P.get('olderRider');
List<Id> move = toIds(P.get('moveWaivers'));
List<Id> drop = toIds(P.get('deleteWaivers'));
Savepoint sp = Database.setSavepoint();
Boolean ok = true;
try {
    // Guards, checked live: both Riders belong to the login Contact, the older one has nothing but the planned waivers.
    List<Id> both = new List<Id>{ keeper, older };
    Integer mine = [SELECT COUNT() FROM Riders__c WHERE ClientContact__c = :contactId AND Id IN :both];
    Set<Id> planned = new Set<Id>(move); planned.addAll(drop);
    Map<Id, VolunteerWaiver__c> live = new Map<Id, VolunteerWaiver__c>([SELECT Id FROM VolunteerWaiver__c WHERE Client__c = :older]);
    Integer other = [SELECT COUNT() FROM Client_Class__c WHERE Riders__c = :older]
        + [SELECT COUNT() FROM diagnoses__c WHERE Client__c = :older]
        + [SELECT COUNT() FROM Client_Assessment__c WHERE Client_Last_Nam__c = :older]
        + [SELECT COUNT() FROM Pre_and_Post_Test__c WHERE Rider__c = :older]
        + [SELECT COUNT() FROM ContentDocumentLink WHERE LinkedEntityId = :older]
        + [SELECT COUNT() FROM FeedItem WHERE ParentId = :older];
    if (mine != 2 || !live.keySet().equals(planned) || other != 0) {
        say(sid, 'GUARD FAILED riders=' + mine + ' waiversMatchPlan=' + live.keySet().equals(planned) + ' otherChildren=' + other);
        ok = false;
    }
    String before = flags(contactId);
    if (ok && P.get('patchRider') != null) {
        Riders__c rec = (Riders__c) JSON.deserialize(JSON.serialize(P.get('patchRider')), Riders__c.class);
        Database.SaveResult r = Database.update(rec, false);
        if (!r.isSuccess()) { say(sid, 'rider patch FAILED ' + errs(r.getErrors())); ok = false; }
    }
    if (ok && !move.isEmpty()) {
        List<VolunteerWaiver__c> ws = new List<VolunteerWaiver__c>();
        for (Id w : move) { ws.add(new VolunteerWaiver__c(Id = w, Client__c = keeper)); }
        for (Database.SaveResult r : Database.update(ws, false)) {
            if (!r.isSuccess()) { say(sid, 'waiver move FAILED ' + errs(r.getErrors())); ok = false; }
        }
    }
    if (ok && !drop.isEmpty()) {
        for (Database.DeleteResult r : Database.delete(drop, false)) {
            if (!r.isSuccess()) { say(sid, 'waiver delete FAILED ' + errs(r.getErrors())); ok = false; }
        }
    }
    if (ok) {
        Database.DeleteResult r = Database.delete(older, false);
        if (!r.isSuccess()) { say(sid, 'older rider delete FAILED ' + errs(r.getErrors())); ok = false; }
    }
    if (ok) {
        String after = flags(contactId);
        say(sid, 'contact flags before: ' + before);
        say(sid, 'contact flags after:  ' + after + ' same=' + (before == after));
        say(sid, 'after: ridersOnContact=' + [SELECT COUNT() FROM Riders__c WHERE ClientContact__c = :contactId]
            + ' waiversOnKeeper=' + [SELECT COUNT() FROM VolunteerWaiver__c WHERE Client__c = :keeper]
            + ' olderRiderLeft=' + [SELECT COUNT() FROM Riders__c WHERE Id = :older]
            + ' orphanWaivers=' + [SELECT COUNT() FROM VolunteerWaiver__c WHERE Id IN :planned AND Client__c = null]);
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
