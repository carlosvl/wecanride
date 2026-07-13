---
title: Architecture
type: synthesis
category: architecture
sources:
  - sfdx-project.json
  - force-app/main/default/
  - orgs/
  - config/project-scratch-def.json
last_verified: 2026-07-13
status: current
tags: [architecture, sfdx, metadata]
---

# Architecture

## Project layout

```
wecanride/
├── force-app/main/default/   # Salesforce metadata (primary raw source)
│   ├── flows/                # 68 screen flows
│   ├── objects/              # 16 custom objects + Contact extensions
│   ├── lwc/                  # Lightning Web Components
│   ├── permissionsets/       # Community permission sets
│   ├── profiles/             # Experience Cloud profiles
│   └── flexipages/           # Lightning pages
├── orgs/                     # Org shape definitions (beta, release)
├── config/                   # Scratch org definition
├── scripts/                  # Audit and wiki tooling
├── raw/                      # External immutable sources
└── wiki/                     # This knowledge base
```

## Managed / namespaced packages

The org integrates several AppExchange and managed packages visible in metadata:

| Package prefix | Purpose | Example metadata |
|----------------|---------|------------------|
| `npsp__` / `npe01__` / `npo02__` | Nonprofit Success Pack | Contact donation fields |
| `GW_Volunteers__` | Volunteers for Salesforce | Volunteer skills, availability |
| `onemergefree__` | OneMerge deduplication | Before-save merge flows |
| `dupcheck__` | Duplicate checking | Contact merge web links |
| `ers_` | Datatable config | `ers_datatableConfig__c` |

## Flow architecture patterns

1. **Router flows** — `Returning`, `Return_Client_Menu`, `New_Client_Menu` delegate to subflows
2. **Subflow pattern** — `Returning_*` flows handle individual forms (waiver, medical history, schedule)
3. **System mode** — Some flows run `SystemModeWithoutSharing` to bypass community sharing limits (see [[returning-emergency]])
4. **File upload flows** — `Client_UploadAnyFile`, `Upload_Client_File`, `Returning_File_Upload_*`

## Custom metadata

| Type | Purpose |
|------|---------|
| `WaiverYear__mdt` | Waiver year configuration |
| `We_Can_Ride_Constants__mdt` | Org-wide constants |

## Org environments

| Config | File |
|--------|------|
| Beta test org | `orgs/beta.json` |
| Release test org | `orgs/release.json` |
| Scratch org | `config/project-scratch-def.json` |

## Related

- [[community-access]] — how community users access flows
- [[flow-permissions]] — permission model for screen flows
- [[manifests/flows-registry]] — complete flow inventory
