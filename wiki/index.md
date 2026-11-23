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
| [[concepts/duplicate-merge-rules]] | Rules and pipeline for merging duplicate Contacts into the community-login record (pilot run 2026-11-12, site findings 2026-11-13, `UpdateContact` Prospect flip and Rider collapse 2026-11-16) |
| [[concepts/site-yearly-waiver]] | How the client site builds the yearly waiver; year/label and returning-client carry-over deployed 2026-11-16 |
| [[reports/client-login-assessment-2026-11-16]] | The 77 Client logins with a Rider: single Rider, paperwork state, who the carry-over reaches, 15 backfill candidates (backfilled 2026-11-17) |
| [[concepts/passkey-login]] | Reset a broken Windows/Chrome passkey for internal Salesforce login |

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
| [[entities/permission-sets/community-waiver-year-access]] | WaiverYear custom metadata field read |

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

| Page | Summary |
|------|---------|
| [[reports/community-login-license-estimate]] | Unique community logins last 6 months; 160 CCP Login if volunteers stay, 80 if they stop |
| [[reports/duplicate-contact-c2-account]] | Why two Contacts look like one person and what the "(C2)" Account suffix is (2026-08-07 bulk Partner-user job) |
| [[reports/constituent-mailing-and-thank-you-lists]] | Two-year mailing list and current-year thank-you call list; reusable email in `docs/outreach/` |
