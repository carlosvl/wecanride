#!/usr/bin/env python3
"""Read-only: write a plain-language review document (markdown + html) for the staff who sign off a batch.

  python3 scripts/dup-merge/review_doc.py [batch]    # default batch: rest15

Reads backups/dup-merge/<batch>/ (sets.json, S####/*.json, payloads/, conflicts.csv) and writes
for-review.md and for-review.html next to them. Every record is listed by its full Lightning URL.
Holds names, phones and addresses: the folder is git-ignored, do not copy it into the repo.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "backups" / "dup-merge"
HOST = "https://wecanride.lightning.force.com/lightning/r"
FLAG = {"C": "Client", "V": "Volunteer", "P": "Prospect"}
LABEL = {
    "npe01__PreferredPhone__c": "Preferred phone", "Contact_Type__c": "Contact type",
    "weight_limit_exempt__c": "Weight-limit exempt", "MailingAddress": "Mailing address",
    "HasOptedOutOfEmail": "Opted out of email", "Weight__c": "Weight", "Height__c": "Height",
    "How_did_you_hear_about_us__c": "How they heard about us", "MobilePhone": "Mobile phone",
    "Client/Volunteer/Prospect": "Client / Volunteer / Prospect",
}
# Hand-written part: what a person has to decide, per set. Everything else is generated from the backup.
CALL = {
    "S0084": ("DECISION", "The other Contact owns 12 Enrolled class rows and the login Contact owns none, so today this "
              "volunteer does not see their own classes. Merging moves them, and the confirmation email may be sent "
              "again for each row (up to 12 emails, all for class dates already past). See decision 1."),
    "S0060": ("DECISION", "Both Contacts have their own Volunteer record. After a merge the login Contact would own two, "
              "and the volunteer menu may show either. See decision 2."),
    "S0007": ("CONFIRM", "The login Contact has no Client/Volunteer flag and no Rider. The 2021 Contact is named as "
              "emergency contact and mother/guardian on a Rider, and its household has two other people. See decision 3."),
    "S0062": ("CONFIRM", "Has Volunteer paperwork (2025) but the Volunteer box is not ticked, today and after the merge. "
              "See decision 4."),
    "S0108": ("CONFIRM", "Weights disagree (220 and 180) and both records were created the same day, so the rule had no "
              "older record to prefer. Weight matters for riding: please say which is right."),
    "S0082": ("CONFIRM", "Both records were created the same day; weight 79 or 80, please say which is right."),
    "S0063": ("MERGE", "The login Contact has no flag; it gains Volunteer from the other Contact."),
}


def url(obj: str, i: str) -> str:
    return f"{HOST}/{obj}/{i}/view"


def digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def by_year(ws: list[dict]) -> str:
    return ", ".join(f"{y}: {n}" for y, n in sorted(Counter(w["Year__c"] for w in ws).items())) or "none"


def day(r: dict) -> str:
    return r["CreatedDate"][:10]


def flags(c: dict) -> str:
    return ", ".join(FLAG[k] for k, f in (("C", "Client__c"), ("V", "Volunteer__c"), ("P", "Prospect__c")) if c.get(f)) or "none"


def flag_word(v: str) -> str:
    return "none" if v == "none" else "+".join(FLAG.get(ch, ch) for ch in v.split("+"))


def main() -> None:
    batch = (sys.argv[1:] + ["rest15"])[0]
    out = BASE / batch
    sets = json.loads((out / "sets.json").read_text())
    conflicts = defaultdict(list)
    for r in csv.DictReader((out / "conflicts.csv").open()):
        conflicts[r["set_id"]].append(r)

    names = {s["set_id"]: next(c["Name"] for c in json.loads((out / s["set_id"] / "Contact.json").read_text()) if c["Id"] == s["survivor"]) for s in sets}
    body, summary = [], []
    for s in sets:
        sid, d = s["set_id"], out / s["set_id"]

        def rows(label: str) -> list[dict]:
            p = d / (label.replace(">", "__") + ".json")
            return json.loads(p.read_text()) if p.exists() else []

        contacts = {c["Id"]: c for c in rows("Contact")}
        accts = {a["Id"]: a for a in rows("Account")}
        master = s["survivor"]
        order = s["members_oldest_first"]
        payload = json.loads((out / "payloads" / f"{sid}.json").read_text())
        patch = payload["patchContact"] or {}
        keep = contacts[master]
        who = lambda i: "KEEP" if i == master else "MERGED AWAY"
        status, note = CALL.get(sid, ("MERGE", ""))
        users = rows("Contact>User.ContactId")
        login = users[0] if users else {}

        L = [f"## {sid}: {keep['Name']}", ""]
        L.append(f"**Suggested: {'merge' if status == 'MERGE' else 'merge after your answer' if status == 'CONFIRM' else 'hold until you decide'}.**"
                 + (f" {note}" if note else ""))
        L += ["", "**People** (the KEEP record owns the login and survives; the other record is deleted after its data is moved):", ""]
        for i in order:
            c = contacts[i]
            extra = ""
            if i == master and login:
                extra = f"; login {'active' if login['IsActive'] else 'inactive'}, last login {(login.get('LastLoginDate') or 'never')[:10]}"
            L.append(f"- **{who(i)}**: {c['Name']}, created {day(c)}, {flags(c)}{extra}  ")
            L.append(f"  {url('Contact', i)}")
        emails = {i: (contacts[i].get("Email") or "").lower() for i in order}
        if len({e for e in emails.values() if e}) > 1:
            L.append("- **Email:** the two records differ. The login's email stays; the other is dropped (kept in the backup only): "
                     + "; ".join(f"{who(i)} {emails[i] or 'blank'}" for i in order))
        else:
            L.append("- **Email:** same on both records.")

        L += ["", "**Households** (the other household is folded into the KEEP household and its people follow):", ""]
        people = rows("Account>Contact.AccountId")
        for a in accts.values():
            tag = "KEEP household" if a["Id"] == payload["masterAccount"] else "household folded in"
            L.append(f"- **{tag}:** {a['Name']}  ")
            L.append(f"  {url('Account', a['Id'])}")
            others = [p for p in people if p["AccountId"] == a["Id"] and p["Id"] not in order]
            for p in others:
                L.append(f"  - also in this household (follows the merge): {p['Name']} {url('Contact', p['Id'])}")

        recs = []
        wv = rows("Contact>Riders__c.ClientContact__c>VolunteerWaiver__c.Client__c")
        for r in rows("Contact>Riders__c.ClientContact__c"):
            yrs = by_year([w for w in wv if w["Client__c"] == r["Id"]])
            recs.append(f"- **Rider** ({r.get('Type_of_Contact__c')}, created {day(r)}, waivers by year: {yrs}) on {who(r['ClientContact__c'])}: {url('Riders__c', r['Id'])}")
        vw = rows("Contact>Volunteer_Info__c.Volunteer_Name__c>VolunteerWaiver__c.Volunteer__c")
        for v in rows("Contact>Volunteer_Info__c.Volunteer_Name__c"):
            yrs = by_year([w for w in vw if w["Volunteer__c"] == v["Id"]])
            recs.append(f"- **Volunteer record** ({v.get('Status__c') or 'no status'}, created {day(v)}, waivers by year: {yrs}) on {who(v['Volunteer_Name__c'])}: {url('Volunteer_Info__c', v['Id'])}")
        for label, what in (("Contact>Riders__c.Emergency_Contact__c", "emergency contact"), ("Contact>Riders__c.Mother_Name__c", "mother/guardian")):
            for r in rows(label):
                recs.append(f"- A Rider uses the {who(r['Emergency_Contact__c'] if 'Emergency' in label else r['Mother_Name__c'])} Contact as {what}: {url('Riders__c', r['Id'])}")
        classes = rows("Contact>Volunteer_Class__c.Contact__c")
        if classes:
            by = Counter((who(c["Contact__c"]), c.get("Status__c")) for c in classes)
            recs.append("- **Classes:** " + ", ".join(f"{k[1]} on {k[0]}: {n}" for k, n in sorted(by.items())))
            if any(c["Contact__c"] != master and c.get("Status__c") == "Enrolled" for c in classes):
                for c in sorted(classes, key=lambda c: c.get("Class_Start__c") or ""):
                    if c["Contact__c"] != master:
                        recs.append(f"  - {c.get('ClassName__c') or c['Name']} ({(c.get('Class_Start__c') or '')[:10]}, {c.get('Status__c')}): {url('Volunteer_Class__c', c['Id'])}")
        opp = {o["Id"]: o for o in rows("Contact>Opportunity.ContactId") + rows("Contact>Opportunity.npsp__Primary_Contact__c")}
        if opp:
            by = Counter(who(o.get("ContactId") or o["npsp__Primary_Contact__c"]) for o in opp.values())
            recs.append("- **Donations:** " + ", ".join(f"{n} on {k}" for k, n in sorted(by.items())) + " (all end up on the KEEP Contact)")
        L += ["", "**Records that move or are affected:**", ""] + (recs or ["- none: no Rider, volunteer record, class or donation on either Contact."])

        diffs = []
        for r in conflicts[sid]:
            f, kept, drop = r["field"], r["kept"], re.sub(r"^#\d+: ", "", r["discarded"])
            if f == "MobilePhone" and any(x["field"] == "Phone" and x["kept"] == kept for x in conflicts[sid]):
                continue  # same pair as Phone
            name = "Household name" if r["object"] == "Account" else LABEL.get(f, f)
            if f == "Client/Volunteer/Prospect":
                kept, drop = flag_word(kept), flag_word(drop)
            same = f in ("Phone", "MobilePhone") and digits(kept) == digits(drop)
            diffs.append(f"- **{name}:** keeps `{kept}`, drops `{drop}`" + (" (same number, only the formatting differs)" if same else ""))
        L += ["", "**Where the two records disagree** (the older record's value is kept unless you say otherwise):", ""] + (diffs or ["- nothing important."])
        if patch:
            L.append(f"- The KEEP record also gets {max(len(patch) - 1, 0)} blank field(s) filled from the other record.")
        L += ["", "**Your decision:**", "", "- [ ] Merge as planned", "- [ ] Hold, do not merge", "- [ ] Merge, but change: ______________________", "", "---", ""]
        body += L
        summary.append(f"| {sid} | {keep['Name']} | {', '.join(flags(c) for c in [keep])} | "
                       f"{'Merge' if status == 'MERGE' else 'Merge after your answer' if status == 'CONFIRM' else 'Hold: decision needed'} |")

    head = f"""# Duplicate contacts: 15 sets for your review

