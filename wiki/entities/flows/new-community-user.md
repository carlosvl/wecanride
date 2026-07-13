---
title: NewCommunityUser Flow
type: entity
category: flows
sources:
  - force-app/main/default/flows/NewCommunityUser.flow-meta.xml
last_verified: 2026-07-13
status: current
tags: [flow, community, account-creation]
---

# NewCommunityUser

Screen flow for creating Experience Cloud user accounts.

**Source:** `force-app/main/default/flows/NewCommunityUser.flow-meta.xml`

## Purpose

- Creates community login accounts for new clients/volunteers
- Matches or creates `Contact` records
- Generates usernames with `.wecanride` suffix

## Username formula

```
{email}.wecanride
```

Applied via flow formulas: `UsernameFormulaCheck`, and variants for new/existing contacts.

## Duplicate handling

Shows message when account already exists, directing user to `https://wecanride.my.site.com/client/s/login/`.

## Related

- [[community-access]] — profile and site configuration
- [[client-journey]] — next step after account creation
