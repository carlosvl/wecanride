---
title: Flow User Access
type: entity
category: permission-sets
sources:
  - force-app/main/default/permissionsets/Flow_User_Access.permissionset-meta.xml
last_verified: 2026-07-13
status: current
tags: [permission-set, runflow]
---

# Flow_User_Access

Base permission set granting screen flow execution to community users.

**Source:** `force-app/main/default/permissionsets/Flow_User_Access.permissionset-meta.xml`

## Grants

| Permission | Value |
|------------|-------|
| `RunFlow` (user permission) | enabled |
| License | Salesforce |

## Description

> Grants users the ability to run screen flows embedded on record pages

## Assignment

Should be assigned to all WCR Customer Community Plus Login users who need to run any screen flow. Does **not** grant access to flows with `isAdditionalPermissionRequiredToRun` — those need explicit flow grants (see [[community-returning-flow-access]]).

## Related

- [[flow-permissions]]
- [[community-access]]
