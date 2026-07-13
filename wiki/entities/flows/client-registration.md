---
title: Client_Registration Flow
type: entity
category: flows
sources:
  - force-app/main/default/flows/Client_Registration.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [flow, client, registration]
---

# Client_Registration

Primary screen flow for new client registration through Experience Cloud.

**Source:** `force-app/main/default/flows/Client_Registration.flow-meta.xml`

## Purpose

Multi-screen wizard collecting:

- Client demographics and contact information
- Medical history and diagnoses
- Riding goals and class preferences
- Height/weight (with veterinarian weight-limit gate)
- Payment and third-party payor information
- Document download links (handbook, payment policy, session dates)

## Entry conditions

Launched from community site after account creation via [[new-community-user]].

## Key behaviors

- Creates/updates [[riders]] (`Riders__c`) records
- Links to `Contact` and `Account`
- Redirects overweight clients to groundwork lesson option with `clients@wecanride.org` contact
- Provides document download links to Salesforce Files

## Downstream

After initial registration, clients proceed through `New_Client_Menu` for individual form completion. See [[client-journey]].

## Related

- [[riders]] — target object
- [[community-access]] — permissions
- [[new-community-user]] — account creation prerequisite
