// Clone object/FLS/SetupEntityAccess from WCR Community Login (Partner)
// onto WCR Customer Community Plus Login. Skips TabSet app visibility.
Id partnerPsId = [
    SELECT Id
    FROM PermissionSet
    WHERE IsOwnedByProfile = true
        AND Profile.Name = 'WCR Community Login'
    LIMIT 1
]
.Id;
Id ccpPsId = [
    SELECT Id
    FROM PermissionSet
    WHERE IsOwnedByProfile = true
        AND Profile.Name = 'WCR Customer Community Plus Login'
    LIMIT 1
]
.Id;

Integer objInserted = 0;
Integer objUpgraded = 0;
Integer flsInserted = 0;
Integer flsUpgraded = 0;
Integer seaInserted = 0;
Integer seaSkipped = 0;
List<String> errors = new List<String>();

// --- ObjectPermissions ---
Map<String, ObjectPermissions> ccpObjByType = new Map<String, ObjectPermissions>();
for (ObjectPermissions op : [
    SELECT Id, SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit,
        PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords
    FROM ObjectPermissions
    WHERE ParentId = :ccpPsId
]) {
    ccpObjByType.put(op.SobjectType, op);
}

List<ObjectPermissions> objInserts = new List<ObjectPermissions>();
List<ObjectPermissions> objUpdates = new List<ObjectPermissions>();
for (ObjectPermissions src : [
    SELECT SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit,
        PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords
    FROM ObjectPermissions
    WHERE ParentId = :partnerPsId
]) {
    ObjectPermissions tgt = ccpObjByType.get(src.SobjectType);
    if (tgt == null) {
        objInserts.add(
            new ObjectPermissions(
                ParentId = ccpPsId,
                SobjectType = src.SobjectType,
                PermissionsRead = src.PermissionsRead,
                PermissionsCreate = src.PermissionsCreate,
                PermissionsEdit = src.PermissionsEdit,
                PermissionsDelete = src.PermissionsDelete,
                PermissionsViewAllRecords = src.PermissionsViewAllRecords,
                PermissionsModifyAllRecords = src.PermissionsModifyAllRecords
            )
        );
    } else {
        Boolean changed = false;
        if (src.PermissionsRead && !tgt.PermissionsRead) {
            tgt.PermissionsRead = true;
            changed = true;
        }
        if (src.PermissionsCreate && !tgt.PermissionsCreate) {
            tgt.PermissionsCreate = true;
            changed = true;
        }
        if (src.PermissionsEdit && !tgt.PermissionsEdit) {
            tgt.PermissionsEdit = true;
            changed = true;
        }
        if (src.PermissionsDelete && !tgt.PermissionsDelete) {
            tgt.PermissionsDelete = true;
            changed = true;
        }
        if (src.PermissionsViewAllRecords && !tgt.PermissionsViewAllRecords) {
            tgt.PermissionsViewAllRecords = true;
            changed = true;
        }
        if (src.PermissionsModifyAllRecords && !tgt.PermissionsModifyAllRecords) {
            tgt.PermissionsModifyAllRecords = true;
            changed = true;
        }
        if (changed) {
            objUpdates.add(tgt);
        }
    }
}

if (!objInserts.isEmpty()) {
    Database.SaveResult[] results = Database.insert(objInserts, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (results[i].isSuccess()) {
            objInserted++;
        } else {
            errors.add(
                'Object insert ' +
                objInserts[i].SobjectType +
                ': ' +
                results[i].getErrors()[0].getMessage()
            );
        }
    }
}
if (!objUpdates.isEmpty()) {
    Database.SaveResult[] results = Database.update(objUpdates, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (results[i].isSuccess()) {
            objUpgraded++;
        } else {
            errors.add(
                'Object update ' +
                objUpdates[i].SobjectType +
                ': ' +
                results[i].getErrors()[0].getMessage()
            );
        }
    }
}

// --- FieldPermissions ---
Map<String, FieldPermissions> ccpFlsByField = new Map<String, FieldPermissions>();
for (FieldPermissions fp : [
    SELECT Id, Field, PermissionsRead, PermissionsEdit
    FROM FieldPermissions
    WHERE ParentId = :ccpPsId
]) {
    ccpFlsByField.put(fp.Field, fp);
}

