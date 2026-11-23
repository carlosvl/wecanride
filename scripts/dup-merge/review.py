#!/usr/bin/env python3
"""Read-only: compare the live org with the backup after a real merge run.

  python3 scripts/dup-merge/review.py [batch]      # default batch: pilot

For every set: losers deleted with MasterRecordId = the login Contact, login user unchanged, patched fields
hold the planned values, and every child count under the survivor equals the backed-up sum (minus what the
payload deletes). Writes backups/dup-merge/<batch>/review.csv (personal data, git-ignored) and prints only
set ids, labels and counts.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import backup
from common import apex_run, query, soql_list

BASE = backup.BASE


def main(batch: str) -> None:
    out = BASE / batch
    man = json.loads((out / "manifest.json").read_text())
    # Held or unapproved sets were never run for real; reviewing them as merged only reports false failures.
    sets = [s for s in json.loads((out / "sets.json").read_text()) if (out / "runs" / f"{s['set_id']}.real.log").exists()]
    pay = {s["set_id"]: json.loads((out / "payloads" / f"{s['set_id']}.json").read_text()) for s in sets}

    def rows(sid: str, label: str) -> list[dict]:
        p = out / sid / (label.replace(">", "__") + ".json")
        return json.loads(p.read_text()) if p.exists() else []

    # Deleted records are only visible with ALL ROWS, which is Apex-only.
    gone = [i for p in pay.values() for i in p["otherContacts"] + p["otherAccounts"]]
    apex = out / "runs" / "review.apex"
    apex.write_text(
        "for (SObject r : [SELECT Id, IsDeleted, MasterRecordId FROM Contact WHERE Id IN (" + soql_list(gone) + ") ALL ROWS]) "
        "System.debug(LoggingLevel.ERROR, 'RESULT~' + r.Id + '~' + r.get('IsDeleted') + ' ' + r.get('MasterRecordId'));\n"
        "for (SObject r : [SELECT Id, IsDeleted, MasterRecordId FROM Account WHERE Id IN (" + soql_list(gone) + ") ALL ROWS]) "
        "System.debug(LoggingLevel.ERROR, 'RESULT~' + r.Id + '~' + r.get('IsDeleted') + ' ' + r.get('MasterRecordId'));\n")
    res = apex_run(apex)
    deleted = {i: m for i, m in re.findall(r"RESULT~(\w+)~([^\r\n]*)", res["logs"])}

    jobs = []  # (sid, label, parent object, parent id, before, expected)
    for s in sets:
        sid, p = s["set_id"], pay[s["set_id"]]
        for k, m in man["labels"].items():
            if m["error"] or k.count(">") != 1 or not rows(sid, k):
                continue
            parent, pid = (("Contact", p["masterContact"]) if k.startswith("Contact>") else ("Account", p["masterAccount"]))
            before = len(rows(sid, k))
            expected = before
            if k == "Account>Contact.AccountId":
                expected -= len(p["otherContacts"])
            if k == "Contact>Riders__c.ClientContact__c":
                expected -= len(p["riderDelete"])
            jobs.append((sid, k, m["obj"], m["field"], pid, before, expected))

    def after(j):
        return len(backup.fetch(j[2], j[3], [j[4]], ["Id"]))

    with ThreadPoolExecutor(6) as ex:
        counts = list(ex.map(after, jobs))

    table = []
    print("set    survivor-ok  losers-deleted  patched-fields-ok  login-ok  child-count-differences")
    for s in sets:
        sid, p = s["set_id"], pay[s["set_id"]]
        want = {f: v for f, v in (p["patchContact"] or {}).items() if f != "Id"}
        live = query(f"SELECT Id{''.join(',' + f for f in want)} FROM Contact WHERE Id = '{p['masterContact']}'")
        survivor = bool(live)
        merged = lambda i, master: deleted.get(i, "").startswith("true") and master[:15] in deleted[i]
        losers = survivor and all(merged(i, p["masterContact"]) for i in p["otherContacts"]) \
            and all(merged(i, p["masterAccount"]) for i in p["otherAccounts"])
        bad_fields = [f for f, v in want.items() if survivor and live[0].get(f) != v]
        user = backup.fetch("User", "ContactId", [p["masterContact"]], ["Id", "Username", "Email", "IsActive"])
        before_user = next((u for u in rows(sid, "Contact>User.ContactId")), {})
        user_ok = len(user) == 1 and next(iter(user.values()))["IsActive"] and next(iter(user.values()))["Username"] == before_user.get("Username")
        diffs = [f"{j[1].split('>')[1]} {j[5]}->{c} (expected {j[6]})" for j, c in zip(jobs, counts) if j[0] == sid and c != j[6]]
        print(f"{sid}  {survivor!s:11}  {losers!s:14}  {not bad_fields!s:17}  {user_ok!s:8}  {len(diffs)}")
        for d in diffs:
            print("      ", d)
        table.append({"set_id": sid, "survivor": survivor, "losers_deleted": losers, "patched_fields_ok": not bad_fields,
                      "bad_fields": ";".join(bad_fields), "login_ok": user_ok, "child_diffs": " | ".join(diffs)})
    with (out / "review.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(table[0]))
        w.writeheader()
        w.writerows(table)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "pilot")
