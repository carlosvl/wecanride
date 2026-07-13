---
title: We Can Ride Salesforce — Overview
type: synthesis
category: architecture
sources:
  - sfdx-project.json
  - force-app/main/default/
last_verified: 2026-07-13
status: current
tags: [overview, salesforce, wcr]
---

# We Can Ride Salesforce Project

Therapeutic horseback riding nonprofit (**We Can Ride, Inc.**) running on Salesforce Experience Cloud. This repo is a Salesforce DX project (`sourceApiVersion: 55.0`) with community-facing screen flows for client and volunteer self-service.

## Quick stats

| Artifact | Count | Registry |
|----------|-------|----------|
| Screen flows | 68 | [[manifests/flows-registry]] |
| Custom objects | 16 | [[manifests/objects-registry]] |
| Permission sets | 4 | [[community-access]] |
| LWC components | 1 | [[fsc-flow-button-bar]] |

## Architecture at a glance

```mermaid
flowchart TB
    subgraph community [Experience Cloud]
        Profile[WCR Customer Community Plus Login]
        Site[wecanride.my.site.com/client]
    end

    subgraph registration [New Client Path]
        CR[Client_Registration]
        NCM[New_Client_Menu]
        Riders[Riders__c]
    end

    subgraph returning [Returning Client Path]
        Ret[Returning]
        RCM[Return_Client_Menu]
        Subflows[Returning_* subflows]
    end

    subgraph volunteer [Volunteer Path]
        VR[volunteer_registration]
        VI[Volunteer_Info__c]
        VW[VolunteerWaiver__c]
    end

    Site --> Profile
    Profile --> CR & Ret & VR
    CR --> NCM --> Riders
    Ret --> RCM --> Subflows
    VR --> VI & VW
```

## Key journeys

- [[client-journey]] — new client registration through `Client_Registration`
- [[volunteer-journey]] — volunteer onboarding and schedule selection
- [[returning-client-paperwork]] — annual returning paperwork via `Returning` router flow

## Cross-cutting concerns

- [[community-access]] — profiles, permission sets, flow run permissions
- [[flow-permissions]] — `isAdditionalPermissionRequiredToRun`, `Flow_User_Access`
- [[architecture]] — metadata layout and integration packages (NPSP, GW Volunteers, OneMerge)

## Community URLs

- Login: `https://wecanride.my.site.com/client/s/login`
- Internal Lightning: `https://wecanride.lightning.force.com/`

## How to use this wiki

See `AGENTS.md` in the repo root for ingest, query, and lint workflows. Start every query at [[index]].
