---
title: Client logins with a Rider, assessment 2026-11-16
type: report
category: data-quality
sources:
  - scripts/dup-merge/assess_clients.py
  - scripts/dup-merge/backfill_waivers.py
  - force-app/main/default/classes/ReturnClientMenuController.cls
last_verified: 2026-11-17
status: current
tags: [clients, community, riders, waiver]
---

# Client logins with a Rider, assessment 2026-11-16

Read-only. Population: Contacts with `Client__c` true that own an **active Experience Cloud user** and at least one `Riders__c`, checked right after the returning-client carry-over went live ([[concepts/site-yearly-waiver]]). Counts only; the per-Contact rows are in `backups/dup-merge/assess/clients.csv` (local, git-ignored). Rerun: `python3 scripts/dup-merge/assess_clients.py`.

## Population

- 524 active Experience Cloud users: 422 on Partner Community Login and 102 on Customer Community Plus Login. By Contact flag: Volunteer 278, Prospect 80, Client 78, none 88.
- **78 Client Contacts have a login; 77 own a Rider** (61 Partner Community Login, 16 Customer Community Plus Login). One Client Contact has no Rider and is outside the 77.
- Every one of the 77 has exactly **one** Rider, only the Client flag set (no Prospect or Volunteer), and `Type_of_Contact__c` = Client. No Prospect flips and no two-Rider cases remain in this group.
- Rider `Client_Status__c`: 32 Active, 1 Archived, 44 blank.
- 8 of the 77 appear in a duplicate set from `find_candidates.py` (taken before the pilot): 4 pilot survivors, 2 in-scope sets still on hold, 2 manual-review sets.

## `Paperwork_Complete__c`

- True 39, false 38. The deployed `UpdateContact` guard now stops a Rider save from setting these 38 to Prospect (no runtime proof, see [[concepts/duplicate-merge-rules]]).
- Of the 38, only **2** have a completed 2026 or 2027 `Client` waiver, 22 have a `Client` waiver in another state and 14 have none. So the "set it true where a completed waiver exists" cleanup would touch very few of them; the rest need a staff decision.

## What these 77 get from the site now (2027)

| Group | Count | What happens |
|---|---|---|
| No 2027 waiver yet, earlier answers exist | 47 | On first visit the site creates the waiver with last year's answers and Riding as the program: Service Type is skipped, every form still "Not Started". |
| No 2027 waiver yet, no earlier answers anywhere | 10 | Blank waiver, Service Type screen, blank forms. Nothing to carry. |
| 2027 waiver already exists | 20 | Never touched by the carry-over. 16 already have a program type, 4 have none and still show the Service Type screen. |

Of the 20 existing waivers, 5 already hold answers or a completed stamp. The other **15 are blank although earlier answers exist** (4 of them without a program type): these are the backfill candidates. No prior Mental Health client is in the group.

## Open decisions (not done)

- ~~Backfill the 15 blank 2027 waivers~~ **Done 2026-11-17** (26 waivers on 15 Riders, `verify` 0 mismatches). Details: Backfill the 15 blank 2027 waivers with their earlier answers (same field list and rules as the site code, nothing marked completed). **Prepared on 2026-11-17, not applied:** the 15 Riders hold 26 waivers (duplicates created by the site's get-or-create race, see [[concepts/site-yearly-waiver]]), all filled so the site shows the answers whichever one it reads. The read-only `check` passed every live guard. The permission layer blocked my DML runs, so the user ran `rehearse` from `scripts/dup-merge` (both batches ok, rolled back); `real` then `verify` followed: both batches committed, 0 mismatches. Nothing is marked completed; the 15 families still review and sign each form.
- Cleanup of `Paperwork_Complete__c` for the 38, or the `IsChanged` entry filter on `UpdateContact`.

## Not checked

- Inactive community users (their Contact is hidden on the User record), so a Client whose login was deactivated is not in the 77.
- Prospect-flagged logins that own a Rider and have earlier paperwork (the "clients marked as prospects" case outside this group).
- Whether the earlier answers are still right: they are copied as last year's values and the family must still review and sign each form.
- What a real user sees in the browser; checked from records and code only, no site login.