Prepared 2026-11-17 for Mary. **Nothing has been merged.** Each set is two (or more) Contacts for the same person; one of
them owns the Experience Cloud login. The merge keeps that Contact, so the login always keeps working, and it moves the
other Contact's data into it. The other Contact goes to the Recycle Bin and can be restored for 15 days. Every record is
backed up before a merge. One technical check on my side (re-verifying the backup against the live org) still has to be fixed before I can run any merge; it needs no decision from you.

## How the merge decides
- The Contact with the login (KEEP) survives, always. Households: the other household is merged into the KEEP household.
- When both records have a value, the **older record's value wins**, blanks are filled from the newer one. Tell me per set
  if you want something different.
- Client, Volunteer and Prospect are exclusive: Prospect is dropped if the other record is a Client or a Volunteer.
- The login's email stays. If the other record had a different email it is dropped from the record (it stays in the backup).
- An opt-out of email on either record is kept.
- Plauti duplicate-pair rows, NPSP address rows and Chatter of the deleted record are deleted with it. Tasks, emails, donations, classes, relationships and Riders move.
- Links below open the record in Lightning. A merged-away Contact opens as "deleted" after the merge.

## Decisions needed

1. **S0084 ({names['S0084']}): the 12 class confirmation emails.** Today the volunteer sees none of their 12 Enrolled classes because
   they sit on the other Contact. Merging moves them, and the existing flow `Volunteer_Confirmation_email` fires on any update of an
   Enrolled row, so each moved row can send another "you are enrolled" email, up to 12, all for class dates already past (2026-03-09 to 2026-09-20).
   No earlier merge moved Enrolled rows, so I have not seen it happen; this is the cautious reading. Options:
   - [ ] **A (suggested):** change the flow first so it sends only when the status changes to Enrolled (a small change in production, made by Carlos), then merge. It also stops the re-send storm seen on 2026-09-01 (113 emails after a bulk edit).
   - [ ] B: merge now and accept the emails (tell the family first).
   - [ ] C: leave this set unmerged.
