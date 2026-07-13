# Wiki Index

Content catalog for the We Can Ride Salesforce project. Agents: read this file first on every query, then drill into linked pages.

## Synthesis

| Page | Summary |
|------|---------|
| [[overview]] | Project summary, stats, and navigation hub |
| [[synthesis/architecture]] | Metadata layout, packages, org configuration |
| [[synthesis/client-journey]] | New client registration flow sequence |
| [[synthesis/volunteer-journey]] | Volunteer onboarding and scheduling |
| [[synthesis/returning-client-paperwork]] | Returning client annual paperwork router |

## Concepts

| Page | Summary |
|------|---------|
| [[concepts/community-access]] | Experience Cloud profile and permission sets for community users |
| [[concepts/flow-permissions]] | Flow run permissions, `Flow_User_Access`, additional permission flags |
| [[concepts/returning-client-paperwork]] | How `Returning` orchestrates `Returning_*` subflows |

## Entities — Flows

| Page | Summary |
|------|---------|
| [[entities/flows/returning-emergency]] | Emergency contact collection for returning clients/volunteers |
| [[entities/flows/client-registration]] | Full new client registration screen flow |
| [[entities/flows/returning]] | Parent router flow for returning client paperwork |
| [[entities/flows/new-community-user]] | Community user account creation |

## Entities — Objects

| Page | Summary |
|------|---------|
| [[entities/objects/riders]] | `Riders__c` — client/rider record with medical and session data |
| [[entities/objects/volunteer-info]] | `Volunteer_Info__c` — volunteer training and emergency contacts |
| [[entities/objects/contact]] | `Contact` — extended with NPSP, GW Volunteers, WCR fields |

## Entities — Permission Sets

| Page | Summary |
|------|---------|
| [[entities/permission-sets/flow-user-access]] | Base flow execution for community users |
| [[entities/permission-sets/community-returning-flow-access]] | Returning flow access grant |

## Entities — LWC

| Page | Summary |
|------|---------|
| [[entities/lwc/fsc-flow-button-bar]] | Flow screen button bar component |

## Manifests

| Page | Summary |
|------|---------|
| [[manifests/flows-registry]] | Complete list of 68 screen flows |
| [[manifests/objects-registry]] | Custom objects and metadata types |

## Summaries

_No ingested external documents yet. Files dropped in `raw/sources/` will appear here._

## Reports

_No lint reports yet. Run `./scripts/wiki/lint.sh` to generate._
