---
title: Returning_Emergency Flow
type: entity
category: flows
sources:
  - force-app/main/default/flows/Returning_Emergency.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [flow, returning, emergency-contact]
---

# Returning_Emergency

Screen flow for collecting and updating emergency contact information for returning clients and volunteers.

**Source:** `force-app/main/default/flows/Returning_Emergency.flow-meta.xml`

## Metadata

| Property | Value |
|----------|-------|
| API name | `Returning_Emergency` |
| Type | Screen Flow (`processType: Flow`) |
| Status | Active |
| API version | 60.0 |
| `isAdditionalPermissionRequiredToRun` | **true** |
| `runInMode` | **SystemModeWithoutSharing** |

## Purpose

Allows returning clients/volunteers to:

1. Select or create emergency contacts (mother, father, guardian choices)
2. Update emergency contact fields on `Riders__c` or `Volunteer_Info__c`
3. Link existing household contacts or create new `Contact` records

## Key decisions

| Decision | Branches |
|----------|----------|
| `Add_Contact` | New contact vs. select existing |
| `Has_Client_Record` | Create `Riders__c` if missing vs. continue |
| `Finish_Flow` | Loop back only when `varFinish` is explicitly `false` (default → `Existing_Contact_0`) |
| `Same_Contact` | Deduplication check |

## Objects touched

| Object | Fields | Operation |
|--------|--------|-----------|
| [[riders]] | `Emergency_Contact__c`, `ClientContact__c` | Read/Create/Update |
| [[volunteer-info]] | `Emergency_Contact_LU__c`, `Volunteer_Name__c` | Read/Update |
| [[contact]] | `Email`, `MobilePhone`, `AccountId`, `Volunteer__c` | Read/Create/Update |

## Permissions

Requires:

1. [[flow-user-access]] — base `RunFlow` permission
2. [[community-returning-flow-access]] — explicit `Returning_Emergency` flow grant
3. Object/field permissions on `Riders__c`, `Volunteer_Info__c`, `Contact`

`SystemModeWithoutSharing` bypasses sharing rules so community users can update household contacts they don't directly own.

## Verification

Confirm a contact has a client record and emergency contact saved:

```bash
sf data query --target-org WCRProd \
  --query "SELECT Id, ClientContact__c, Emergency_Contact__c, Emergency_Contact__r.Name FROM Riders__c WHERE ClientContact__c = '<contactId>'"
```

Confirm community profile has Run Flow enabled:

```bash
sf data query --target-org WCRProd \
  --query "SELECT PermissionsRunFlow FROM PermissionSet WHERE Name LIKE 'X00e%'"
```

See [[flow-permissions]] for the full troubleshooting checklist.

## Known routing

- `Has_Client_Record` → `Create_Client_Record` when no `Riders__c` exists for `VarContactID`
- `GetActiveClientRecord` reloads the client record before display and updates
- `Finish_Flow` default connector → `Existing_Contact_0`
- Client updates → `Refresh_Client_Record` → `GetEmergencyContact_0`

## Related

- [[returning-client-paperwork]] — parent journey
- [[flow-permissions]] — permission troubleshooting
- [[community-access]] — community profile setup
