# We Can Ride — LLM Wiki Schema

This file configures how AI agents maintain the project knowledge base. Pattern: [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase.**

## Three layers

| Layer | Location | Owner | Purpose |
|-------|----------|-------|---------|
| Raw sources | `force-app/`, `orgs/`, `config/`, `raw/sources/` | Human curates; **never modify** during ingest | Source of truth |
| Wiki | `wiki/` | LLM writes and maintains | Compounding, interlinked synthesis |
| Schema | `AGENTS.md` (this file) | Human + LLM co-evolve | Conventions and workflows |

### Raw source rules

- **In-repo metadata** (`force-app/main/default/**`) is the primary raw layer. Cite as `path@git:line-range` (e.g. `force-app/main/default/flows/Returning_Emergency.flow-meta.xml`).
- **Dropped documents** go in `raw/sources/` (meeting notes, Salesforce release notes, stakeholder emails). These are immutable once filed.
- **Images** from clipped articles go in `raw/assets/`.
- Never edit raw sources during ingest. Extract into the wiki instead.

## Wiki structure

```
wiki/
├── index.md              # Content catalog (read first on every query)
├── log.md                # Append-only operations timeline
├── overview.md           # Project summary and navigation hub
├── synthesis/            # Cross-cutting architecture and journey maps
├── concepts/             # Domain concepts spanning multiple entities
├── entities/
│   ├── flows/            # One page per significant flow
│   ├── objects/          # One page per custom object (+ Contact)
│   ├── permission-sets/  # Permission set behavior
│   ├── lwc/              # Lightning Web Components
│   └── profiles/         # Community / internal profiles
├── manifests/            # Dense registries (flow list, object list)
├── summaries/            # One page per ingested raw/sources document
└── reports/              # Lint output and analysis artifacts
```

## Page conventions

### Frontmatter (required on every wiki page)

```yaml
---
title: Human-readable title
type: synthesis | concept | entity | summary | manifest | report
category: flows | objects | permissions | architecture | ...
sources: []           # raw source paths cited on this page
last_verified: YYYY-MM-DD
status: current | draft | stale | disputed
tags: []
---
```

### Linking

- Use Obsidian-style wikilinks: `[[returning-emergency]]`, `[[riders]]`.
- Every entity page must link to at least one concept and one related entity.
- Registries in `manifests/` are routing tables — one line per entry (link + one-line hook). Never put full content in manifests.

### New page vs. edit in place

| Action | When |
|--------|------|
| **New page** | Distinct entity/concept you would link to from elsewhere (a flow, object, permission pattern) |
| **Edit in place** | Attribute update, new field, permission change, bug fix note on an existing entity |
| **New synthesis page** | Query produced a comparison, decision record, or journey map worth keeping |
| **Append to log** | Every ingest, query-with-filing, or lint pass |

### Citation format

- Flows/objects: `force-app/main/default/flows/Returning_Emergency.flow-meta.xml`
- Pin versions when possible: `file@<short-sha>:lines` or note `last_verified` date.
- Quote user-facing flow text verbatim when documenting screen copy.

## Operations

### 1. Ingest

Triggered when the user says **"ingest"**, drops a file in `raw/sources/`, or asks to document new/changed metadata.

**Workflow:**

1. Read the source(s) fully.
2. Discuss key takeaways with the user if non-trivial.
3. Create or update `wiki/summaries/<slug>.md` for each new raw document.
4. Update affected pages in `entities/`, `concepts/`, and `synthesis/`.
5. Update `wiki/index.md` (add/update entries, never remove without lint approval).
6. Append to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD] ingest | <source title>
   - Summary: [[summaries/<slug>]]
   - Updated: [[page-a]], [[page-b]]
   - Notes: <one line>
   ```
7. Touch 5–15 pages per significant source. Under-updating cross-references is the #1 failure mode.

**Code-change ingest:** When `force-app/` changes, treat the diff as a source. Update entity pages, bump `last_verified`, and flag contradictions.

### 2. Query

Triggered when the user asks a project question.

**Workflow:**

1. Read `wiki/index.md` to locate relevant pages.
2. Optionally run `./scripts/wiki/search.sh "<query>"` to narrow candidates.
3. Read 3–10 relevant wiki pages (not the entire repo).
4. Verify claims against raw sources when `status: stale` or permissions are involved.
5. Synthesize an answer with wikilink citations.
6. If the answer is durable (comparison, decision, troubleshooting guide), file it:
   - `concepts/` for reusable patterns
   - `reports/` for one-off investigations
   - Append query entry to `log.md`

### 3. Lint

Triggered when the user says **"lint wiki"** or periodically after major changes.

**Run:** `./scripts/wiki/lint.sh`

**Check for:**

- Orphan pages (no inbound wikilinks)
- `status: stale` pages whose sources changed since `last_verified`
- Contradictions between pages (flag in `reports/contradictions.md`)
- Concepts mentioned repeatedly without their own page
- Missing cross-references after recent ingests
- Manifest drift (flows/objects in repo but not in manifests)

Append lint results to `log.md` and write full report to `wiki/reports/lint-YYYY-MM-DD.md`.

### 4. Commit (includes wiki ingest)

Triggered when the user asks to **commit** or **create a git commit**.

**Workflow (wiki ingest first, then commit):**

1. Run `git status` and `git diff` to see what will be committed.
2. Ingest all changed `force-app/`, `orgs/`, `config/`, and `raw/sources/` files into the wiki (same rules as § Ingest).
3. Stage wiki updates alongside source changes.
4. Proceed with the normal git commit workflow.

Skip wiki ingest if only `wiki/` files changed, or the user says **"commit without wiki"**.

See also: `.cursor/rules/commit-wiki-ingest.mdc`

## Domain context

**We Can Ride (WCR)** is a therapeutic horseback riding nonprofit on Salesforce.

| Area | Key artifacts |
|------|---------------|
| Client registration | `Client_Registration`, `New_Client_Menu`, `Riders__c` |
| Returning client paperwork | `Returning`, `Return_Client_Menu`, `Returning_*` subflows |
| Volunteer management | `volunteer_registration`, `Volunteer_Info__c`, `VolunteerWaiver__c` |
| Community access | `WCR Customer Community Plus Login` profile, community permission sets |
| Class scheduling | `Class_Management`, `Rider_Schedule__c`, `Volunteer_Schedule__c` |
| Emergency contacts | `Returning_Emergency`, `Client_Authorization_for_Emergency_Medical_Treatment` |

Community site: `https://wecanride.my.site.com/client/s/login`

## Tooling

```bash
# Search wiki pages by keyword
./scripts/wiki/search.sh "emergency contact permissions"

# Health-check the wiki
./scripts/wiki/lint.sh
```

## Agent behavior

- **Prefer the wiki** over re-scanning the entire `force-app/` tree for questions the wiki already answers.
- **Verify against source** when editing flows, permission sets, or profiles — stale wiki pages are worse than no page.
- **Compound knowledge**: valuable query answers become wiki pages; do not let insights die in chat history.
- **Minimal scope**: only edit wiki files and this schema unless the user asks for code changes.
