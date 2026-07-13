---
title: Flow Permissions
type: concept
category: permissions
sources:
  - force-app/main/default/flows/Returning_Emergency.flow-meta.xml
  - force-app/main/default/permissionsets/Flow_User_Access.permissionset-meta.xml
  - force-app/main/default/permissionsets/Community_Returning_Flow_Access.permissionset-meta.xml
last_verified: 2026-07-13
status: current
tags: [flows, permissions, runflow]
---

# Flow Permissions

Screen flows in Experience Cloud require layered permissions.

## Permission layers

| Layer | What it controls | How to grant |
|-------|------------------|--------------|
| Profile / PS `PermissionsRunFlow` | Can user run any flow? | `Flow_User_Access` permission set |
| `isAdditionalPermissionRequiredToRun` | Flow needs explicit grant? | `SetupEntityAccess` on permission set |
| Object CRUD | Can flow read/write records? | Object permissions on profile/PS |
| Field Level Security | Can flow access specific fields? | Field permissions on profile/PS |
| `runInMode` | Sharing rules applied? | Set in flow metadata |

## Flow_User_Access

Base permission set granting `PermissionsRunFlow = true`. Required for all community flow execution. See [[flow-user-access]].

## Additional permission flag

When a flow sets `isAdditionalPermissionRequiredToRun = true`, users need an explicit flow access grant via `SetupEntityAccess` (or the flow listed in a permission set's flow access).

`Returning_Emergency` requires `Community_Returning_Flow_Access` (or profile flow access) in addition to `Flow_User_Access`. See [[returning-emergency]] for the worked example.

## System mode flows

Some flows use `runInMode: SystemModeWithoutSharing` to bypass sharing rules. This is used when community users need to update records they don't own (e.g., household contacts). Document the security implications on each entity page.

## Troubleshooting checklist

1. Does user have `Flow_User_Access` assigned?
2. Does flow require additional permission? Check flow XML for `isAdditionalPermissionRequiredToRun`.
3. Does user have CRUD on objects the flow touches? (`Riders__c`, `Contact`, `Volunteer_Info__c`)
4. Does user have FLS on fields referenced in flow screens and record elements?
5. For USF components: is `USF_Flow_Screen_Component_Datatable` assigned?

## Related

- [[community-access]] — community profile and permission set overview
- [[returning-emergency]] — worked example of permission debugging