2. **S0060: two Volunteer records.** Both Contacts have one (the other one holds 2025 waivers, the KEEP one holds 2025 and 2026). Options:
   - [ ] **A (suggested):** hold; merge the two Volunteer records by hand or with a script first (tell me which one to keep), then merge.
   - [ ] B: merge now and live with two Volunteer records under one Contact.
   - [ ] C: leave this set unmerged.
   Also check the phone numbers in the S0060 section: the older record's number wins and it may not be the current one.
3. **S0007: is the login the same person as the 2021 Contact?** The 2021 Contact is the guardian on a Rider and its household has two other people who would join the login's household. If yes, merge.
   - [ ] Yes, same person, merge   - [ ] No / not sure, hold
4. **S0062: should this person be a Volunteer?** The record has 2025 volunteer paperwork but the Volunteer box is not ticked, before and after the merge.
   - [ ] Tick Volunteer after the merge   - [ ] Leave as is
5. **S0108 and S0082: which weight is right?** The two records of each set were created the same day, so "older wins" had nothing to go on (S0108 has 220 and 180, S0082 has 79 and 80). Weight matters for riding; see the Weight line in each set.
6. **The rest:** if you agree with the rule above, tick "Merge as planned" in each set; I merge only the sets you approve.

## Summary

| Set | Person | Flags on the KEEP Contact | Suggested |
|---|---|---|---|
""" + "\n".join(summary) + "\n\n---\n\n"
    md = out / "for-review.md"
    md.write_text(head + "\n".join(body))
    style = "<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;line-height:1.45}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}code{background:#f4f4f4}li{word-break:break-word}</style>"
    subprocess.run(["pandoc", "-f", "gfm", "-t", "html5", "-s", "--metadata", "title=Duplicate contacts: 15 sets for review",
                    "-V", f"header-includes={style}", "-o", str(out / "for-review.html"), str(md)], check=True)
    print(f"wrote {md} and for-review.html")


if __name__ == "__main__":
    main()
