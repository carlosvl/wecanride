---
title: Community login license estimate (6 months)
type: report
category: licenses
sources:
  - force-app/main/default/objects/Contact/fields/Client__c.field-meta.xml
  - force-app/main/default/objects/Contact/fields/Volunteer__c.field-meta.xml
  - force-app/main/default/objects/Contact/fields/Prospect__c.field-meta.xml
  - force-app/main/default/profiles/WCR Customer Community Plus Login.profile-meta.xml
last_verified: 2026-08-26
status: current
tags: [community, licenses, login-history, experience-cloud]
---

# Community login license estimate

Production query on 2026-08-26 for unique Experience Cloud logins from **2026-02-26 through 2026-08-26**. Names omitted. Deactivated users included.

Shareable copy with charts: `docs/community-licenses/We-Can-Ride-community-login-licenses.pdf` (PNG charts in `docs/community-licenses/charts/` for Google Docs Insert → Image).

Related: [[community-access]], [[contact]]

## Recommendation

Two buy sizes, depending on whether volunteers keep using the community.

| Scenario | Peak unique logins / month | CCP Login to hold | Notes |
|----------|----------------------------:|-------------------:|-------|
| Volunteers keep logging in | 107 (Aug MTD) | **160** | Eight packs of 20. Replaces 500 Partner + 80 CCP. |
| Volunteers stop logging in | 46 (Aug MTD) | **80** | Same 80 already owned. No extra purchase. |

Currently purchased: **500 Partner Community Login + 80 Customer Community Plus Login = 580**. Do not convert Partner seats one-for-one.

| Option | Licenses | Notes |
|--------|----------|-------|
| Volunteers stay | 160 CCP Login | Peak 107 + ~50% buffer |
| Volunteers stay, floor | 120 CCP Login | Covers August MTD with little headroom |
| Volunteers stop | 80 CCP Login | Peak 46; already owned |
| Volunteers stop, floor | 60 CCP Login | Three packs of 20 |
| Clients only (drop prospects/unflagged too) | 40 CCP Login | Peak any-Client flag is 15 |
| Do not buy | 285 / 484 / 1,181 | Distinct people over 6 months, assigned active users, and total user records — not monthly unique logins |

## How login licenses count

These SKUs are login-based. Salesforce counts a person **once per calendar month** the first time they successfully log in. Repeat visits in the same month do not consume another login.

Two org numbers look similar and mean different things:

| License | Purchased | Assigned active users (`UserLicense.UsedLicenses`) | Unique logins this month (`TenantUsageEntitlement`) |
|---------|-----------|-----------------------------------------------------|------------------------------------------------------|
| Partner Community Login | 500 | 423 | 104 |
| Customer Community Plus Login | 80 | 61 | 14 |

Buy against unique monthly logins, not assigned users.

## Unique logins

Successful `Chatter Communities External User` rows in `LoginHistory` (626 events) joined to community `User` records.

**285 distinct people** logged in at least once in the window (150 still active, 135 now deactivated). Peak month: **107 unique in August 1–26**.

| Month | Unique people | Client (any) | Volunteer (any) | Both | Neither |
|-------|---------------|--------------|-----------------|------|---------|
| Feb 26–28 (partial) | 15 | 6 | 6 | 0 | 3 |
| March | 44 | 12 | 26 | 3 | 9 |
| April | 46 | 15 | 17 | 4 | 18 |
| May | 45 | 11 | 25 | 3 | 12 |
| June | 65 | 8 | 46 | 1 | 12 |
| July | 50 | 15 | 26 | 2 | 11 |
| August 1–26 (MTD) | 107 | 11 | 61 | 0 | 35 |

February is three days; August is incomplete. Salesforce’s entitlement counters for the current month (104 Partner unique + 14 CCP unique ≈ 118) sit slightly above the LoginHistory success count of 107.

## If volunteers stop logging in

Remove Volunteer-only contacts. Keep clients, the 6 client+volunteer people, prospects, and unflagged contacts.

Peak remaining unique logins: **46 in August 1–26**. Distinct people over six months: **139** (63 still active, 76 deactivated). You already own **80** Customer Community Plus Login licenses; that covers 46 with headroom.

| Month | All unique | Without volunteer-only | Client only | Prospect | Unflagged |
|-------|------------|------------------------|-------------|----------|-----------|
| Feb 26–28 (partial) | 15 | 9 | 6 | 1 | 2 |
| March | 44 | 21 | 9 | 2 | 7 |
| April | 46 | 33 | 11 | 4 | 14 |
| May | 45 | 23 | 8 | 2 | 10 |
| June | 65 | 20 | 7 | 6 | 6 |
| July | 50 | 26 | 13 | 5 | 6 |
| August 1–26 (MTD) | 107 | 46 | 11 | 19 | 16 |

Volunteers were 146 of 285 distinct logins (51%) and 61 of August’s 107. August’s remaining 46 is 11 clients, 19 prospects, and 16 unflagged — not a client surge. If those unflagged people are mis-tagged volunteers, the need is closer to the any-Client peak of **15**.

## Role mix (6-month unique people)

Contact checkboxes `Client__c`, `Volunteer__c`, and `Prospect__c`. Dual-flagged contacts counted once under “both.”

| Role | Unique logins | Share |
|------|---------------|-------|
| Volunteer only | 146 | 51% |
| Client only | 45 | 16% |
| Client and volunteer | 6 | 2% |
| Prospect only (no client/volunteer) | 36 | 13% |
| Unflagged or unmatched | 52 | 18% |
| **Total** | **285** | **100% |

Any Client flag: **51**. Any Volunteer flag: **152**.

Deactivated community users do not return `ContactId` in the API. 132 of 135 deactivated logins were matched to Contact by email; 3 had no matching Contact.

## Inventory (not the buy number)

| Profile | License | Active | Deactivated | Never logged in (active) |
|---------|---------|--------|-------------|--------------------------|
| WCR Customer Community Plus Login | Customer Community Plus Login | 61 | 0 | 3 |
| WCR Community Login | Partner Community Login | 423 | 697 | 330 |
| **Total** | | **484** | **697** | **333** |

Active community users by Contact flag (assigned, not logins): Volunteer 272, Client 66, Prospect 61, unflagged 85.

## Caveats

- `LoginHistory` retains about six months, so fall 2025 paperwork is outside this window.
- New registrations already use Customer Community Plus Login; most historical logins still sit on Partner Community Login until those users are moved.
- 88 of 285 logins have neither Client nor Volunteer checked (prospects, parents/guardians, or unflagged contacts). The no-volunteer scenario still includes those 88 people.
- 330 active Partner-license users have **never** logged in; they inflate assigned-seat counts and can be deactivated without changing login consumption.
