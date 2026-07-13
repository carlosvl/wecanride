---
title: Returning Client Paperwork (Concept)
type: concept
category: flows
sources:
  - force-app/main/default/flows/Returning.flow-meta.xml
  - force-app/main/default/flows/Return_Client_Menu.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [returning, router, subflow]
---

# Returning Client Paperwork

Concept-level view of the returning paperwork system.

## Pattern: router + menu + subflows

1. **`Returning`** — entry flow, identifies the client and sets context variables
2. **`Return_Client_Menu`** — displays checklist of required forms, launches subflows
3. **`Returning_*`** — individual form flows, each handling one document or data collection task

This mirrors the new client pattern (`Client_Registration` → `New_Client_Menu` → subflows).

## Design rationale

- Each form is independently deployable and testable
- Clients can complete paperwork incrementally across sessions
- Menu flow tracks completion status on [[riders]]
- Returning flows can be permission-gated separately via [[community-returning-flow-access]]

## Subflow naming convention

All returning subflows prefix with `Returning_` (except the parent `Returning` and menu `Return_Client_Menu`).

## When to create a new subflow vs. edit

| Scenario | Action |
|----------|--------|
| New annual form requirement | New `Returning_<FormName>` flow + menu entry |
| Field change on existing form | Edit existing `Returning_*` flow |
| Permission change | Update permission set + [[flow-permissions]] |

## Related

- [[synthesis/returning-client-paperwork]] — full journey map with subflow table
- [[returning-emergency]] — most complex subflow example
- [[returning]] — parent router flow entity page
