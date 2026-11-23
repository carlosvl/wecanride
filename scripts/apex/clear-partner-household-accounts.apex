// Clear IsPartner on all Household Accounts (and Lawson Household explicitly).
// Portal Contact creates fail with "portal users cannot own partner accounts"
// when the household Account has IsPartner = true.
List<Account> targets = [
    SELECT Id, Name, IsPartner
    FROM Account
    WHERE IsPartner = true
        AND (
            Id = '001UR00000swITmYAM'
            OR RecordType.Name = 'Household Account'
        )
];
Integer cleared = 0;
Integer failed = 0;
List<String> errors = new List<String>();
Integer batchSize = 100;
for (Integer i = 0; i < targets.size(); i += batchSize) {
    Integer stop = Math.min(i + batchSize, targets.size());
    List<Account> batch = new List<Account>();
    for (Integer j = i; j < stop; j++) {
        batch.add(new Account(Id = targets[j].Id, IsPartner = false));
    }
    Database.SaveResult[] results = Database.update(batch, false);
    for (Integer k = 0; k < results.size(); k++) {
        if (results[k].isSuccess()) {
            cleared++;
        } else {
            failed++;
            errors.add(batch[k].Id + ': ' + results[k].getErrors()[0].getMessage());
        }
    }
}
System.debug(
    'Partner household clear: total=' +
    targets.size() +
    ' cleared=' +
    cleared +
    ' failed=' +
    failed
);
for (String e : errors) {
    System.debug('ERR: ' + e);
}
Account lawson = [
    SELECT Id, Name, IsPartner
    FROM Account
    WHERE Id = '001UR00000swITmYAM'
];
System.debug('Lawson after: IsPartner=' + lawson.IsPartner);
Integer remaining = [
    SELECT COUNT()
    FROM Account
    WHERE IsPartner = true
        AND RecordType.Name = 'Household Account'
];
System.debug('Remaining partner households: ' + remaining);
