"""Read-only: assess Client Contacts that hold an active Experience Cloud login and own a Riders__c.

Prints counts only. Per-Contact rows go to backups/dup-merge/assess/clients.csv (git-ignored, personal data).
Run without `python3 -I` (sibling import of common.py).
"""

from __future__ import annotations

import csv
import pathlib
from collections import Counter, defaultdict

from common import query, soql_list

OUT = pathlib.Path(__file__).resolve().parents[2] / "backups" / "dup-merge" / "assess"
# Same list as ReturnClientMenuController.CARRY_OVER_FIELDS (answers a returning client re-uses).
ANSWERS = [
    "Health_Insurance_Co__c", "Insurance_Policy__c", "Current_medications__c", "Allergies_to_medications__c",
    "Payer__c", "Payer_Address__c", "Payer_Phone__c", "Payer_email__c", "Third_Party_Payer_Waiver_Name__c",
    "Third_Party_Address__c", "Third_Party_Contact__c", "Third_Party_email__c", "Surgical_History__c",
    "Allergies__c", "Vision_Hearing__c", "Head_movement_limitations__c", "Mobility__c", "Bench_sit_for_2_minutes__c",
    "Type_Description_of_Seizures__c", "Loss_of_balance_to_sudden_movement__c",
    "Postural_adjustments_with_weight_bearing__c", "Weight_bear_on_one_foot_w_assist__c", "Grasp_Strength__c",
    "Right_arm_strength__c", "Left_arm_strength__c", "Right_leg_strength__c", "Left_leg_strength__c",
    "Trunk_Strength__c", "Precautions_Limitations__c", "Communication_Skills__c", "Behavior__c",
    "Strong_Emotional_Oubursts__c", "Strong_Emotional_Oubursts_Desc__c", "Sensory_Needs__c", "Interests__c",
    "Excessive_risks_that_compromise_safety__c", "Riding_Goals__c", "Rider_Dislikes__c",
    "Previous_Riding_Experience__c", "Number_of_steps_followed_at_a_time__c",
]
# Stamp fields the site reads for "Completed" (Main_Info__c is not FLS-visible to the CLI user, so it is left out).
STAMPS = ["Client_Waiver__c", "Auth_for_Emerg_Med_Treatment__c", "Payer_Info__c", "Medical_History_Form_PL__c"]
VOLUNTEER_RTS = {"Volunteer", "Yearly_Forms_Volunteers", "New_Registration_Volunteer"}


def chunks(xs, n):
    xs = list(xs)
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def has(v) -> bool:
    return v is not None and str(v).strip() != ""


