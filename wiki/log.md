# Wiki Log

Append-only timeline of wiki operations. Parse with: `grep "^## \[" wiki/log.md | tail -5`

## [2026-11-23] fix | Screening Questions card: Prospects only (deployed)

- Summary: [[concepts/site-yearly-waiver]]
- Updated: [[concepts/duplicate-merge-rules]]
- Notes: On the owner's go-ahead, `returnClientMenu.js` `visibleSteps` now shows the `newClient` card only when `Contact.Prospect__c` is true (was always true). LWC only, deployed alone through the Salesforce DX MCP server: `0Afj10000002CMrCAM`, Succeeded, 0 tests run. A re-retrieve of the bundle equals the repo copy. No data changed. Not yet seen by a real user; the reviewer should re-open S0023 and S0075 (card gone) and a Prospect (card still there) without completing any screen. Hidden too for Volunteers and for the 415 Riders whose Contact has no flag. Done by hand rather than through the `slds-builder` agent because it was a one-line change to a deployed component.

## [2026-11-23] query | LWC investigation: new-client Screening Questions card

- Summary: [[concepts/site-yearly-waiver]]
- Notes: Read-only. Retrieved the org's 21 `returnClient*` LWCs and the `client1` site into a scratch project outside the repo. The always-true `visibleSteps` filter in `returnClientMenu` is the only new-client gate; no child component or Apex method requires or checks it. 55 `Yearly_Forms` waivers and 11 current-cycle `Client` waivers on current Clients already carry `Screening__c = Completed`, i.e. returning people redid it. Fix per the owner's rule (Prospects only): LWC-only change, not built or deployed yet.

## [2026-11-23] query | Review of the 13 merged sets; S0060 answered; Screening Questions card

- Summary: [[concepts/duplicate-merge-rules]], [[concepts/site-yearly-waiver]]
- Notes: Read-only. S0060 stays unmerged (answer received), so S0084 and S0060 are the only in-scope sets left as they were. The reviewer found the merged records good; for two returning clients (S0023, S0075) she saw the Screening Questions card and took it for new-client paperwork. Their Contact, Rider and 2027 waiver (`Program_Type__c = Riding`, carry-over ran) are correct. Cause: the LWC "new client only" filter on the card is always true, so every client sees it every year (the stamp is per-year and a new waiver starts blank). Fix proposed, not built. No data changed, nothing deployed. The `sf` CLI could not refresh its session in the sandbox (`EPERM` on `~/.sfdx`) and an unsandboxed retry was denied, so the queries ran through the Salesforce DX MCP server.

## [2026-11-18] fix | Duplicate Contact merge: 13 more sets committed

- Summary: [[concepts/duplicate-merge-rules]]
- Notes: The user ran `real` for the 13 approved sets (S0062 with `Volunteer__c` ticked) and `review.py rest15`. All 13 merged, login users unchanged, losers gone, 12 sets clean. S0056 differs from the plan in one field: NPSP re-applied the household's default street after commit (equals the survivor's own value); its duplicate relationship pair was collapsed by NPSP. S0084 left unmerged and S0060 held, so they stay as they were. `review.py` now skips sets with no real-run log (it reported the two unmerged sets as failures). Merged-away records are in the Recycle Bin until 2026-12-03. Total merged so far: 8 pilot + 13.

## [2026-11-18] fix | Rehearsal of the 13 approved sets: all OK, rolled back

- Summary: [[concepts/duplicate-merge-rules]]
- Notes: The user ran `build_merge_apex.py rehearse rest15` for the 13 sets (with the S0062 `Volunteer__c` override) after `verify` passed. All 13 OK: merges ok, no field differs after update, login active with same username and email, 0 merged-away Contacts or Accounts left, at most 5 DML and 1.5s CPU. Automation fired is the same in every set that updates a Contact (3 Contact flow units and 1 workflow more than a set with no Contact update); S0062 matches, so its tick adds nothing of its own. Rollback done, nothing committed. The rehearsal state files match the current payload shas. The real run was not started in this entry.

## [2026-11-17] fix | Sign-off received for the 15 sets; verify blocker fixed; merge tooling ready

