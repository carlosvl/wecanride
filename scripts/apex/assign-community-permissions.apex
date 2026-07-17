// Patch all active WCR Customer Community Plus Login users with both community permission sets.
List<String> permSetNames = new List<String>{
    'Community_Returning_Flow_Access',
    'Community_WaiverYear_Access'
};

Map<String, Id> psByName = new Map<String, Id>();
for (PermissionSet ps : [
    SELECT Id, Name
    FROM PermissionSet
    WHERE Name IN :permSetNames
]) {
    psByName.put(ps.Name, ps.Id);
}

List<User> users = [
    SELECT Id, Username
    FROM User
    WHERE Profile.Name = 'WCR Customer Community Plus Login'
        AND IsActive = true
];

Map<Id, Set<Id>> assignedByPs = new Map<Id, Set<Id>>();
for (PermissionSetAssignment psa : [
    SELECT AssigneeId, PermissionSetId
    FROM PermissionSetAssignment
    WHERE PermissionSetId IN :psByName.values()
        AND Assignee.IsActive = true
]) {
    if (!assignedByPs.containsKey(psa.PermissionSetId)) {
        assignedByPs.put(psa.PermissionSetId, new Set<Id>());
    }
    assignedByPs.get(psa.PermissionSetId).add(psa.AssigneeId);
}

List<PermissionSetAssignment> toInsert = new List<PermissionSetAssignment>();
for (String name : permSetNames) {
    Id psId = psByName.get(name);
    Set<Id> already = assignedByPs.containsKey(psId)
        ? assignedByPs.get(psId)
        : new Set<Id>();
    for (User u : users) {
        if (!already.contains(u.Id)) {
            toInsert.add(new PermissionSetAssignment(
                AssigneeId = u.Id,
                PermissionSetId = psId
            ));
        }
    }
}

if (!toInsert.isEmpty()) {
    insert toInsert;
}

System.debug(
    'Community patch: inserted=' +
    toInsert.size() +
    ', profile_users=' +
    users.size()
);
