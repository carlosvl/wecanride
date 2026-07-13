---
title: Returning Flow
type: entity
category: flows
sources:
  - force-app/main/default/flows/Returning.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [flow, returning, router]
---

# Returning

Parent router flow for returning client annual paperwork.

**Source:** `force-app/main/default/flows/Returning.flow-meta.xml`

## Purpose

Entry point for existing clients renewing annual paperwork. Identifies the client record and routes to `Return_Client_Menu` for form selection.

## Architecture role

```
Returning → Return_Client_Menu → Returning_* subflows
```

Part of the router + subflow pattern documented in [[returning-client-paperwork]].

## Related

- [[synthesis/returning-client-paperwork]] — full subflow inventory
- [[returning-emergency]] — example subflow
- [[community-returning-flow-access]] — permission set granting access