- Summary: [[concepts/duplicate-merge-rules]]
- Notes: Answers: merge 13 sets, S0084 left unmerged, S0060 contradictory (merge-with-two-Volunteer-records vs hold) so held, S0062 gets `Volunteer__c` ticked, S0108 keeps weight 220 and S0082 keeps 79 (both already the plan). `backup.py verify` was failing because the project's `sourceApiVersion 55.0` made the CLI query at an API where `ApplicationForm`, `ContactPointOttSvc` and `EmailMessage.FromId` do not exist; `common.py` now pins `SF_ORG_API_VERSION=68.0` and `verify rest15` passes (801 queries). New `build_merge_apex.py --set SET:Field=true|false` carries the S0062 decision inside the payload. `plan` re-checked: S0062 patches `Volunteer__c`, the weights are as decided. Nothing merged yet: the rehearsal and real run are for the user to start.

## [2026-11-17] review | Review document for the 15 remaining duplicate sets

- Summary: [[concepts/duplicate-merge-rules]]
- Notes: New read-only `scripts/dup-merge/review_doc.py rest15` writes `backups/dup-merge/rest15/for-review.md` and `.html` (git-ignored: names, phones, addresses) for Mary's sign-off. Per set: people, households, Riders, Volunteer records and classes by full Lightning URL (all 60 Contacts and Accounts covered), the values that disagree with what is kept, and a decision box. Five decisions: S0084 (12 possible confirmation emails; suggested: fix the flow first), S0060 (two Volunteer records), S0007 (same person as the guardian Contact?), S0062 (tick Volunteer?), S0108/S0082 (which weight). Not sent to Mary; nothing merged.

## [2026-11-17] review | Re-read of the 15 remaining duplicate sets; duplicate-waiver counts corrected

- Summary: [[concepts/duplicate-merge-rules]], [[concepts/site-yearly-waiver]]
- Notes: Read-only. The 15 in-scope sets are unchanged since 11-12 (new batch `rest15` backed up; `plan` shows 14 buildable, S0084 held for 12 re-sent confirmation emails; S0060 would leave two `Volunteer_Info__c`). `backup.py verify` currently fails on objects the API stopped answering, so no merge can start. Correction to the entry below and the backfill entry: only `ClientWaiver` rows are duplicates (27 of 60 Riders have two, 23 same-second pairs, none since the race fix); HIPPA and cancellation-policy rows are legitimate children. With the `Id` tie-break no Rider has answers hidden, so nothing was copied. Added `find_candidates.py --out` and `reread.py`. No org data changed.

## [2026-11-17] fix | Duplicate current-year waiver race: fix deployed

- Summary: [[concepts/site-yearly-waiver]]
- Notes: `getClientData` now locks the Rider row before the get-or-create re-check (the old `FOR UPDATE` on waiver rows locked nothing) and orders ties by Id. Check-only `0Afj10000001ZyDCAU` passed (55 tests, 0 failures, about 78.7% coverage). Quick-deployed as `0Afj10000001aSrCAI` (Succeeded); a re-retrieve matches the repo. No data changed; existing duplicate waivers untouched.

## [2026-11-17] fix | Backfill blank 2027 Client waivers: applied

