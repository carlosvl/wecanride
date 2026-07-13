---
title: Volunteer_Info__c
type: entity
category: objects
sources:
  - force-app/main/default/objects/Volunteer_Info__c/
last_verified: 2026-07-13
status: current
tags: [object, volunteer]
---

# Volunteer_Info__c

Custom object tracking volunteer training, roles, and emergency contact information.

**Source:** `force-app/main/default/objects/Volunteer_Info__c/`

## Key field groups

| Group | Example fields |
|-------|----------------|
| Roles | `Horse_Leader__c`, `Groomer__c`, teaching assistant fields |
| Training | `New_Volunteer_Training__c`, `Barn_Aid_Training_Date__c`, `Teaching_Assistant_Training_Date__c` |
| Emergency | `Emergency_Contact_LU__c`, `Emergency_Contact_2_Number__c` |
| Identity | `Volunteer_Name__c`, `Parent_Guardian_Name__c` |
| Programs | `Employee_Giving_Program__c`, `Liability_Release_Form__c` |

## Flows that touch Volunteer_Info__c

- `volunteer_registration`, `ReturningVol`
- [[returning-emergency]] — emergency contact updates
- `volunteer_handbook`

## Related

- [[volunteer-journey]]
- [[returning-emergency]]
