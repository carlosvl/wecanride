---
title: Community Access
type: concept
category: permissions
sources:
  - force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml
  - force-app/main/default/permissionsets/
last_verified: 2026-07-13
status: current
tags: [community, permissions, experience-cloud]
---

# Community Access

How Experience Cloud users authenticate and access screen flows.

## Profile (all current + future users)

**WCR Customer Community Plus Login** carries `RunFlow` and explicit access to all returning registration flows directly on the profile. Any user assigned this profile — existing or new — receives the patch automatically.

Metadata: `force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml`

## Permission sets

| Permission set | Purpose | Scope |
|----------------|---------|-------|
| `Community_Returning_Flow_Access` | Same returning-flow grants as profile (belt-and-suspenders) | Assigned to all active community users |
| `Flow_User_Access` | Base `PermissionsRunFlow` for internal users | Not used for community profile |
| `Community_WaiverYear_Access` | Access to `WaiverYear__mdt` custom metadata | Per-user assignment |
| `USF_Flow_Screen_Component_Datatable` | USF datatable flow screen component | Per-user assignment |

See [[community-returning-flow-access]] for the full flow list.

## Bulk assign existing users

If profile deploy is not enough, run:

```bash
sf apex run --target-org WCRProd --file scripts/apex/assign-community-returning-flow-access.apex
```

This assigns `Community_Returning_Flow_Access` to any active `WCR Customer Community Plus Login` user missing it.

## Community site

- URL: `https://wecanride.my.site.com/client/s/login`
- Username pattern: `{email}.wecanride` (see `NewCommunityUser` flow formulas)

## Verification

Check permission set assignment for a community user:

```bash
sf data query --target-org WCRProd \
  --query "SELECT PermissionSet.Name FROM PermissionSetAssignment WHERE Assignee.Username = '<username>'"
```

See [[flow-permissions]] for the full troubleshooting checklist.

## Common issues

1. **Flow not visible** — missing `Flow_User_Access` or specific flow grant on permission set
2. **Field access denied** — profile/permission set missing FLS on flow-used fields
3. **`isAdditionalPermissionRequiredToRun`** — flow requires explicit `SetupEntityAccess` grant
4. **Missing `Riders__c` record** — contact exists but has no Client record; `Returning_Emergency` auto-creates one (deployed 2026-07-13)

## Related

- [[flow-permissions]] — flow-level permission details
- [[returning-emergency]] — example flow with complex permission requirements
