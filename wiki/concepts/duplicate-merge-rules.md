---
title: Duplicate Contact merge rules
type: concept
category: data-quality
sources:
  - scripts/dup-merge/find_candidates.py
  - scripts/dup-merge/backup.py
  - scripts/dup-merge/build_merge_apex.py
  - scripts/dup-merge/review.py
  - scripts/apex/merge-duplicate-sets.apex
  - scripts/apex/collapse-duplicate-riders.apex
  - scripts/dup-merge/collapse_riders.py
  - force-app/main/default/flows/UpdateContact.flow-meta.xml
  - force-app/main/default/classes/ReturnClientMenuController.cls
  - force-app/main/default/lwc/returnClientMenu/returnClientMenu.js
last_verified: 2026-11-23
status: current
tags: [duplicates, contact, account, merge, community]
---

# Duplicate Contact merge rules

How duplicate Contacts that exist because of the registration flows and the 2026-08-07 bulk job ([[reports/duplicate-contact-c2-account]]) are merged. Pilot of 8 sets run in prod on **2026-11-12**; of the remaining 15 in-scope sets, 13 were approved on 2026-11-17 and merged on 2026-11-18 (see "Sign-off answers" and "Run result"), S0084 stays unmerged and S0060 is on hold.

Related: [[contact]], [[riders]], [[community-access]], [[site-yearly-waiver]]

## Rules

