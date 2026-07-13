---
title: Client Journey
type: synthesis
category: journeys
sources:
  - force-app/main/default/flows/Client_Registration.flow-meta.xml
  - force-app/main/default/flows/New_Client_Menu.flow-meta.xml
  - force-app/main/default/flows/Complete_Client_Application.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [client, registration, journey]
---

# Client Journey — New Registration

End-to-end path for a new therapeutic riding client registering through Experience Cloud.

## Flow sequence

```mermaid
flowchart LR
    A[NewCommunityUser] --> B[Client_Registration]
    B --> C[New_Client_Menu]
    C --> D[Subflows]
    D --> E[Complete_Client_Application]
```

## Key flows

| Step | Flow | Purpose |
|------|------|---------|
| Account creation | [[entities/flows/new-community-user]] | Creates community login (.wecanride username suffix) |
| Main registration | [[entities/flows/client-registration]] | Multi-screen registration collecting rider data |
| Menu router | `New_Client_Menu` | Presents form checklist and routes to subflows |
| Class selection | `Client_Class_Type`, `Client_Class_Status` | Class type and status |
| Medical forms | `Client_Client_Medical_History`, `client_seizure`, `ClientFileUpload_Down` | Condition-specific medical uploads |
| Waivers | `Client_Waiver`, `Client_Authorization_for_Emergency_Medical_Treatment` | Legal and emergency authorization |
| Photo | `Client_Photo_Release` | Photo release consent |
| HIPAA | `Confidentiality_HIPPA` | Confidentiality agreement |
| Completion | `Complete_Client_Application` | Final submission |

## Primary object

All client data ultimately lands on [[riders]] (`Riders__c`), linked to `Contact` and `Account`.

## Entry point

Community login: `https://wecanride.my.site.com/client/s/login`

## Weight limit gate

`Client_Registration` includes a weight-limit check. Clients over the veterinarian-recommended limit may be directed to groundwork lessons. Contact: `clients@wecanride.org`.

## Related

- [[returning-client-paperwork]] — annual renewal path for existing clients
- [[community-access]] — permissions required to run registration flows
