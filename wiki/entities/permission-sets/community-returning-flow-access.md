---
title: Community Returning Flow Access
type: entity
category: permission-sets
sources:
  - force-app/main/default/permissionsets/Community_Returning_Flow_Access.permissionset-meta.xml
last_verified: 2026-07-13
status: current
tags: [permission-set, returning, flows]
---

# Community_Returning_Flow_Access

Permission set granting community users access to returning client paperwork screen flows.

**Source:** `force-app/main/default/permissionsets/Community_Returning_Flow_Access.permissionset-meta.xml`

## Grants

| Permission | Value |
|------------|-------|
| `RunFlow` (user permission) | enabled |

## Explicit flow access

| Flow |
|------|
| `New_Client_Menu` |
| `Returning_Authorization_Emergency_Medical_Treatment` |
| `Returning_Client_Client_Medical_History` |
| `Returning_Client_Waiver` |
| `Returning_Confidentiality_HIPPA` |
| `Returning_Down_Syndrome` |
| `Returning_Emergency` |
| `Returning_File_Upload_Scoliosis` |
| `Returning_GroupHome` |
| `Returning_Parent_Guardian` |
| `Returning_Payment` |
| `Returning_Photo_Release` |
| `Returning_Schedule_Selection` |
| `Returning_Seizure_Form` |
| `Returning_Therapy_Cancellation_Policy` |

## Gaps

Flows in the `Returning_*` family **not** listed here may still need access grants added (e.g., `Returning_Main_Info`, `Returning_Schedule`, `Returning_Height_Weight`). Lint or audit when adding new returning subflows.

## Related

- [[flow-permissions]]
- [[returning-client-paperwork]]
- [[returning-emergency]]
