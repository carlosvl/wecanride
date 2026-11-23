---
title: Duplicate Contact and "(C2)" account (Massie household)
type: report
category: data-quality
sources:
  - force-app/main/default/flows/NewCommunityUser.flow-meta.xml
  - force-app/main/default/flows/Client_Registration.flow-meta.xml
  - force-app/main/default/flows/Returning_Main_Info.flow-meta.xml
last_verified: 2026-11-16
status: current
tags: [duplicates, contact, account, partner-users, community]
---

# Duplicate Contact and "(C2)" account

Production investigation on **2026-11-12**; the investigation itself was read-only (the merge is described under Cleanup). Contacts `003UR00000ngrmtYAA` (rmt) and `003UR00000ngsHdYAI` (sHd) both read "Harrison Massie" with the same email; sHd sits in `Massie Household (C2)`.

Related: [[contact]], [[riders]], [[new-community-user]], [[community-access]]

## Short answer

Two separate causes stacked up:

1. **sHd was never Harrison.** It was the parent's own registration Contact. On 2026-08-11 the parent's community user changed its FirstName from the parent's name to "Harrison" (ContactHistory). That created the lookalike.
2. **"(C2)" is not a duplicate marker.** It is the name of an Account created by the 2026-08-07 bulk Partner-user job run as Carlos Villalpando. It moved sHd out of the shared household.

## Timeline

| When (UTC) | Who | What |
|------------|-----|------|
| 2026-03-28 19:14:03 | Site guest user | `NewCommunityUser`: creates household Account, Contact sHd (`Prospect__c`), a `Riders__c` for sHd and the community user. |
| 2026-03-28 19:15:38 | Parent's community user | `Client_Registration`: creates Contact rmt (the child) and a second `Riders__c`. Phone and email are the parent's. |
| 2026-04-10 | Staff | rmt gets `Client__c = true`. |
| 2026-08-07 22:45:05–22:45:20 | Carlos Villalpando | New Account `Massie Household (C2)`, new community user for sHd, sHd moved to it. |
| 2026-08-11 15:42:50 | Parent's new community user | sHd FirstName changed to "Harrison". |
| 2026-10-25 / 11-04 | Staff | rmt `Client__c` flipped off, then on again. |

## The 2026-08-07 bulk job

- 665 Accounts created between 22:38 and 22:51, all by the same user: 393 `(C2)`, 53 `(C3)`, 219 `(Community)`.
- Setup Audit Trail for that day, same user: 419 `createdpartneruser` and 418 `createdrole`.
- This was the Partner-user rebuild before the move to Customer Community Plus Login (see [[community-access]]).
- The script is **not in the repo**, so the exact rule for choosing `(C2)` vs `(C3)` is unconfirmed. It may be the 2nd and 3rd Contact of a household by Id; sHd is the 2nd of the two by Id.
- 238 Contacts sit in these accounts today, 220 of them with an active community user.

## Why a parent can overwrite their own Contact

- `NewCommunityUser` creates a Contact for the registrant and, when the registrant picks participant type client and plans to ride, a `Riders__c` named after that Contact.
- A parent who picks "client" for themselves, then registers the child through `Client_Registration`, ends up with a parent Contact that owns a Rider plus a child Contact that owns a Rider.
- `Returning_Main_Info` writes FirstName, LastName, address and phone straight onto the Contact it is handed (`VarContactID`). If the parent's own Contact is the one handed in, "update client info" renames the parent.
- **Unverified:** how the site hands `VarContactID` to the flow. That is page config outside the repo. The 8/11 FirstName change by the community user is the evidence.
- Scale of the first step: 146 Contacts are Prospect-only and own a Rider (100 created by the guest user).

## Cleanup

Merged on **2026-11-12** as set S0097 of the 8-set pilot, under the rules in [[concepts/duplicate-merge-rules]]. `003UR00000ngsHdYAI` (the Contact with the login, and the older of the two) survived and `003UR00000ngrmtYAA` was merged into it. The Account is back to the plain household name, `Client__c` is set and `Prospect__c` is cleared. The login user is unchanged. **Both `Riders__c` rows are still there** because the newer one has child records, so they need a manual Rider merge. The merged-away Contact can be undeleted from the Recycle Bin for 15 days; the backup is under `backups/dup-merge/pilot/` (local, git-ignored).

Review on 2026-11-13: logging in as this user still shows blank intake forms. The cause is the two `Riders__c` rows (the menu picks either one, and the older has no completed waiver) plus the new-year blank intake every returning client gets; see [[concepts/duplicate-merge-rules]]. The Rider merge waits for the reviewer to confirm which Rider to keep.

On 2026-11-16 the reviewer confirmed: the two Riders were collapsed into the one with the children and the completed 2026 forms (`collapse_riders.py`, rehearsed, then committed; no email flow fired). Contact flags unchanged (Client).

Also on 2026-11-16: the `UpdateContact` guard and the site menu year/label went live, and the returning-client carry-over is staged for sign-off; see [[concepts/duplicate-merge-rules]] and [[concepts/site-yearly-waiver]].
