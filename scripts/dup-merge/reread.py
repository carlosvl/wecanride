#!/usr/bin/env python3
"""Read-only: one line per duplicate set, from a batch backup, with no names or emails.

  python3 scripts/dup-merge/reread.py [batch]    # default batch: rest15

Reads backups/dup-merge/<batch>/ (sets.json, S####/*.json, payloads/, conflicts.csv) and prints what each
merge would touch: login state, flags before/after, Riders and their waivers, Volunteer_Info, classes by
status, donations, lookups that point at a member, and the fields whose values conflict. Sends nothing.
"""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "backups" / "dup-merge"
FLAGS = ("Client__c", "Volunteer__c", "Prospect__c")


def flags(c: dict) -> str:
    return ",".join(n[0] for n in FLAGS if c.get(n)) or "-"


def main() -> None:
    batch = (sys.argv[1:] + ["rest15"])[0]
    out = BASE / batch
    sets = json.loads((out / "sets.json").read_text())
    conflicts = defaultdict(list)
    for r in csv.DictReader((out / "conflicts.csv").open()):
        conflicts[r["set_id"]].append(r["field"])

    for s in sets:
        sid, d = s["set_id"], out / s["set_id"]

        def rows(label: str) -> list[dict]:
            p = d / (label.replace(">", "__") + ".json")
            return json.loads(p.read_text()) if p.exists() else []

        contacts = {c["Id"]: c for c in rows("Contact")}
        accts = {a["Id"]: a for a in rows("Account")}
        master = s["survivor"]
        order = s["members_oldest_first"]
        tag = {i: ("KEEP" if i == master else "gone") for i in order}
        payload = json.loads((out / "payloads" / f"{sid}.json").read_text())
        patch = payload["patchContact"] or {}
        after = {n: patch.get(n, contacts[master][n]) for n in FLAGS}

        print(f"\n{sid}  members(oldest first): " + " | ".join(
            f"{tag[i]} created {contacts[i]['CreatedDate'][:10]} flags {flags(contacts[i])}" for i in order))
        print(f"   survivor flags after merge: {flags(after)}"
              f"   | contact fields patched {max(len(patch) - 1, 0)}"
              f"   | account patched {bool(payload['patchAccount'])}"
              f"   | conflicting fields: {', '.join(sorted(set(conflicts[sid]))) or 'none'}")
        for u in rows("Contact>User.ContactId"):
            print(f"   login: active={u['IsActive']} last login {(u.get('LastLoginDate') or 'never')[:10]}"
                  f" type={u.get('UserType')}  (survivor {'yes' if u['ContactId'] == master else 'NO'})")

        per = lambda label, f: Counter(r[f] for r in rows(label))
        who = lambda i: tag[i]
        riders = rows("Contact>Riders__c.ClientContact__c")
        for r in riders:
            ws = [w for w in rows("Contact>Riders__c.ClientContact__c>VolunteerWaiver__c.Client__c") if w["Client__c"] == r["Id"]]
            yrs = Counter(f"{w['Year__c']}{'+prog' if w.get('Program_Type__c') else ''}" for w in ws)
            print(f"   rider on {who(r['ClientContact__c'])}: created {r['CreatedDate'][:10]}, "
                  f"type {r.get('Type_of_Contact__c')}, waivers {dict(sorted(yrs.items())) or 'none'}")
        vi = rows("Contact>Volunteer_Info__c.Volunteer_Name__c")
        if vi:
            vw = rows("Contact>Volunteer_Info__c.Volunteer_Name__c>VolunteerWaiver__c.Volunteer__c")
            print("   volunteer info: " + ", ".join(
                f"{who(v['Volunteer_Name__c'])} (waivers {dict(sorted(Counter(w['Year__c'] for w in vw if w['Volunteer__c'] == v['Id']).items())) or 'none'})"
                for v in vi))
        vc = rows("Contact>Volunteer_Class__c.Contact__c")
        if vc:
            by = Counter((who(c["Contact__c"]), c.get("Status__c")) for c in vc)
            print("   classes by contact/status: " + ", ".join(f"{k[0]} {k[1]}={n}" for k, n in sorted(by.items())))
        opp = rows("Contact>Opportunity.ContactId") + rows("Contact>Opportunity.npsp__Primary_Contact__c")
        if opp:
            by = Counter(who(o.get("ContactId") or o["npsp__Primary_Contact__c"]) for o in {o["Id"]: o for o in opp}.values())
            print("   donations: " + ", ".join(f"{k}={n}" for k, n in sorted(by.items())))
        for label, f, what in (("Contact>Riders__c.Emergency_Contact__c", "Emergency_Contact__c", "emergency contact"),
                               ("Contact>Riders__c.Mother_Name__c", "Mother_Name__c", "mother/guardian")):
            for r in rows(label):
                print(f"   a Rider uses the {who(r[f])} Contact as {what}")
        for a in accts.values():
            n = sum(1 for c in rows("Account>Contact.AccountId") if c["AccountId"] == a["Id"])
            members_here = sum(1 for i in order if contacts[i]["AccountId"] == a["Id"])
            kind = "survivor" if a["Id"] == payload["masterAccount"] else "other"
            print(f"   {kind} household: {n} contact(s), {members_here} are in this set")
        print(f"   other records on the members: relationships={len(rows('Contact>npe4__Relationship__c.npe4__Contact__c')) + len(rows('Contact>npe4__Relationship__c.npe4__RelatedContact__c'))}"
              f" plauti-duplicates={len(rows('Contact>dupcheck__dc3Duplicate__c.dupcheck__MatchContact__c')) + len(rows('Contact>dupcheck__dc3Duplicate__c.dupcheck__SourceContact__c'))}"
              f" emails={len(rows('Contact>EmailMessageRelation.RelationId'))} tasks={len(rows('Contact>TaskRelation.RelationId'))}")


if __name__ == "__main__":
    main()