- Summary: [[concepts/site-yearly-waiver]], [[reports/client-login-assessment-2026-11-16]]
- Notes: Built `backfill_waivers.py` + `backfill-current-waivers.apex` for the 15 Client Riders whose 2027 waiver is blank although earlier answers exist (26 waivers; 3 skipped because another waiver of the Rider holds input). Pre-change backup and payload are in `backups/dup-merge/backfill-1117/`. The read-only `check` passed all live guards in 2 batches (the first attempt hit the anonymous Apex size limit, and `Main_Info__c` cannot be read by dynamic SOQL there, so it is no longer in the stamp comparison). The permission layer blocked my DML runs; the user ran the rehearsal themselves (both batches ok, all values as planned, no stamp changed, rolled back, so still nothing written). The user then ran `real`: both batches committed (26 waivers on 15 Riders), `verify` 0 mismatches. The 3 other waivers (a Rider whose other 2027 waiver holds input) were left alone, and the duplicate-waiver race is still open. Also found: 27 of the 60 Riders with a 2027 `Client` waiver have two `ClientWaiver` parents (same-second creation by the site's find-or-create; HIPPA and cancellation-policy rows are legitimate children, so the first count of 16 of 20 was wrong). Fixed later the same day, see the race-fix entry above.

## [2026-11-16] fix | Deploy returning-client carry-over; assess Client logins with a Rider

- Summary: [[concepts/site-yearly-waiver]], [[reports/client-login-assessment-2026-11-16]]
- Updated: [[index]], [[concepts/duplicate-merge-rules]]
- Notes: Quick-deployed the validated Stage 2 job (`0Afj10000001WNdCAM`, deploy `0Afj10000001WaXCAU`): new current-year waivers now start with last year's answers and Riding as the program, nothing marked completed. Org retrieve matches the validated files; repo `force-app` synced. Assessment of the 77 Client Contacts with an active login and one Rider: all single-Rider, Client-only; 47 will get the carry-over on first visit, 10 have nothing to carry, 20 already had a 2027 waiver (15 of them blank with earlier answers available: backfill candidates, not done). 38 Riders still have `Paperwork_Complete__c` false but only 2 have a completed 2026/2027 Client waiver. No data changed. No further sets merged; 15 stay on hold.

## [2026-11-16] fix | Deploy UpdateContact guard and site year/label; stage returning-client carry-over

- Summary: [[concepts/site-yearly-waiver]], [[concepts/duplicate-merge-rules]]
- Updated: [[index]], [[reports/duplicate-contact-c2-account]]
- Notes: Deployed to prod: `UpdateContact` guard (Flow v4, Active; a Client or Volunteer is never set back to Prospect; metadata-verified only, the rollback rehearsal was blocked so there is no runtime proof) and Stage 1 of the site menu (year in the heading, Client/Prospect badge and banner; 49 tests, repo copy equals org). Stage 2 (skip the Service Type screen, copy last year's answers into the new waiver, complete nothing) is built and check-only validated (54 tests, about 78.7% coverage) but NOT deployed; files in `scripts/site-staged/returning-client-carry-over/`. `review.py` rerun on the pilot batch passed its checks. Exposure counts (146 Client / 140 Volunteer Riders with `Paperwork_Complete__c` false) recorded with an optional cleanup that needs staff sign-off; no data updated. No further sets merged; 15 stay on hold.

## [2026-11-16] fix | Pilot follow-up: Rider collapse, Client restore, why clients flip to Prospect

- Summary: [[concepts/duplicate-merge-rules]], [[reports/duplicate-contact-c2-account]]
- Updated: [[index]]
- Notes: Root cause of "client marked Prospect" is the active `UpdateContact` flow (Rider after-save, no entry filter): any Rider save with `Paperwork_Complete__c` false sets Prospect and clears Client/Volunteer (146 Client and 140 Volunteer Riders exposed). Guard added to `force-app/.../UpdateContact.flow-meta.xml` (the repo copy was a stale Obsolete version, replaced by the org's v3 plus the guard); not validated or deployed, the check-only deploy was blocked. Collapsed the two Riders of one pilot set and restored one Contact to Client (stays fragile until the guard is live). New `collapse_riders.py` + `collapse-duplicate-riders.apex`. LWC year/label proposal recorded, not built. No further sets merged; 15 stay on hold.

## [2026-11-13] fix | Merge pilot review: what the site does with merged records

- Summary: [[concepts/duplicate-merge-rules]], [[reports/duplicate-contact-c2-account]]
- Updated: [[index]]
- Notes: Review of 5 pilot users said 4 still got new-client paperwork. Read-only check of the Experience site: page variation follows the login user's own Contact flags; the paperwork menu takes the first Rider (no ORDER BY) and the current-year (2027) `Client` waiver, creating a blank one, so every returning client starts a blank intake. Merge-related: the set with two Riders (pre-existing). One Prospect result came from the review login overwriting the records (restore from backup after Mary's re-test). `build_merge_apex.py` now holds sets that would leave 2+ Riders and flags the parent-login/child-client shape. No further sets merged; message to the reviewer drafted, not sent.

## [2026-11-12] fix | Duplicate Contact merge pilot (8 sets)

- Summary: [[concepts/duplicate-merge-rules]], [[reports/duplicate-contact-c2-account]]
- Updated: [[index]]
- Notes: Login Contact always survives, oldest data wins. 113 candidate sets: 23 in scope, 51 manual, 39 no login. Pilot of 8 backed up (801 export queries, 109 unqueryable pseudo-objects skipped; re-verified against the org before each run), rehearsed with rollback, then committed; all 8 merged, login users untouched. Rehearsal found the exclusive Client/Volunteer/Prospect validation rule. One set keeps two Riders for a manual merge. Remaining 15 in-scope sets wait for human review of the pilot.

## [2026-11-12] query | Duplicate Contact and "(C2)" account (Massie household)

- Summary: [[reports/duplicate-contact-c2-account]]
- Updated: [[index]]
- Notes: Read-only prod investigation. "(C2)" comes from the 2026-08-07 bulk Partner-user job (665 accounts, 419 partner users, one admin user), not from a flow. The lookalike Contact is the parent's registration Contact, renamed by the parent's community user on 2026-08-11. The bulk script is not in the repo.

## [2026-10-22] query | Constituent mailing and thank-you lists

- Summary: [[reports/constituent-mailing-and-thank-you-lists]]
- Updated: [[index]]
- Notes: Snapshot 2026-10-21. 953 mailing rows (153 clients, 192 volunteers, 712 donor people, 20 organizations). 2026 thank-you list is 101 rows because of a $300 tie. Email template recorded at `docs/outreach/constituent-lists-email.html` for maryn@wecanride.org. Send was not completed. Contact details stay in the CSV files.

## [2026-09-02] query | Volunteer class confirmation email burst

- Updated: [[volunteer-journey]]
- Notes: 113 Enrolled Volunteer_Class__c updates by Angel Maltby on 2026-09-01 21:00–22:30 UTC fired Volunteer_Confirmation_email (no IsChanged on Status). From org-wide angelm@wecanride.org. Example recipient: Gregory (Gregg) Peterson, Tuesday 5:00PM Group Therapeutic Riding 2026-09-22.

## [2026-08-26] query | Passkey login reset (Windows Hello)

- Summary: [[concepts/passkey-login]]
- Updated: [[index]]
- Notes: Internal login (`wecanride.my.salesforce.com`) can stick on passkey verification with no Set up now until Built-in Authenticators are deleted on the User. Device delete in Windows/Chrome is required but not sufficient.

## [2026-08-26] query | Community login license estimate (no-volunteer scenario)

- Summary: [[reports/community-login-license-estimate]]
- Updated: [[community-access]]
- Notes: If Volunteer-only users stop logging in, peak unique logins fall from 107 to 46; 80 CCP Login already owned is enough. Dual-flagged clients still counted.

## [2026-08-26] query | Community login license estimate

- Summary: [[reports/community-login-license-estimate]]
- Updated: [[community-access]], [[contact]], [[overview]]
- Notes: Last 6 months of LoginHistory (285 unique people, peak 107 in Aug MTD including deactivated). Recommend 160 Customer Community Plus Login licenses; do not 1:1 convert 500 Partner seats.

## [2026-08-10] fix | Parent/Guardian partner account root cause (Geyre Abdiqafar)

- Sources: Flow error email — `New_Client_Menu` → `Returning_Parent_Guardian` CreateFirstGuardian
- Updated: [[community-access]]
- Notes: Error recurred because `NewCommunityUser` re-flags household Accounts `IsPartner=true` on every registration (432 households re-flagged since the 2026-07-20 bulk clear). Fixed at the source: removed `Update_Account_NU` and `UpdateAccount` (and orphaned `Get_Account_Owner_ID` lookup) from `NewCommunityUser.flow-meta.xml`; switched `Get_License_Counts`/`GetProfileID` from `PID_Partner_Community_Login`/`WCR Community Login` to `PID_Customer_Community_Plus_Login`/`WCR Customer Community Plus Login`. `Returning_Parent_Guardian` itself was unchanged — it was never the cause.

## [2026-07-20] query | Parent/Guardian partner account (Braylen Lawson)

- Sources: Flow error — `Returning_Parent_Guardian` CreateFirstGuardian; Account `001UR00000swITmYAM`
- Updated: [[community-access]]
- Notes: Lawson Household `IsPartner=true` confirmed; cleared Lawson + bulk-cleared all partner Household Accounts (0 remaining).

## [2026-07-16] ingest | pre-commit

- Sources: Community_Returning_Flow_Access, WCR Customer Community Plus Login profile, Returning_Diagnosis.flow-meta.xml, sync/assign apex scripts
- Updated: [[community-access]], [[community-waiver-year-access]], [[flow-permissions]]
- Notes: auto-ingest before commit — Partner→CCP perm sync + diagnosis/schedule community fixes

## [2026-07-16] ingest | Partner → CCP profile access sync

- Sources: `WCR Community Login` (Partner Community Login) vs `WCR Customer Community Plus Login`
- Updated: [[community-access]]
- Notes: Ran `sync-community-plus-from-partner-profile.apex`; deployed profile + `Community_Returning_Flow_Access` with Class/Client_Class FLS, CMDT, Partner-aligned userPermissions (minus license-blocked). Remaining gaps: Lead, ActionPlanTemplate, TabSet only.

## [2026-07-16] query | Returning Schedule Selection (Lyn Fredrickson)

- Sources: Flow error email — `Returning_Schedule_Selection` Get_Registered_Classes
- Updated: [[community-access]]
- Notes: `Client_Class__c` not on Customer Community Plus Login; Lyn/Allyson/Mabel missing Community PS assignments. Deployed Class/Client_Class perms; re-ran assign-community-permissions.apex.

## [2026-07-16] query | New Client Menu flow errors (Mabel Klinker)

- Sources: Flow error emails — `Returning_Parent_Guardian` CreateFirstGuardian; `Returning_Diagnosis` get_diagnosis
- Updated: [[community-access]]
- Notes: Partner flag on household blocked Contact create; missing `diagnoses__c` perms on Customer Community Plus Login. Cleared Klinker IsPartner; deployed object/FLS + flow access.

## [2026-07-13] bootstrap | Initial wiki scaffolding

- Created AGENTS.md schema, raw/ and wiki/ directory structure
- Seeded: [[overview]], [[synthesis/architecture]], journey maps, key entity pages
- Seeded: [[manifests/flows-registry]], [[manifests/objects-registry]]
- Added CLI: `scripts/wiki/search.sh`, `scripts/wiki/lint.sh`
- Sources: Returning_Emergency permissions, New_Client_Menu WaiverYear error
- Updated: [[community-access]], [[flow-permissions]], [[community-waiver-year-access]]
- Notes: deployed WaiverYear__mdt type access to profile + Community_Returning_Flow_Access

## [2026-07-13] lint | Automated health check
- Report: [[reports/lint-2026-07-13]]
- Issues: 1

## [2026-07-13] lint | Automated health check
- Report: [[reports/lint-2026-07-13]]
- Issues: 0

## [2026-11-12] lint | Automated health check
- Report: [[reports/lint-2026-11-12]]
- Issues: 18

## [2026-11-12] lint | Automated health check
- Report: [[reports/lint-2026-11-12]]
- Issues: 18

## [2026-11-13] lint | Automated health check
- Report: [[reports/lint-2026-11-13]]
- Issues: 18

## [2026-11-13] lint | Automated health check
- Report: [[reports/lint-2026-11-13]]
- Issues: 18

## [2026-11-16] lint | Automated health check
- Report: [[reports/lint-2026-11-16]]
- Issues: 18

## [2026-11-16] lint | Automated health check
- Report: [[reports/lint-2026-11-16]]
- Issues: 18

## [2026-11-16] lint | Automated health check
- Report: [[reports/lint-2026-11-16]]
- Issues: 18

## [2026-11-16] lint | Automated health check
- Report: [[reports/lint-2026-11-16]]
- Issues: 18

## [2026-11-16] lint | Automated health check
- Report: [[reports/lint-2026-11-16]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-17] lint | Automated health check
- Report: [[reports/lint-2026-11-17]]
- Issues: 18

## [2026-11-18] lint | Automated health check
- Report: [[reports/lint-2026-11-18]]
- Issues: 18
