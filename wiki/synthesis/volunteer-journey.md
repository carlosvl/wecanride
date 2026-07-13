---
title: Volunteer Journey
type: synthesis
category: journeys
sources:
  - force-app/main/default/flows/volunteer_registration.flow-meta.xml
  - force-app/main/default/flows/volunteer_handbook.flow-meta.xml
  - force-app/main/default/flows/Volunteering_Schedule_Selection.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [volunteer, journey, scheduling]
---

# Volunteer Journey

Path for volunteers registering and selecting schedules through Experience Cloud.

## Flow sequence

```mermaid
flowchart LR
    A[volunteer_registration] --> B[volunteer_handbook]
    B --> C[Volunteering_Schedule_Selection]
    C --> D[Volunteer_Confirmation_email]
```

## Returning volunteers

Separate menu flows route returning volunteers:

| Flow | Audience |
|------|----------|
| `Return_Volunteer_ONLY_Menu` | Non-riding volunteers |
| `Return_Volunteer_Riding_Menu` | Riding volunteers |
| `ReturningVol` | General returning volunteer paperwork |
| `Returning_Volunteer_Schedule` | Schedule re-selection |
| `Returning_Volunteer_Liability_Waiver` | Liability waiver renewal |

## Key objects

| Object | Role |
|--------|------|
| [[volunteer-info]] | Training dates, roles (horse leader, sidewalker, groomer), emergency contacts |
| `VolunteerWaiver__c` | Waiver and medical form tracking |
| `Volunteer_Schedule__c` | Schedule assignments |
| `Volunteer_Attendance__c` | Class attendance records |
| `Volunteer_Class__c` | Class definitions |

## Internal vs. external

- External confirmation: `Volunteer_Class_Confirmation_External` flexipage
- Internal application: `Application_Volunteer_Return_Internal` flexipage

## Related

- [[community-access]] — volunteer community permissions
- [[returning-client-paperwork]] — parallel returning paperwork pattern
