
List<Account> targets = [
    SELECT Id FROM Account
    WHERE IsPartner = true AND RecordType.Name = 'Household Account'
    LIMIT 5
];
List<Account> updates = new List<Account>();
for (Account a : targets) updates.add(new Account(Id = a.Id, IsPartner = false));
Integer cleared = 0, failed = 0;
if (!updates.isEmpty()) {
    for (Database.SaveResult sr : Database.update(updates, false)) {
        if (sr.isSuccess()) cleared++; else { failed++; System.debug('ERR: ' + sr.getErrors()[0].getMessage()); }
    }
}
Integer remaining = [SELECT COUNT() FROM Account WHERE IsPartner = true AND RecordType.Name = 'Household Account'];
System.debug('Batch clear: attempted=' + targets.size() + ' cleared=' + cleared + ' failed=' + failed + ' remaining=' + remaining);
