---
title: Community WaiverYear Access
type: entity
category: permission-sets
sources:
  - force-app/main/default/permissionsets/Community_WaiverYear_Access.permissionset-meta.xml
  - force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml
  - force-app/main/default/permissionsets/Community_Returning_Flow_Access.permissionset-meta.xml
last_verified: 2026-07-13
status: current
tags: [permission-set, custom-metadata, waiver-year]
---

# Community_WaiverYear_Access

Grants community users access to `WaiverYear__mdt` custom metadata, required by menu flows that set `VolunteerWaiver__c.Year__c`.

**Source:** `force-app/main/default/permissionsets/Community_WaiverYear_Access.permissionset-meta.xml`

## Grants

| Access | Detail |
|--------|--------|
| Custom metadata type | `WaiverYear__mdt` (enabled) |

Field-level permissions cannot be deployed on required custom metadata fields (`Current_Year__c` is required). Type access grants read on all fields.

## Why this exists

Multiple flows query `WaiverYear__mdt` via `GetCurrentYear` and assign `Current_Year__c` to waiver records:

- `New_Client_Menu` → `CreateWaiver.Year__c`
- `Return_Client_Menu`, `Client_Waiver`, `volunteer_registration`, and all `Returning_*` waiver flows

**Error without this:** `The flow failed to access the value for GetCurrentYear.Current_Year__c because the field is not available to the running user.`

`GetCurrentYear` can succeed while `Current_Year__c` still fails to resolve if the running user lacks custom metadata **type** access.

## Fix deployed 2026-07-13

Added `WaiverYear__mdt` type access to:

1. `WCR Customer Community Plus Login` profile (all community users)
2. [[community-returning-flow-access]] (belt-and-suspenders for assigned users)

## Related

- [[flow-permissions]]
- [[community-access]]
