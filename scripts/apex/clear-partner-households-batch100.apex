// Clear up to 100 partner-flagged Household Accounts per run.
List<Account> targets = [
    SELECT Id
    FROM Account
    WHERE IsPartner = true
        AND RecordType.Name = 'Household Account'
    LIMIT 100
];
Integer cleared = 0;
Integer failed = 0;
List<Account> updates = new List<Account>();
for (Account a : targets) {
    updates.add(new Account(Id = a.Id, IsPartner = false));
}
if (!updates.isEmpty()) {
    Database.SaveResult[] results = Database.update(updates, false);
    for (Database.SaveResult sr : results) {
        if (sr.isSuccess()) {
            cleared++;
        } else {
            failed++;
            System.debug('ERR: ' + sr.getId() + ' ' + sr.getErrors()[0].getMessage());
        }
    }
}
Integer remaining = [
    SELECT COUNT()
    FROM Account
    WHERE IsPartner = true
        AND RecordType.Name = 'Household Account'
];
System.debug(
    'Batch clear: attempted=' +
    targets.size() +
    ' cleared=' +
    cleared +
    ' failed=' +
    failed +
    ' remaining=' +
    remaining
);
