---
title: Site yearly waiver (returning clients)
type: concept
category: community-site
sources:
  - force-app/main/default/classes/ReturnClientMenuController.cls
  - force-app/main/default/classes/ReturnClientMenuControllerTest.cls
  - force-app/main/default/lwc/returnClientMenu/returnClientMenu.js
  - force-app/main/default/lwc/returnClientMenu/returnClientMenu.html
  - force-app/main/default/lwc/returnClientPayment/returnClientPayment.js
  - force-app/main/default/lwc/returnClientEmergencyTreatment/returnClientEmergencyTreatment.js
  - scripts/dup-merge/assess_clients.py
  - scripts/dup-merge/backfill_waivers.py
  - scripts/apex/backfill-current-waivers.apex
last_verified: 2026-11-23
status: current
tags: [community, site, waiver, lwc, deploy]
---

# Site yearly waiver (returning clients)

How the `client` Experience site builds each client's paperwork for the year, and what was deployed on 2026-11-16. Context: [[concepts/duplicate-merge-rules]] (why this came up), [[riders]], [[community-access]].

## How the site builds the year

- LWC `returnClientMenu` plus 20 `returnClient*` children, Apex `ReturnClientMenuController` (`without sharing`). `WaiverYear__mdt` "Client Current Year" is 2027 on 2026-11-16.
- `getClientData(contactId)` takes the Contact's Rider (`LIMIT 1`, unordered) and the `Client` record-type waiver for the current year, and **creates a blank one when none exists**.
- The LWC skips the Service Type screen only when the waiver already has `Program_Type__c`. A blank waiver has none, so every returning client started 2027 on that screen with every form "Not Started".
- A form counts as complete from its **stamp field** (`buildCompletionMap`, for example `Main_Info__c = 'Completed'`), not from answers being present. Copying answers without stamps therefore leaves every form "Not Started". Only `returnClientScreeningQuestions` prefilled from the waiver before this work.

## Where last year's answers are

- `Yearly_Forms` (returning clients) and `New_Registration` (new clients) record types hold the answers.
- `Client` record-type waivers hold stamps and consent children and are almost empty of answers (4 non-blank insurance/payer records in 2026). 613 of 619 prior `Client` waivers have no `Program_Type__c`, because Mental Health is new.
- Volunteer record types (`Volunteer`, `Yearly_Forms_Volunteers`, `New_Registration_Volunteer`) are never client history.
- 2026 waiver counts: Client 370, New_Registration 73, Yearly_Forms 124, Yearly_Forms_Volunteers 55.

## Deployed 2026-11-16: year and Client/Prospect label (Stage 1)

The menu heading shows the waiver year; a badge and a banner say `Client paperwork` or `Prospect paperwork` from the opened Contact's flags (`getClientData` now selects `Volunteer__c, Client__c, Prospect__c`). It is read-only display: no record is written. Check-only `0Afj10000001WFZCA2`, quick deploy `0Afj10000001WKPCA2`, 49 tests, 0 failures, about 77% coverage; a fresh retrieve matched the repo copy.

## Deployed 2026-11-16: skip Service Type and copy last year's answers (Stage 2)

Controller, test class and LWCs `returnClientEmergencyTreatment` and `returnClientPayment`. Check-only `0Afj10000001WNdCAM` (54 tests, 0 failures, about 78.7% coverage), quick deploy `0Afj10000001WaXCAU`, Succeeded. A fresh retrieve matched the validated files (the test class differs by a trailing newline only); repo `force-app` now equals the org. `scripts/site-staged/returning-client-carry-over/` is a leftover duplicate and can be deleted.

- **When it runs:** only in the branch that creates the missing current-year waiver (`carryOverFromPriorYears`, before the insert). An existing waiver is never touched.
- **Source:** the Rider's prior-year, non-volunteer waivers with a numeric year below the current one. The newest prior year that has any answer is used **as a whole**; values are not mixed across years. The first non-blank value per field within that year wins.
- **What is copied (40 answer fields, list in `CARRY_OVER_FIELDS`):** health insurance company and policy, medications, allergies, the payer (4) and third-party payer (4) fields, and the screening answers (surgical history, mobility, strength, communication, behavior, sensory needs, interests, riding goals and similar).
- **Not copied:** stamps and completion fields, dates, signatures, consents, `Diagnoses__c` (`UpdateDiagnosis` writes it to the Rider). Nothing is marked completed, so every form still shows "Not Started" and the family reviews and signs each one.
- **Service Type screen:** `Program_Type__c = 'Riding'` is set when there is prior paperwork, so the chooser is skipped. If any prior waiver was `Mental Health`, or there is no prior paperwork, the chooser still shows. `Rider.Program_Type__c` is not set by the skip.
- **LWC prefill:** `returnClientEmergencyTreatment` fills insurance company, policy number, medications and allergies; `returnClientPayment` fills the payer fields, splits the stored multi-line address into street/city/state/zip, and fills the third-party fields only when a third-party payer name exists. The signature is never prefilled.
- **No email side effects:** `Screening_Scheduled_Email` and `Screening_Complete_Email` act only on `New_Registration`, which this never creates.
- **Only new waivers:** a current-year waiver that already exists is never touched, so clients who opened the site before the deploy keep a blank one (see [[reports/client-login-assessment-2026-11-16]]).
- **Limits:** no runtime test in prod (no DML rehearsal); only Riding is defaulted; Mental Health returners still pick. LWC code is covered by a node check of `splitAddress` only (jest is not installed in the repo).

