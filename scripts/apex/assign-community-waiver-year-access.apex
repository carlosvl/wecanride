// Assign Community_WaiverYear_Access to all active WCR Customer Community Plus Login users missing it.
PermissionSet ps = [
    SELECT Id
    FROM PermissionSet
    WHERE Name = 'Community_WaiverYear_Access'
    LIMIT 1
];

List<User> users = [
    SELECT Id, Username
    FROM User
    WHERE Profile.Name = 'WCR Customer Community Plus Login'
        AND IsActive = true
];

Set<Id> alreadyAssigned = new Set<Id>();
for (PermissionSetAssignment psa : [
    SELECT AssigneeId
    FROM PermissionSetAssignment
    WHERE PermissionSetId = :ps.Id
        AND Assignee.IsActive = true
]) {
    alreadyAssigned.add(psa.AssigneeId);
}

List<PermissionSetAssignment> toInsert = new List<PermissionSetAssignment>();
for (User u : users) {
    if (!alreadyAssigned.contains(u.Id)) {
        toInsert.add(new PermissionSetAssignment(
            AssigneeId = u.Id,
            PermissionSetId = ps.Id
        ));
    }
}

if (!toInsert.isEmpty()) {
    insert toInsert;
}

System.debug(
    'Community_WaiverYear_Access: assigned=' +
    toInsert.size() +
    ', already_had=' +
    alreadyAssigned.size() +
    ', profile_users=' +
    users.size()
);
