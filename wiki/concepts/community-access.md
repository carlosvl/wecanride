---
title: Community Access
type: concept
category: permissions
sources:
  - force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml
  - force-app/main/default/permissionsets/
last_verified: 2026-07-16
status: current
tags: [community, permissions, experience-cloud]
---

# Community Access

How Experience Cloud users authenticate and access screen flows.

## Profiles

| Profile | License | Role |
|---------|---------|------|
| **WCR Customer Community Plus Login** | Customer Community Plus Login | Current / new community users (~46) |
| **WCR Community Login** | Partner Community Login | Legacy community users (~500); access template for CCP |

**WCR Customer Community Plus Login** carries `RunFlow`, returning registration flows, and object/FLS/Apex access cloned from the Partner profile (2026-07-16). License types stay different — CCP cannot receive Partner-only grants (`Lead`, `ActionPlanTemplate`, `SendExternalEmailAvailable`, TabSet apps).

Metadata: `force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml`

### Sync Partner → CCP

Re-run when Partner profile gains new access that CCP users need:

```bash
sf apex run --target-org WCRProd --file scripts/apex/sync-community-plus-from-partner-profile.apex
```

Clones ObjectPermissions, FieldPermissions, and SetupEntityAccess (`ApexClass`, `ApexPage`, `CustomEntityDefinition`). Skips TabSet. Then redeploy profile userPermissions / CMDT from local metadata if needed.

## Permission sets

| Permission set | Purpose | Scope |
|----------------|---------|-------|
| `Community_Returning_Flow_Access` | Same returning-flow grants as profile (belt-and-suspenders) | Assigned to all active community users |
| `Flow_User_Access` | Base `PermissionsRunFlow` for internal users | Not used for community profile |
| `Community_WaiverYear_Access` | Access to `WaiverYear__mdt` custom metadata | [[community-waiver-year-access]] — also on profile + returning PS |
| `USF_Flow_Screen_Component_Datatable` | USF datatable flow screen component | Per-user assignment |

See [[community-returning-flow-access]] for the full flow list.

## Bulk assign existing users

Run this to ensure every active community user has both permission sets:

```bash
sf apex run --target-org WCRProd --file scripts/apex/assign-community-permissions.apex
```

Or individually:

```bash
sf apex run --target-org WCRProd --file scripts/apex/assign-community-returning-flow-access.apex
sf apex run --target-org WCRProd --file scripts/apex/assign-community-waiver-year-access.apex
```

Last bulk assign (2026-07-16): all 46 active CCP users have both permission sets. Partner→CCP access sync same day (FLS parity; SEA 353/360 excluding TabSet).

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
4. **`GetCurrentYear.Current_Year__c` not available** — community user missing `WaiverYear__mdt` custom metadata type access on profile or permission set (fixed 2026-07-13)
5. **Missing `Riders__c` record** — contact exists but has no Client record; `Returning_Emergency` auto-creates one (deployed 2026-07-13)
6. **`portal users cannot own partner accounts`** — community user creating a Contact (e.g. `Returning_Parent_Guardian` → `CreateFirstGuardian`) fails when the household Account has `IsPartner = true`. Households must not be Partner Accounts. Cleared for Klinker Household 2026-07-16; ~724 other Household Accounts still flagged Partner.
7. **`sObject type 'diagnoses__c' is not supported`** — `Returning_Diagnosis` / `New_Client_Diagnosis` need CRUD on `diagnoses__c` (+ read on `Condition__c`). Old `WCR Community Login` profile had these; `WCR Customer Community Plus Login` did not until 2026-07-16 (also on `Community_Returning_Flow_Access`).
8. **`sObject type 'Client_Class__c' is not supported`** — `Returning_Schedule_Selection` needs Read/Create/Edit on `Client_Class__c` and Read on `Class__c`. Same gap on Customer Community Plus Login (fixed 2026-07-16). Also re-ran `assign-community-permissions.apex` for users missing the PS (Lyn Fredrickson, Allyson Bone, Mabel Klinker).

## Related

- [[flow-permissions]] — flow-level permission details
- [[returning-emergency]] — example flow with complex permission requirements