List<FieldPermissions> flsInserts = new List<FieldPermissions>();
List<FieldPermissions> flsUpdates = new List<FieldPermissions>();
for (FieldPermissions src : [
    SELECT Field, SobjectType, PermissionsRead, PermissionsEdit
    FROM FieldPermissions
    WHERE ParentId = :partnerPsId
]) {
    FieldPermissions tgt = ccpFlsByField.get(src.Field);
    if (tgt == null) {
        flsInserts.add(
            new FieldPermissions(
                ParentId = ccpPsId,
                SobjectType = src.SobjectType,
                Field = src.Field,
                PermissionsRead = src.PermissionsRead,
                PermissionsEdit = src.PermissionsEdit
            )
        );
    } else {
        Boolean changed = false;
        if (src.PermissionsRead && !tgt.PermissionsRead) {
            tgt.PermissionsRead = true;
            changed = true;
        }
        if (src.PermissionsEdit && !tgt.PermissionsEdit) {
            tgt.PermissionsEdit = true;
            changed = true;
        }
        if (changed) {
            flsUpdates.add(tgt);
        }
    }
}

// Batch FLS inserts (governor-friendly)
Integer flsBatchSize = 100;
for (Integer start = 0; start < flsInserts.size(); start += flsBatchSize) {
    Integer stop = Math.min(start + flsBatchSize, flsInserts.size());
    List<FieldPermissions> batch = new List<FieldPermissions>();
    for (Integer i = start; i < stop; i++) {
        batch.add(flsInserts[i]);
    }
    Database.SaveResult[] results = Database.insert(batch, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (results[i].isSuccess()) {
            flsInserted++;
        } else {
            String msg = results[i].getErrors()[0].getMessage();
            if (!msg.contains('duplicate') && !msg.contains('already')) {
                errors.add('FLS insert ' + batch[i].Field + ': ' + msg);
            }
        }
    }
}
if (!flsUpdates.isEmpty()) {
    Database.SaveResult[] results = Database.update(flsUpdates, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (results[i].isSuccess()) {
            flsUpgraded++;
        } else {
            errors.add(
                'FLS update ' +
                flsUpdates[i].Field +
                ': ' +
                results[i].getErrors()[0].getMessage()
            );
        }
    }
}

// --- SetupEntityAccess (ApexClass, ApexPage, CustomEntityDefinition) ---
Set<String> allowedTypes = new Set<String>{
    'ApexClass',
    'ApexPage',
    'CustomEntityDefinition'
};
Set<String> ccpSeaKeys = new Set<String>();
for (SetupEntityAccess sea : [
    SELECT SetupEntityId, SetupEntityType
    FROM SetupEntityAccess
    WHERE ParentId = :ccpPsId
]) {
    ccpSeaKeys.add(String.valueOf(sea.SetupEntityType) + ':' + String.valueOf(sea.SetupEntityId));
}

List<SetupEntityAccess> seaInserts = new List<SetupEntityAccess>();
for (SetupEntityAccess src : [
    SELECT SetupEntityId, SetupEntityType
    FROM SetupEntityAccess
    WHERE ParentId = :partnerPsId
]) {
    String typ = String.valueOf(src.SetupEntityType);
    if (!allowedTypes.contains(typ)) {
        seaSkipped++;
        continue;
    }
    String key = typ + ':' + String.valueOf(src.SetupEntityId);
    if (!ccpSeaKeys.contains(key)) {
        seaInserts.add(
            new SetupEntityAccess(
                ParentId = ccpPsId,
                SetupEntityId = src.SetupEntityId
            )
        );
    }
}

for (Integer start = 0; start < seaInserts.size(); start += flsBatchSize) {
    Integer stop = Math.min(start + flsBatchSize, seaInserts.size());
    List<SetupEntityAccess> batch = new List<SetupEntityAccess>();
    for (Integer i = start; i < stop; i++) {
        batch.add(seaInserts[i]);
    }
    Database.SaveResult[] results = Database.insert(batch, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (results[i].isSuccess()) {
            seaInserted++;
        } else {
            String msg = results[i].getErrors()[0].getMessage();
            if (!msg.contains('duplicate') && !msg.contains('already')) {
                errors.add('SEA insert: ' + msg);
            }
        }
    }
}

System.debug(
    'Partner→CCP sync: objInserted=' +
    objInserted +
    ' objUpgraded=' +
    objUpgraded +
    ' flsInserted=' +
    flsInserted +
    ' flsUpgraded=' +
    flsUpgraded +
    ' seaInserted=' +
    seaInserted +
    ' seaSkipped=' +
    seaSkipped +
    ' errors=' +
    errors.size()
);
for (String e : errors) {
    System.debug('ERR: ' + e);
}