def main() -> None:
    year = query("SELECT Current_Year__c FROM WaiverYear__mdt WHERE MasterLabel = 'Client Current Year'")[0]["Current_Year__c"]
    print(f"current client waiver year: {year}")

    users = query("SELECT Id, ContactId, Profile.UserLicense.Name FROM User WHERE IsActive = true AND ContactId != null")
    lic = {u["ContactId"]: u["Profile"]["UserLicense"]["Name"] for u in users}
    print(f"\nA. active Experience Cloud users: {len(users)} ({len(lic)} distinct Contacts)")
    contacts = {}
    for ch in chunks(lic, 150):
        for c in query(f"SELECT Id, Client__c, Prospect__c, Volunteer__c FROM Contact WHERE Id IN ({soql_list(ch)})"):
            contacts[c["Id"]] = c

    def kind(c):
        return ("Client" if c["Client__c"] else "") + ("Prospect" if c["Prospect__c"] else "") + \
               ("Volunteer" if c["Volunteer__c"] else "") or "none"
    print("   flags x license:", dict(Counter((kind(c), lic[i]) for i, c in contacts.items())))

    clients = [i for i, c in contacts.items() if c["Client__c"]]
    print(f"\nB. Client Contacts with an active login: {len(clients)}")
    riders = defaultdict(list)
    for ch in chunks(clients, 150):
        for r in query("SELECT Id, ClientContact__c, Paperwork_Complete__c, Type_of_Contact__c, Client_Status__c, "
                       f"CreatedDate FROM Riders__c WHERE ClientContact__c IN ({soql_list(ch)})"):
            riders[r["ClientContact__c"]].append(r)
    scope = [i for i in clients if riders[i]]
    print(f"   with a Rider: {len(scope)}; without any Rider: {len(clients) - len(scope)}")
    print("   Riders per Contact:", dict(Counter(len(riders[i]) for i in scope)))
    print("   license:", dict(Counter(lic[i] for i in scope)))
    print("   Contact flags also set:", dict(Counter(kind(contacts[i]) for i in scope)))

    all_riders = [r for i in scope for r in riders[i]]
    print(f"\nC. Riders in scope: {len(all_riders)}")
    print("   Paperwork_Complete__c:", dict(Counter(bool(r["Paperwork_Complete__c"]) for r in all_riders)))
    print("   Type_of_Contact__c:", dict(Counter(r["Type_of_Contact__c"] for r in all_riders)))
    print("   Client_Status__c:", dict(Counter(r["Client_Status__c"] for r in all_riders)))

    rid = {r["Id"]: r["ClientContact__c"] for r in all_riders}
    waivers = defaultdict(list)
    cols = ["Id", "Client__c", "Year__c", "RecordType.DeveloperName", "Program_Type__c", "Screening__c",
            "CreatedDate"] + STAMPS + ANSWERS
    for ch in chunks(rid, 60):
        for w in query(f"SELECT {', '.join(cols)} FROM VolunteerWaiver__c WHERE Client__c IN ({soql_list(ch)})"):
            waivers[w["Client__c"]].append(w)

    print(f"\nD. waivers, {year} `Client` waiver per Contact (Rider with the most forms completed counts)")
    rows = []
    stat = Counter()
    for cid in scope:
        ws = [w for r in riders[cid] for w in waivers[r["Id"]]]
        cur = [w for w in ws if w["Year__c"] == year and w["RecordType"]["DeveloperName"] == "Client"]
        prior = [w for w in ws if w["RecordType"]["DeveloperName"] not in VOLUNTEER_RTS and w["Year__c"]
                 and str(w["Year__c"]).isdigit() and int(w["Year__c"]) < int(year)]
        prior_answers = any(has(w[f]) for w in prior for f in ANSWERS)
        mh = any(w["Program_Type__c"] == "Mental Health" for w in prior)
        stamps_done = max((sum(w[f] == "Completed" for f in STAMPS) for w in cur), default=0)
        state = "no current waiver" if not cur else ("current: program type set" if any(has(w["Program_Type__c"]) for w in cur)
                                                      else "current: blank (no program type)")
        cur_answers = any(has(w[f]) for w in cur for f in ANSWERS)
        stat[state] += 1
        stat["prior-year answers exist"] += prior_answers
        stat["prior Mental Health"] += mh
        stat["current waiver already has answers"] += cur_answers
        stat["current waiver has a stamp completed"] += stamps_done > 0
        stat[f"carry-over path: {'will apply on first visit' if not cur and prior_answers else 'not applied automatically' if cur else 'nothing to carry'}"] += 1
        if cur and not cur_answers and prior_answers:
            stat["BACKFILL CANDIDATE: blank current waiver but answers exist from prior years"] += 1
        rows.append({"ContactId": cid, "License": lic[cid], "Riders": len(riders[cid]),
                     "PaperworkComplete": any(r["Paperwork_Complete__c"] for r in riders[cid]), "State": state,
                     "PriorAnswers": prior_answers, "PriorMentalHealth": mh, "CurrentAnswers": cur_answers,
                     "CurrentStampsDone": stamps_done, "PriorWaivers": len(prior)})
    for k, v in sorted(stat.items()):
        print(f"   {k}: {v}")

    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "clients.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"\nper-Contact rows: {OUT / 'clients.csv'} (local, git-ignored)")


if __name__ == "__main__":
    main()
