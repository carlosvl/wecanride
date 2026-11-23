---
title: Office Staff Platform profile
type: concept
category: permissions
sources:
  - force-app/main/default/profiles/Office Staff Platform.profile-meta.xml
  - force-app/main/default/permissionsets/WCR_Platform_User (org only, not in repo)
last_verified: 2026-11-23
status: current
tags: [profile, salesforce-platform-license, office-staff]
---

# Office Staff Platform profile

Internal staff profile on the **Salesforce Platform** license, built 2026-11-23 from the full-license `Office Staff` profile. Reason: the org's 10 **Salesforce** licenses are all used by System Administrators, so staff (Natalie Cerchio, Emma Heimlich, Jenny Miller) cannot be given `System Administrator` or `Office Staff`.

## Access

| Object | Access |
|--------|--------|
| `Account`, `Contact` | CRUD, Office Staff's curated FLS kept |
| `Riders__c` (label "Client") and children `Client_Assessment__c`, `Client_Class__c`, `Incident_Report__c`, `New_Attendance__c`, `Pre_and_Post_Test__c`, `Rider_Notes__c`, `Rider_Schedule__c`, `VolunteerWaiver__c`, `diagnoses__c` | CRUD |
| `Class__c`, `Class_Time__c` (parent of `New_Attendance__c`) | CRUD |
| `Client_Class__c` (Riders ↔ Class join) | CRUD |
| `waiver__c`, `Condition__c` (parents the children look up to) | Read |

Everything else from Office Staff is copied: apps (`Office_Layout`, `We_Can_Ride`, `We_Can_Ride_Office`, App Launcher, plus `We_Can_Ride_Platform` as default), Apex class and Visualforce page access, tabs, layout assignments, record types and the remaining object permissions. `VolunteerWaiver__c` record types follow `Admin` because Office Staff hid them all.

## Dropped because the Platform license cannot hold them

- Objects: Lead, Opportunity, Campaign, Case, Contract, Order, Asset, Solution, Product2, Pricebook2 (and their tabs, layouts, FLS).
- User permissions: `ScheduleJob`, `ScheduleReports`, `DataExport` (rejected by the deploy) and `ConvertLeads`, `TransferAnyLead`, `TransferAnyCase`, `ManageCallCenters`, `ManageCategories`, `EditBillingInfo`, `ManageCssUsers`, `SendSitRequests`, `DistributeFromPersWksp`, `SubmitMacrosAllowed`, `AllowViewKnowledge`, `ListEmailSend`, `EditHtmlTemplates` (removed up front as Lead/Case/Knowledge/portal related).

## Notes

- Assigned 2026-11-23 (by hand): Natalie Cerchio, Emma Heimlich, Jenny Miller. Emma and Jenny keep `WCR_Platform_User`; Natalie does not have it yet.
- Field-level security: the objects Office Staff already had (Account, Contact, Riders, Incident, Rider Notes, Rider Schedule, Assessment, Pre/Post Test) keep its curated FLS, with missing fields added. The six objects it never had (Client Class, Attendance, Waiver, Diagnosis, Class, Class Time) were granted every field except formula/rollup/auto-number (read-only) and required fields (implicit).
- `RunFlow` is **not** in the profile; it comes from the `WCR_Platform_User` permission set, which also grants CRUV (no Delete) on the same objects, their tabs and the `We_Can_Ride_Platform` app. Keep that set assigned.
- Delete is granted on the Rider family because Office Staff already had it on `Riders__c` (cascades to `Client_Class__c`, `New_Attendance__c`, `Pre_and_Post_Test__c`).

Related: [[entities/objects/riders]], [[entities/objects/contact]], [[concepts/community-access]], [[concepts/flow-permissions]].
