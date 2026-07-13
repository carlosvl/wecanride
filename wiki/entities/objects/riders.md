---
title: Riders__c
type: entity
category: objects
sources:
  - force-app/main/default/objects/Riders__c/
last_verified: 2026-07-13
status: current
tags: [object, client, rider]
---

# Riders__c

Custom object representing a therapeutic riding client (rider).

**Source:** `force-app/main/default/objects/Riders__c/`

## Role

Central record for client data — medical history, riding assessments, session assignments, emergency contacts, and form completion tracking.

## Key field groups

| Group | Example fields |
|-------|----------------|
| Demographics | `Age__c`, riding level list views |
| Medical | `Allergies_to_medications__c`, `Additional_Diagnosis_*__c`, `Precautions_Limitations__c` |
| Emergency contacts | `Emergency_Contact__c`, `Emergency_Contact_Second__c`, `ClientContact__c` |
| Riding | `Riding_Goals__c`, `Recommended_type_of_horse__c`, `Tack__c`, `Sidewalkers__c` |
| Sessions | `Session_I_Horse__c` through `Session_IV_Horse__c` |
| Forms | `CompletedForms__c`, `HIPPA_Form_PL__c` |
| Payment | `Private_Pay__c`, `Third_Party_Payor_Name__c` |
| Screening | `Screening_Done_By__c`, strength/mobility assessment fields |

## Related objects

- `Contact` — person record (via `ClientContact__c`)
- `Rider_Schedule__c` — class schedule assignments
- `Rider_Notes__c` — instructor session notes
- `Pre_and_Post_Test__c` — skill level assessments (L1–L6)
- `Diagnosis__c` — diagnosis records

## Flows that write to Riders__c

- [[client-registration]]
- [[returning-emergency]]
- All `Returning_*` subflows (various fields)
- `Returning_Main_Info`, `Returning_Height_Weight`, `Returning_Parent_Guardian`

## Related

- [[client-journey]] — how riders are created
- [[returning-client-paperwork]] — annual updates
