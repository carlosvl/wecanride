Account a = [
    SELECT Id, Name, IsPartner
    FROM Account
    WHERE Id = '001UR00000swITmYAM'
];
System.debug('Before: ' + a.Name + ' IsPartner=' + a.IsPartner);
a.IsPartner = false;
update a;
a = [
    SELECT Id, Name, IsPartner
    FROM Account
    WHERE Id = '001UR00000swITmYAM'
];
System.debug('After: ' + a.Name + ' IsPartner=' + a.IsPartner);
