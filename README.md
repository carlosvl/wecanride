# We Can Ride — Salesforce DX

Therapeutic horseback riding nonprofit on Salesforce Experience Cloud. Community-facing screen flows handle client registration, returning annual paperwork, and volunteer management.

## LLM Wiki

This project uses the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a persistent, compounding knowledge base maintained by AI agents.

| Layer | Location | Purpose |
|-------|----------|---------|
| Raw sources | `force-app/`, `raw/sources/` | Immutable source of truth |
| Wiki | `wiki/` | Interlinked synthesis and entity pages |
| Schema | `AGENTS.md` | Agent conventions and workflows |

### Quick start

```bash
# Search the wiki
./scripts/wiki/search.sh "emergency contact permissions"

# Health-check wiki integrity
./scripts/wiki/lint.sh
```

### Agent commands

| Command | What it does |
|---------|--------------|
| **"ingest `<source>`"** | Read a source, update wiki pages, index, and log |
| **"lint wiki"** | Run orphan/stale/drift checks |
| **"commit"** | Auto-ingest changed metadata into wiki, then commit both |
| Ask any project question | Agent reads `wiki/index.md` first, then relevant pages |

Browse the wiki in Obsidian (open repo root as vault) or read `wiki/overview.md`.

## Project structure

```
force-app/main/default/
├── flows/           # 68 screen flows
├── objects/         # Custom objects (Riders__c, Volunteer_Info__c, etc.)
├── lwc/             # Lightning Web Components
├── permissionsets/  # Community permission sets
└── profiles/        # Experience Cloud profiles
```

## Salesforce DX

- [Development models](https://developer.salesforce.com/tools/vscode/en/user-guide/development-models)
- [SFDX project configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm)
- [Salesforce CLI reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)

## Community

- Site: https://wecanride.my.site.com/client/s/login