## Screening Questions card shows for every client (found 2026-11-23)

- **What happens.** `RIDING_FORM_STEPS` marks `screeningQuestions` `conditional: 'newClient'` ("one-time intake"), but the filter in `visibleSteps` is `!status || status === 'Not Started' || status === 'Completed'`, and `buildCompletionMap` only ever returns `Completed` or `Not Started` (from the **current-year** waiver's `Screening__c`). The test is therefore always true: the card appears for every Client, new or returning, in every year. A new year's waiver starts with `Screening__c` blank, so it reads "Not Started" and "Start" even for a client who finished screening years ago.
- **How it was noticed.** A reviewer logged in as two returning clients (merged sets S0023 and S0075) and saw it as "new client paperwork", because the card is part of the new-client intake. Their data was right: Client flag, Rider, and a 2027 `Client` waiver created 2026-11-19 with `Program_Type__c = Riding` (carry-over ran, Service Type skipped). One of them has `Screening__c = Completed` on two 2025 waivers (`New_Registration` and `Yearly_Forms`); the other has no completed screening on any waiver (client since 2016, earlier paperwork).
- **Not caused by** the merge, the carry-over or the Stage 1 label. Carry-over copies the screening answers but never the stamp, by design.
- **Investigation (2026-11-23, read-only; all 21 `returnClient*` bundles and the `client1` site retrieved into a scratch project outside the repo).** The repo copies of `returnClientMenu`, `returnClientEmergencyTreatment` and `returnClientPayment` equal the org; the other 18 bundles are not in the repo.
  - The `visibleSteps` filter in `returnClientMenu.js` is the **only** new-client gate in the LWCs. No child bundle tests Client/Prospect or a prior year. Nothing server-side requires screening either: `submitApplication` counts 11 relevant keys and leaves `screeningQuestions` out.
  - The card is also in the menu's `requiredSteps`, so for a Client the menu shows "Complete 1 more form(s) to submit" until screening is redone each year (the server would accept the submit without it).
  - Pages: the Client and Prospect variations of the Contact Detail route (`clientDetail`, `clientProspect`) both embed `c:returnClientMenu`; the other flow-based path (`Client_Registration`, `New_Client_Menu`, `New_Client_Diagnosis`, all Active) is only reached from the Register page, not from any menu page of `client1`.
  - **The bug is already in the data.** Waivers with `Screening__c = Completed` on a Rider of a current Client: 98 `New_Registration`, **55 `Yearly_Forms`**, 6 `Client`. The 55 and the 11 completed on 2027 `Client` waivers (the current cycle) are returning people redoing a one-time form. Riders by their Contact's flags: 310 Client, 152 Prospect, 195 Volunteer, 415 with no flag.
- **Fix, deployed 2026-11-23 (rule from the owner: the card is for Prospects only; once a Contact is a Client it never returns).** In `visibleSteps`, `if (step.conditional === 'newClient') return this.contact?.Prospect__c === true;` replaced the always-true status test. `getClientData` already returns `Contact.Prospect__c` (Stage 1), so it is an LWC-only change: no Apex, no data, no tests run or required (no Apex touched). Deploy `0Afj10000002CMrCAM`, Succeeded, 1 component, rolled back on error; a re-retrieve of the bundle equals the repo copy. Not yet seen by a real user: no browser test, and the repo has no jest. Effects: Clients, Volunteers and Contacts with no flag never see it and "X of N forms" drops by one; a Prospect still sees it, as Completed (Review) once done. A Prospect who finished it in an earlier year and is still a Prospect sees it again in the new year, prefilled by the carry-over. Staff converting a Prospect to Client (`Convert_Prospect_to_Client`) is what removes it.

## Duplicate current-year waivers (get-or-create race), found 2026-11-17

- **What counts as a duplicate.** Waivers of record type `Client` and year 2027 are not all parents: `ConfidentialityHIPPA` and `TherapyCancellationPolicy` rows are legitimate signed children created by the save methods. A real duplicate is two rows with template `ClientWaiver` on one Rider. (The first count, "16 of 20 Riders with 2 to 4 rows", mixed the two and was wrong.)
- **Count on 2026-11-17 (all Riders, read-only):** 60 Riders have a 2027 `Client` waiver (103 rows: 87 `ClientWaiver`, 9 HIPPA, 7 cancellation policy); **27 Riders have 2 parents**. 23 pairs were created in the **same second** and 1 one second apart, all by community users (2026-11-02 to 2026-11-16, the last at 20:06Z); 3 are far apart (76 minutes, 6.5 days, 65 days) and are not this race. The site's find-or-create is not atomic, so two page loads at once insert two.
- The site reads the oldest (`ORDER BY CreatedDate ASC LIMIT 1`), but `CreatedDate` has second precision, so a tie was arbitrary.
- Pre-existing, not caused by the carry-over. The code already had a "re-check with `FOR UPDATE`" before the insert, but it locked waiver rows and none existed yet, so it locked nothing.
- **Fix, deployed 2026-11-17** (quick deploy `0Afj10000001aSrCAI`, Succeeded; a re-retrieve equals the repo, the test class differs by a trailing newline only): `getClientData` now locks the Rider row (`SELECT ... FROM Riders__c WHERE Id = :id FOR UPDATE`) before re-checking, so a second page load waits for the first one's commit and then finds its waiver. Both lookups share `oldestCurrentWaiverId` (`ORDER BY CreatedDate ASC, Id ASC`), so a same-second tie resolves the same way on every load. Check-only `0Afj10000001ZyDCAU`: 55 tests, 0 failures, about 78.7% coverage; new test `testDuplicateCurrentYearWaiversPickTheOldestThenLowestId`. The lock itself cannot be tested in Apex (no concurrency), so it has no runtime proof.
- Existing duplicates are left alone (nothing deleted). **No Rider has answers hidden:** with the site's exact pick (`ORDER BY CreatedDate ASC, Id ASC`) applied to all 60 Riders, 28 have one waiver, 12 have input only on the pick, 11 have input on the pick and on another row (the identical backfilled pairs), 9 have no input anywhere, and **0 have the pick blank while another row holds input**. The "one Rider with answers on a newer duplicate" seen before the `Id` tie-break was that tie case, so no answers were copied.
- **Not yet exercised by a real user:** since the race fix (15:39Z) the only waivers created were two child rows (HIPPA, cancellation policy); no new parent was created, and none between the carry-over deploy (2026-11-16 22:57Z) and the race fix. Watch for a new same-second pair of `ClientWaiver` rows after the next first visit, and for a carried-over waiver with answers.

## Backfill of the 15 blank 2027 waivers (applied 2026-11-17)

`scripts/dup-merge/backfill_waivers.py` (`plan|check|rehearse|real|verify`) with `scripts/apex/backfill-current-waivers.apex` applies the same carry-over to waivers created before the deploy. Plan: 26 waivers on 15 Riders (every waiver tied for oldest is filled); 3 more are skipped because another 2027 waiver of the same Rider holds user input. Per waiver it fills only blank answer fields, sets `Program_Type__c = Riding` when blank, never writes a stamp, skips a form group whose stamp is already `Completed`, and runs in 2 batches because anonymous Apex rejects a larger script. Backup of the 26 waivers and the payload: `backups/dup-merge/backfill-1117/` (git-ignored, personal data). `check` (no DML on waivers) passed all 26 guards in the org. The user ran `rehearse` on 2026-11-17 (real updates, then rolled back): both batches ok, 26 of 26 `valuesAsPlanned` and `stampsUnchanged`, 22 + 6 DML statements. The log shows 3 `Flow:VolunteerWaiver__c` code units per waiver, which are the 3 active after-save flows being evaluated; none can match (the two `Screening_*_Email` flows need record type `New_Registration`, `UpdateDiagnosis` needs `Diagnoses__c` to change, and the backfill touches neither). **Applied 2026-11-17** by the user: both batches `COMMITTED ok=true` (26 waivers updated, every value as planned, no stamp changed) and `verify` reported 26 checked, 0 mismatches. Rerunning `plan` would overwrite the backup, so do not; the pre-change values stay in `waivers-before.json` (see [[reports/client-login-assessment-2026-11-16]]).

## Deploying to prod from this setup (what worked)

- A direct `sf project deploy start` is rejected: prod needs tests, and the permission layer blocks a blind apply.
- Working path: `sf project deploy start --dry-run -o WCRProd --source-dir <dirs> --test-level RunSpecifiedTests --tests ReturnClientMenuControllerTest`, then `sf project deploy quick --job-id <id>`.
- The CLI errors with `EPERM` on `~/.sf` in the sandbox, but the server job is still submitted. Find it with Tooling `SELECT Id, Status, CheckOnly, CreatedDate FROM DeployRequest ORDER BY CreatedDate DESC` and poll `/services/data/v62.0/metadata/deployRequest/<id>?includeDetails=true`. Set `SF_DISABLE_LOG_FILE=true`.
- Verify by re-retrieving into a scratch project (it needs an existing `force-app/main/default`) and diffing against the repo.
- `Main_Info__c` exists on `VolunteerWaiver__c` but is invisible to the CLI user's REST describe and SOQL (no field-level security), and **dynamic SOQL in anonymous Apex fails on it with "No such column"** (checked 2026-11-17); only the deployed controller's static SOQL reads it. Other fields were not checked for the same. Long-text fields cannot be used in SOQL `COUNT`.
