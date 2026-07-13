# Raw Sources

Immutable source documents for the [[../wiki/overview|LLM Wiki]]. The LLM reads from here but **never modifies** files in this directory.

## In-repo sources (primary)

The main raw layer lives in the Salesforce metadata tree:

| Path | Contents |
|------|----------|
| `force-app/main/default/flows/` | Screen flows (client/volunteer registration, returning paperwork) |
| `force-app/main/default/objects/` | Custom objects and Contact field extensions |
| `force-app/main/default/lwc/` | Lightning Web Components |
| `force-app/main/default/permissionsets/` | Community and flow permission sets |
| `force-app/main/default/profiles/` | Experience Cloud profiles |
| `force-app/main/default/flexipages/` | Lightning page layouts |
| `orgs/` | Scratch org definitions |
| `config/` | Project scratch definitions |

These are version-controlled in git. Cite them directly during ingest — do not copy into `raw/sources/`.

## Dropped sources

Place curated external documents here:

- `sources/` — meeting notes, stakeholder requirements, Salesforce release notes, vendor docs
- `assets/` — images downloaded from clipped articles (Obsidian: set attachment folder to `raw/assets/`)

## Workflow

1. Drop a file in `sources/` (or point the agent at changed `force-app/` metadata).
2. Tell the agent: **"ingest `<filename>`"** or **"ingest flow changes"**.
3. Review the wiki updates in `wiki/` (browse in Obsidian or Cursor).