1. **The Contact that owns the active Experience Cloud user always survives** (its Id, login and Account), whatever its age. A set with more than one login is never merged automatically.
2. **Field values come from the oldest member first** (`CreatedDate`), blanks filled from newer ones. Newer records are a new cycle of paperwork. Name and the Mailing/Other address move as a block from the oldest member that has any value.
3. Match = same normalized first + last name **and** (same email or same birthdate); differing birthdates block it. Name-only matches go to a manual list, sets with no login are listed only.
4. Not copied: owner, record type, Account, `Email` and the NPSP email-type fields (the login's email stays; `--patch-email` overrides), NPSP rollups/address lookups, Plauti and OneMerge fields.
5. Checkboxes: any true wins (keeps opt-outs). **Client / Volunteer / Prospect are exclusive** (validation rule "Select only one of Volunteer, Client, Prospect"): Prospect is dropped when a Client or Volunteer flag exists; Client plus Volunteer holds the set for a human.
6. Account: the login Contact's Account survives, the other members' Accounts are merged into it (their Contacts follow). The `(C2)`/`(C3)`/`(Community)` suffix is dropped only when the oldest Account has the same name without it.
7. `Riders__c`: the newer ClientContact Riders are deleted **only if every one has zero child rows** (waivers, classes, diagnoses, files, feed) and the oldest is kept. Otherwise both stay, and since 2026-11-13 the set is held until the Riders are collapsed with `collapse_riders.py` (see below). `Volunteer_Info__c` is never collapsed.
8. A set is held (not run) if the merge would re-parent an Enrolled `Volunteer_Class__c` row: `Volunteer_Confirmation_email` fires on any update of an Enrolled row.
9. Child rows are never re-parented with DML; `Database.merge` does that.

## Pipeline

`find_candidates.py` (read-only) → `backup.py export|verify` (every field of the members, Accounts, Users and every child row, sha256 + a `SystemModstamp` fingerprint) → `build_merge_apex.py rehearse` (real DML, `Database.rollback`) → `real` (needs an ok rehearsal of the identical payload; both start with `backup.py verify`) → `review.py`. All output is under `backups/dup-merge/` (git-ignored, personal data, iCloud-synced).

## What the site does with the merged records

Found when the pilot was reviewed on 2026-11-13 (read from the org's `client` Experience site, ApexClass `ReturnClientMenuController`, LWC `returnClientMenu`). The pilot checks before that covered records only, not the site.

- **Page variation follows the logged-in user's own Contact.** The Audiences `Client` (priority 1, `Client__c`), `Contact` (all three flags false), `Volunteer` (3) and `Prospect` (4) test `$Contact.<flag>` of the user, not of the Contact being opened. The Client and Prospect pages both embed `c:returnClientMenu`; the Home page lists the household's Contacts and has the `NewContact` flow. A parent login that is a Prospect therefore opens the Prospect page for every child's Contact too.
- **The paperwork menu** (`getClientData(contactId)`) takes the opened Contact's Rider with `LIMIT 1` and **no ORDER BY**, then reads only the `Client` record-type waiver of the current year (`WaiverYear__mdt` "Client Current Year", 2027 on 2026-11-13) and **creates a blank one when none exists**. A blank waiver has no `Program_Type__c`, so the first screen is the Service Type chooser and every form is "Not Started". Prior-year `Yearly_Forms` and `New_Registration` waivers are not read.
- **Consequence:** every returning client starts the new year from a blank intake, merged or not (2027: 94 `Client` waivers, 56 without a program type). It is a site design question, not a merge defect.
- **Any save of a `Riders__c` can turn a Client into a Prospect.** The active flow `UpdateContact` (v3, 2026-10-21) is a Rider after-save flow on create and update with no entry filter. `Paperwork_Complete__c = true` sets the Contact to Client; otherwise it sets Prospect and clears Client and Volunteer. `Paperwork_Complete__c` is a plain checkbox that only the `Convert_Prospect_to_Client` quick action sets, so a returning client or volunteer whose Rider has it false flips on the next Rider save (a site form save, a login-as test, an admin edit). Exposure on 2026-11-16: 146 Client Riders and 140 Volunteer Riders with it false. `Rider.Type_of_Contact__c` is a formula of the Contact flags, so restoring the Contact needs no Rider update. `Contact_Update_Status_From_Client_Record` only copies `Status__c` (ruled out).
- **Guard (deployed 2026-11-16).** `UpdateContact` is now Flow v4, Active: a decision `Already_Client_Or_Volunteer` before `Set_As_Prospect` means a Client or Volunteer is never set back to Prospect. The repo copy equals the org. Deploy ids: check-only `0Afj10000001W2fCAE`, quick deploy `0Afj10000001W4HCAU`. Verified by flow metadata only; a rollback rehearsal that would show it at runtime was blocked, so there is no runtime proof. `UpdateContact_VolunteerRider` (sets Volunteer for Community/Volunteer Lesson) was not analyzed against it.
- **Still exposed underneath:** the 146 Client and 140 Volunteer Riders with `Paperwork_Complete__c` false are now safe from a plain Rider save, but the flag itself is still wrong for them. Optional, staff-approved cleanup (not applied): set it true for the 56 Clients and 27 Volunteers that have a completed `Client` waiver in 2026 or 2027; the other 90 Clients and 113 Volunteers have none and need a staff decision. Alternative: an entry filter on `IsChanged({!$Record.Paperwork_Complete__c})`.
- **Two Riders under one login Contact** make the menu show either one. Such a set is **held** (`build_merge_apex.py`) until the Riders are collapsed with `collapse_riders.py rehearse|real <batch> <setId> --keep <RiderId> [--move W1,W2] [--drop W3]` (template `scripts/apex/collapse-duplicate-riders.apex`). Keep the Rider that holds the children and completed waivers; blanks of the keeper are filled from the older one, the older one's waivers are moved by setting `Client__c` (no `Class_Registration_Emails` or `Screening_*_Email`: both act only on the `New_Registration` record type with a screening date or submitted application), stub waivers are deleted, then the older Rider. Live guards refuse to run unless the older Rider's waivers equal move plus drop and it has no classes, diagnoses, assessments, tests, files or feed; same backup, rehearsal and sha rules as the merge.
- **Parent login, child clients:** when the login Contact is neither Client nor Volunteer and owns no Rider, the set is flagged `login_contact_neither_client_nor_volunteer_no_rider`. Merging does not change what that user sees.

## Follow-up fixes (2026-11-16)

- **Two Riders collapsed** for the pilot set that had them (S0097): one Rider left under the login Contact, its 2027 waiver moved over, the blank stub waiver deleted, no email fired, Contact flags unchanged.
- **One Contact restored to Client** (S0100) after a login test had turned it into a Prospect. Its Rider still has `Paperwork_Complete__c` false; the deployed guard now protects it from the next Rider save (metadata-verified only, see Guard above).
- Backup of both survivors: `backups/dup-merge/fix-1116/` (local, git-ignored).
- **`review.py` rerun (pilot batch):** the Collapsed-Rider and restored sets pass the survivor, losers-deleted, patched-fields and login checks. One field difference on another set is a user edit made on 11-13. Child-count differences are the by-design merge deletions listed under "What the pilot taught". The rerun was not diffed line by line against the 11-12 output.
- **Year and Client/Prospect label in the site menu: deployed 2026-11-16** (check-only `0Afj10000001WFZCA2`, quick deploy `0Afj10000001WKPCA2`, 49 tests, 0 failures, about 77% coverage). The menu heading shows the waiver year, a `Client paperwork` / `Prospect paperwork` badge and a banner. The Apex SELECT in `getClientData` now returns `Contact.Volunteer__c/Client__c/Prospect__c`. Repo copy equals the org: `ReturnClientMenuController`, its test, LWC `returnClientMenu`. See [[concepts/site-yearly-waiver]].
- **Skip the Service Type screen and copy last year's answers: deployed 2026-11-16** (check-only `0Afj10000001WNdCAM`, quick deploy `0Afj10000001WaXCAU`, 54 tests, 0 failures, about 78.7% coverage; re-retrieve matches). Applies only when the site creates a missing current-year waiver. Details and limits in [[concepts/site-yearly-waiver]]; who it reaches in [[reports/client-login-assessment-2026-11-16]].

## Re-read of the 15 remaining sets (2026-11-17)

Read-only; nothing merged or written. `find_candidates.py --out backups/dup-merge/candidates-1117.csv` (new `--out`, so the 11-12 set numbers stay valid), then a new batch `rest15` (30 Contacts, 30 Accounts; `backup.py export`, 7.5 minutes), `build_merge_apex.py plan rest15` and the new `reread.py rest15` (one block per set, no names or emails).

- **Unchanged:** the 15 sets have the same members and the same flags as on 2026-11-12; the 8 pilot sets are gone from the list. New since 11-12: one out-of-scope pair (a Contact created 2026-11-16 that duplicates one from 2016, no login: duplicates are still being created) and one name-only manual pair that only shows now because the pilot merge removed the cluster that hid it. Totals now: 15 in scope, 52 manual, 40 out of scope.
- **Plan result:** 14 buildable, 1 held. No set has two Riders; no merged-away Contact owns a Rider (so no merge moves a Rider); no Client + Volunteer conflict. Survivors after the merge: 2 Client (S0023, S0075), 9 Volunteer, 2 Prospect (S0082, S0108), 2 with no flag (S0007, S0062). Only 5 survivors have ever logged in (S0056, S0060, S0084, S0095, S0108); 10 never have, so the merge is not urgent for them. In 12 sets the merged-away Contact has a different email; the default keeps the login's email.
- **Held, S0084:** the merged-away Contact owns 12 `Enrolled` `Volunteer_Class__c` rows and the login Contact has none, so the user does not see their own enrolments today. Merging re-parents each row (an update). The flow `Volunteer_Confirmation_email` (record-triggered, after update on `Volunteer_Class__c`, entry criterion only `Status__c = Enrolled`, no "changed" test) would send the confirmation again for each row, up to 12 emails; the email alert itself is not in the repo. Options: add a changed-to-Enrolled criterion to the flow (a small prod deploy that also stops re-sends on any other edit of an Enrolled row), merge and accept the emails, or leave the set manual. Not decided.
- **Needs a decision, S0060:** both members own a `Volunteer_Info__c` (merged-away one: 2 waivers; login one: 6), so the login Contact would own two after the merge (flag `volunteer_info_left_for_manual_merge`). Whether the volunteer menu picks one arbitrarily like the Rider menu was not checked; treat as held until the two are merged by hand.
- **Flagged, harmless to merge:** S0007 is the guardian shape (login Contact has no flag and no Rider); a Rider elsewhere names the merged-away Contact as both emergency contact and mother/guardian, and both lookups would then point at the login Contact. S0062's login Contact owns a `Volunteer_Info__c` with 2025 waivers but `Volunteer__c` is false (existing gap; the merge changes nothing). In S0063 the survivor takes the Volunteer flag from the merged-away Contact, which fixes the same gap.
- **By design, as in the pilot:** Plauti pair rows (6 sets), NPSP address rows and Chatter of the merged-away household are deleted.
- **Clean, 11 sets:** S0023, S0043, S0056, S0063, S0070, S0075, S0077, S0082, S0089, S0095, S0108 (plus S0007 and S0062 as flagged above). Next steps for them would be `rehearse` (the user runs it), `real`, `review.py`, after sign-off.
- **Blocker, fixed the same day:** `backup.py verify rest15` failed (`sObject type 'ApplicationForm'` / `'ContactPointOttSvc' is not supported`, `No such column 'FromId' on 'EmailMessage'`) although the same queries worked at export. Cause: `sfdx-project.json` has `sourceApiVersion 55.0` and the CLI, run from inside the project, uses it for queries; those objects and the column do not exist before API 68 (67 lacks `ContactPointOttSvc`). The earlier exports ran from outside that default. `common.py` now sets `SF_ORG_API_VERSION=68.0` for every `sf` call; `verify rest15` then passes (801 queries, 109 skipped as at export). In this sandbox the CLI also needs `SF_DISABLE_DNS_CHECK=true`.
- **Recycle Bin:** the pilot's merged-away records can be restored until 2026-11-27.
- **Sign-off document:** `review_doc.py rest15` writes `for-review.md`/`.html` in the batch folder (local, git-ignored) with full Lightning URLs and per-set decision boxes.

## Sign-off answers (2026-11-17)

- **Merge (13 sets):** S0007 (same person as the guardian Contact: yes), S0023, S0043, S0056, S0062, S0063, S0070, S0075, S0077, S0082, S0089, S0095, S0108.
- **S0062:** tick `Volunteer__c` on the survivor. Done inside the merge payload with the new `build_merge_apex.py --set S0062:Volunteer__c=true` (a human decision for one boolean of one set; the payload sha and the rehearsal cover it; the set is held if the tick would leave two of Client/Volunteer/Prospect set). The repo has no flow triggered by a Contact save (the two record-triggered flows that touch Contacts, `UpdateContact_VolunteerRider` and `Update_Client_Record_Name`, fire on Rider saves), so the tick should fire none; the rehearsal lists any automation that does.
- **Weights:** S0108 keeps 220, S0082 keeps 79, which is what the plan already does (the first record's value wins on a same-day tie).
- **S0084:** left unmerged (option C); the 12 Enrolled `Volunteer_Class__c` rows stay on the other Contact, no flow change.
- **S0060:** contradictory answers (decision 2 box B "merge now with two Volunteer records", per-set box "Hold, do not merge"). Treated as hold until the owner says which; excluded from the run with `--only`. **Resolved 2026-11-23: leave unmerged** (reviewer's answer), so no `Volunteer_Info__c` collapse script is needed.
- Run: `rehearse`, then `real`, both with `--only S0007,S0023,S0043,S0056,S0062,S0063,S0070,S0075,S0077,S0082,S0089,S0095,S0108 --set S0062:Volunteer__c=true`, then `review.py rest15`. The user runs the DML.

## Run result (2026-11-18)

- **13 sets committed** (the user ran rehearse, then real, then `review.py`). In each: both merges ok, no field differed after the update, the login user is active with the same username and email, no merged-away Contact or Account is left. All 13 survivors exist and all 13 login users are unchanged.
- **Review:** 12 sets fully clean. The child-count differences are the by-design deletions (Plauti pair rows, `EmailMessageRelation`, Chatter `FeedItem`, the merged-away household's `npe01__One2OneContact__c`).
- **S0056, one patched field not as planned:** `MailingStreet` was planned from the older Contact (`<street> <city>`, the city typed into the street line) and is live as the survivor's own value (`<street>`). Cause: NPSP address management re-applies the household's default address to a Contact after commit (`npsp__is_Address_Override__c` false), so it is not visible in the in-transaction check. The result equals the survivor's pre-merge value, the household billing street and the default `npsp__Address__c`; the other spelling survives only in the backup and a non-default address row. Accepted, not rewritten. Expect the same for any set where the two records spell a street differently.
- **S0056, relationships:** both Contacts had the same relationship to the same person (Child/Parent on one, Child/Mother on the other). NPSP kept the survivor's more specific pair (Mother) and dropped the duplicate generic pair, so the 2-to-1 counts on `npe4__Relationship__c` are by design, with no information lost.
- **Address rows:** no merged set shows a `npsp__Address__c` difference, so the folded household's address rows stayed on the surviving household in this run (the pilot note below says they were deleted; the two runs disagree, not investigated).
- **Automation fired** (code units): a set with a Contact update fires 7 Contact flow units and 2 workflows, a set without one 4 and 1; Account flows 4 or 7. The S0062 `Volunteer__c` tick added nothing beyond that (same counts as other sets). The repo does not contain these Contact flows, so the org is the source of truth; per the pilot they only set the county from the postal code.
- **Not merged:** S0084 (answer: leave unmerged) and S0060 (contradictory answers, held). `review.py` used to list every set in the batch as if merged and so reported these two as failures; it now reviews only sets that have a `runs/<set>.real.log`.
- **Recycle Bin:** the merged-away records of this run can be restored until 2026-12-03 (15 days); the pilot's until 2026-11-27.
- **Still open:** S0084 flow fix if it is ever merged, 52 manual and 40 out-of-scope lists, new duplicates still appearing. (S0060 answered 2026-11-23, see below.)

## Review of the 13 merged sets (2026-11-23)

- **S0060: leave unmerged.** Both sets with a held member (S0084, S0060) now stay as they are; the in-scope list is finished.
- **Records fine:** the reviewer logged in as survivors and found "the rest of the information with the merges looked good". The two sets she opened for paperwork (S0023, S0075) have correct data: Contact `Client__c` true, `Prospect__c` false, one Rider with `Paperwork_Complete__c` true and `Type_of_Contact__c` Client, and a 2027 `Client` waiver created on 2026-11-19 by the site with `Program_Type__c = Riding`, so the carry-over ran and the Service Type screen was skipped. Neither user has a `LastLoginDate` (login-as does not set it).
- **What she saw as "new client paperwork" is the Screening Questions card.** It is shown to every client every year, not a merge or carry-over effect: see [[concepts/site-yearly-waiver]], "Screening Questions card". Hiding it for everyone but Prospects was deployed on 2026-11-23 (LWC `returnClientMenu` only, deploy `0Afj10000002CMrCAM`); she should re-open S0023 and S0075 to confirm it is gone.
- **Recycle Bin:** the pilot's merged-away records expire 2026-11-27, the 13 sets' on 2026-12-03.

## What the pilot taught

- `Database.merge` of Accounts and Contacts worked for portal-user Contacts, a three-way set and an Account with three other Contacts; no fallback was needed.
- Merging deletes, with no copy on the survivor: Plauti `dc3Duplicate__c` pair rows, NPSP `Address__c` rows of the merged-away household, Chatter posts/comments on the merged-away Contact (mostly `TrackedChange`) and `EmailMessageRelation` rows. Everything else moved.
- No flow rewrote a patched field. Record-triggered flows on Contact/Account only set the county from the postal code (no email).
- Archived Tasks and Events are not returned by the backup queries (their `TaskRelation` rows are).
- Merged-away records stay in the Recycle Bin for 15 days with `MasterRecordId`; the local backup is the lasting copy.
