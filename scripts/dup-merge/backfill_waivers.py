#!/usr/bin/env python3
"""Backfill blank current-year Client waivers of Client logins with their earlier answers.

  backfill_waivers.py plan|check|rehearse|real|verify

Same rules as the site's carry-over (ReturnClientMenuController.carryOverFromPriorYears): the newest earlier year with
any answer is used as a whole, first non-blank value per field. Never writes a completion stamp; a group of fields
(emergency treatment, payer, screening) is skipped when its form is already Completed; Program_Type__c is set to
Riding only when blank; a waiver on the Mental Health path is skipped.
`check` runs the live guards in the org with no writes at all. `plan` writes the pre-change backup and the payload under backups/dup-merge/backfill-<date>/ (git-ignored, personal
data). `real` needs an ok rehearsal of the identical payload and an unchanged backup.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from assess_clients import ANSWERS, VOLUNTEER_RTS, chunks, has
from common import apex_run, query, soql_list

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backups" / "dup-merge" / "backfill-1117"
TEMPLATE = ROOT / "scripts" / "apex" / "backfill-current-waivers.apex"
# field group -> the stamp of the form that submits it
GROUPS = {
    "emergency": (ANSWERS[0:4], "Auth_for_Emerg_Med_Treatment__c"),
    "payer": (ANSWERS[4:12], "Payer_Info__c"),
    "screening": (ANSWERS[12:], "Screening__c"),
}
STAMP_FIELDS = sorted({s for _, s in GROUPS.values()})


def waivers_of_scope() -> tuple[str, dict[str, list[dict]]]:
    year = query("SELECT Current_Year__c FROM WaiverYear__mdt WHERE MasterLabel = 'Client Current Year'")[0]["Current_Year__c"]
    users = query("SELECT ContactId FROM User WHERE IsActive = true AND ContactId != null")
    contacts = [c["Id"] for ch in chunks({u["ContactId"] for u in users}, 150)
                for c in query(f"SELECT Id FROM Contact WHERE Client__c = true AND Id IN ({soql_list(ch)})")]
    riders = [r["Id"] for ch in chunks(contacts, 150)
              for r in query(f"SELECT Id FROM Riders__c WHERE ClientContact__c IN ({soql_list(ch)})")]
    by_rider: dict[str, list[dict]] = defaultdict(list)
    cols = ["Id", "Client__c", "Year__c", "RecordType.DeveloperName", "Program_Type__c", "CreatedDate",
            "SystemModstamp"] + STAMP_FIELDS + ANSWERS
    for ch in chunks(riders, 60):
        for w in query(f"SELECT {', '.join(cols)} FROM VolunteerWaiver__c WHERE Client__c IN ({soql_list(ch)})"):
            by_rider[w["Client__c"]].append(w)
    return year, by_rider


def plan() -> tuple[dict, list[dict]]:
    year, by_rider = waivers_of_scope()
    items, backup, skipped, riders_hit = [], [], Counter(), set()
    for rider, ws in by_rider.items():
        cur = [w for w in ws if w["Year__c"] == year and w["RecordType"]["DeveloperName"] == "Client"]
        prior = sorted((w for w in ws if w["RecordType"]["DeveloperName"] not in VOLUNTEER_RTS
                        and str(w["Year__c"]).isdigit() and int(w["Year__c"]) < int(year)),
                       key=lambda w: w["CreatedDate"], reverse=True)
        answered = [w for w in prior if any(has(w[f]) for f in ANSWERS)]
        if not cur:
            continue
        # The site reads the oldest current-year waiver (ORDER BY CreatedDate ASC LIMIT 1); CreatedDate has second
        # precision and the site's get-or-create races, so several can tie for oldest. Fill every tied one.
        oldest = min(w["CreatedDate"] for w in cur)
        targets = [w for w in cur if w["CreatedDate"] == oldest]
        for w in targets:
            if any(has(w[f]) for f in ANSWERS):
                continue  # already has answers: not a backfill case
            if not answered:
                skipped["no earlier answers"] += 1
                continue
            if any(any(has(o[f]) for f in ANSWERS) or any(o[s] == "Completed" for s in STAMP_FIELDS)
                   for o in cur if o["Id"] != w["Id"]):
                skipped["another current-year waiver of the Rider holds user input"] += 1
                continue
            if w["Program_Type__c"] == "Mental Health" or any(p["Program_Type__c"] == "Mental Health" for p in prior):
                skipped["Mental Health path"] += 1
                continue
            src = max(int(p["Year__c"]) for p in answered)
            fill: dict = {}
            need: dict = {}
            for name, (fields, stamp) in GROUPS.items():
                if w[stamp] == "Completed":
                    skipped[f"{name} form already Completed"] += 1
                    continue
                vals = {f: next((p[f] for p in answered if int(p["Year__c"]) == src and has(p[f])), None) for f in fields}
                vals = {f: v for f, v in vals.items() if v is not None}
                if vals:
                    fill.update(vals)
                    need[stamp] = True
            if not fill:
                skipped["nothing left to fill"] += 1
                continue
            items.append({"id": w["Id"], "modstamp": w["SystemModstamp"], "sourceYear": src, "fill": fill,
                          "program": "Riding" if not has(w["Program_Type__c"]) else None,
                          "needStampNotCompleted": need})
            riders_hit.add(rider)
            backup.append({k: w[k] for k in ["Id", "Year__c", "Program_Type__c", "SystemModstamp"] + STAMP_FIELDS + ANSWERS})
    print(f"year {year}: {len(items)} waivers on {len(riders_hit)} Riders to fill; skipped: {dict(skipped) or 'none'}")
    for it in items:
        print(f"  {it['id']}: from {it['sourceYear']}, {len(it['fill'])} fields, program {it['program'] or 'unchanged'}, "
              f"groups {sorted(it['needStampNotCompleted'])}")
    return {"year": year, "waivers": items}, backup


LIMIT = 20000  # anonymous Apex is capped (~32k chars incl. the template); payload text is escaped before it is embedded


def batches(p: dict) -> list[dict]:
    out, cur, size = [], [], 0
    for it in p["waivers"]:
        n = len(json.dumps(it, separators=(",", ":")))
        if cur and size + n > LIMIT:
            out.append(cur)
            cur, size = [], 0
        cur.append(it)
        size += n
    return [{"year": p["year"], "waivers": c} for c in ([*out, cur] if cur else out)]


def run(cmd: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    p, before = plan()
    if cmd == "plan":
        (OUT / "waivers-before.json").write_text(json.dumps(before, indent=1))
        (OUT / "payload.json").write_text(json.dumps(p, indent=1))
        sha = hashlib.sha256(json.dumps(p, sort_keys=True).encode()).hexdigest()
        print(f"\nbackup of the {len(before)} waivers' current values + payload written to {OUT} (payload sha {sha[:12]})")
        return
    if not (OUT / "payload.json").exists() or json.loads((OUT / "payload.json").read_text()) != p:
        sys.exit("the org no longer matches the backed-up plan; run `plan` again and look at what changed")
    real, dry = cmd == "real", cmd == "check"
    state_f = OUT / "rehearse.json"
    state = json.loads(state_f.read_text()) if state_f.exists() else {}
    parts = [(b, hashlib.sha256(json.dumps(b, sort_keys=True).encode()).hexdigest()) for b in batches(p)]
    if real and not all(state.get(sha) is True for _, sha in parts):
        sys.exit("not every batch has an ok rehearsal of this exact payload")
    print(f"{len(parts)} batches of {[len(b['waivers']) for b, _ in parts]} waivers")
    for i, (b, sha) in enumerate(parts, 1):
        js = json.dumps(b, separators=(",", ":")).replace("\\", "\\\\").replace("'", "\\'")
        text = (TEMPLATE.read_text().replace("/*REHEARSAL*/", "false" if real else "true")
                .replace("/*DRY*/", "true" if dry else "false").replace("/*PAYLOAD*/", js))
        if len(text) > 30000:
            sys.exit(f"batch {i} is {len(text)} chars, too large for anonymous Apex; lower LIMIT")
        apex = OUT / f"{cmd}-{i}.apex"
        apex.write_text(text)
        res = apex_run(apex)
        (OUT / f"{cmd}-{i}.log").write_text(res["logs"])
        lines = re.findall(r"\|USER_DEBUG\|\[\d+\]\|ERROR\|RESULT~([^~\r\n]*)~([^\r\n]*)", res["logs"])  # not the echoed source
        done = any(m.startswith("COMMITTED") or m.startswith("ROLLED BACK (rehearsal) ok=true") for _, m in lines)
        if not real and not dry:
            state[sha] = done
            state_f.write_text(json.dumps(state))
        print(f"\nbatch {i}/{len(parts)} {cmd}: {'OK' if done else 'FAILED'}"
              f"{'' if res['ok'] else ' (apex error: ' + res['problem'][:300] + ')'}")
        for wid, m in lines:
            print("   ", wid, m)
        flows = Counter(re.findall(r"FLOW_START_INTERVIEW_BEGIN\|[^|]*\|([^|\r\n]+)", res["logs"]))
        units = Counter(re.findall(r"CODE_UNIT_STARTED\|\[EXTERNAL\]\|((?:Flow|Workflow):\w+|[^|\r\n]*trigger event \w+)", res["logs"]))
        print("    flow interviews started:", dict(flows) or "none")
        print("    code units:", dict(units) or "none")
        if not done:
            sys.exit(f"batch {i} failed; stopping (nothing after it was run)")


def verify() -> None:
    p = json.loads((OUT / "payload.json").read_text())
    before = {b["Id"]: b for b in json.loads((OUT / "waivers-before.json").read_text())}
    bad = 0
    for ch in chunks(before, 60):
        for w in query(f"SELECT Id, Program_Type__c, SystemModstamp, {', '.join(STAMP_FIELDS + ANSWERS)} "
                       f"FROM VolunteerWaiver__c WHERE Id IN ({soql_list(ch)})"):
            it = next(i for i in p["waivers"] if i["id"] == w["Id"])
            vals = all(w[f] == v for f, v in it["fill"].items())
            stamps = all(w[s] == before[w["Id"]][s] for s in STAMP_FIELDS)
            prog = w["Program_Type__c"] == (it["program"] or before[w["Id"]]["Program_Type__c"])
            others = all(w[f] == before[w["Id"]][f] for f in ANSWERS if f not in it["fill"])
            if not (vals and stamps and prog and others):
                bad += 1
                print(f"  MISMATCH {w['Id']}: values={vals} stamps={stamps} program={prog} untouched={others}")
    print(f"verify: {len(before)} waivers checked, {bad} mismatches")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("plan", "check", "rehearse", "real", "verify"):
        sys.exit(__doc__)
    verify() if sys.argv[1] == "verify" else run(sys.argv[1])
