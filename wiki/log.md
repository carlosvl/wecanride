# Wiki Log

Append-only timeline of wiki operations. Parse with: `grep "^## \[" wiki/log.md | tail -5`

## [2026-07-16] ingest | pre-commit

- Sources: Community_Returning_Flow_Access, WCR Customer Community Plus Login profile, Returning_Diagnosis.flow-meta.xml, sync/assign apex scripts
- Updated: [[community-access]], [[community-waiver-year-access]], [[flow-permissions]]
- Notes: auto-ingest before commit — Partner→CCP perm sync + diagnosis/schedule community fixes

## [2026-07-16] ingest | Partner → CCP profile access sync

- Sources: `WCR Community Login` (Partner Community Login) vs `WCR Customer Community Plus Login`
- Updated: [[community-access]]
- Notes: Ran `sync-community-plus-from-partner-profile.apex`; deployed profile + `Community_Returning_Flow_Access` with Class/Client_Class FLS, CMDT, Partner-aligned userPermissions (minus license-blocked). Remaining gaps: Lead, ActionPlanTemplate, TabSet only.

## [2026-07-16] query | Returning Schedule Selection (Lyn Fredrickson)

- Sources: Flow error email — `Returning_Schedule_Selection` Get_Registered_Classes
- Updated: [[community-access]]
- Notes: `Client_Class__c` not on Customer Community Plus Login; Lyn/Allyson/Mabel missing Community PS assignments. Deployed Class/Client_Class perms; re-ran assign-community-permissions.apex.

## [2026-07-16] query | New Client Menu flow errors (Mabel Klinker)

- Sources: Flow error emails — `Returning_Parent_Guardian` CreateFirstGuardian; `Returning_Diagnosis` get_diagnosis
- Updated: [[community-access]]
- Notes: Partner flag on household blocked Contact create; missing `diagnoses__c` perms on Customer Community Plus Login. Cleared Klinker IsPartner; deployed object/FLS + flow access.

## [2026-07-13] bootstrap | Initial wiki scaffolding

- Created AGENTS.md schema, raw/ and wiki/ directory structure
- Seeded: [[overview]], [[synthesis/architecture]], journey maps, key entity pages
- Seeded: [[manifests/flows-registry]], [[manifests/objects-registry]]
- Added CLI: `scripts/wiki/search.sh`, `scripts/wiki/lint.sh`
- Sources: Returning_Emergency permissions, New_Client_Menu WaiverYear error
- Updated: [[community-access]], [[flow-permissions]], [[community-waiver-year-access]]
- Notes: deployed WaiverYear__mdt type access to profile + Community_Returning_Flow_Access

## [2026-07-13] lint | Automated health check
- Report: [[reports/lint-2026-07-13]]
- Issues: 1

## [2026-07-13] lint | Automated health check
- Report: [[reports/lint-2026-07-13]]
- Issues: 0
