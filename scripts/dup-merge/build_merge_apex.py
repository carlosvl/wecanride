#!/usr/bin/env python3
"""Resolve each duplicate set into one merge payload, rehearse it (rolled back), then run it for real.

  build_merge_apex.py plan     [batch]                                  # payloads + conflicts.csv, nothing sent
  build_merge_apex.py rehearse [batch] [--only S0097,S0100] [--patch-email] [--set S0062:Volunteer__c=true]
  build_merge_apex.py real     [batch] [--only S0097,S0100] [--patch-email] [--set ...]   # needs an ok rehearsal of the same payload

Rule: the Contact that owns the active community user always survives; its field values come from
the oldest member first (blanks filled from newer ones). Everything is computed from the verified
backup in backups/dup-merge/<batch>/, and rehearse/real refuse to start unless that backup still
matches the org. Files written under <batch>/: payloads/, conflicts.csv, runs/ (all personal data,
git-ignored).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import backup
from common import apex_run

ROOT = Path(__file__).resolve().parents[2]
BASE = backup.BASE
TEMPLATE = ROOT / "scripts" / "apex" / "merge-duplicate-sets.apex"
SUFFIX = re.compile(r" \((?:C\d+|Community)\)$")  # added by the 2026-08-07 bulk job
EMAIL_FIELDS = {"Email", "npe01__AlternateEmail__c", "npe01__HomeEmail__c", "npe01__WorkEmail__c", "npe01__Preferred_Email__c"}
DENY_PREFIX = ("npo02__", "dupcheck__", "onemergefree__")  # NPSP rollups/household, Plauti, OneMerge
# Never copied: ownership and record type, bounce state (belongs to the address), NPSP-managed address and
# affiliation, portal flag, legacy ids.
DENY = {
    "Contact": {
        "AccountId", "OwnerId", "RecordTypeId", "ReportsToId", "IndividualId", "ContactSource", "Jigsaw",
        "EmailBouncedReason", "EmailBouncedDate", "Is_Active_Portal_User__c", "Legacy_Account_ID__c",
        "npe01__SystemAccountProcessor__c", "npe01__SystemIsIndividual__c", "npsp__Batch__c",
        "npsp__Current_Address__c", "npsp__is_Address_Override__c", "npsp__Soft_Credit_Last_N_Days__c",
        "npsp__Primary_Affiliation__c",
    },
    "Riders__c": {"OwnerId", "Name", "ClientContact__c", "Household__c"},
}
EXCLUSIVE = ("Client__c", "Volunteer__c", "Prospect__c")  # a validation rule allows only one of these
# Child "objects" that cannot be queried, so their export errors are expected.
PSEUDO = {
    "AttachedContentDocument", "AttachedContentNote", "CombinedAttachment", "EmailBounceEvent", "EmailStatus",
    "FlowExecutionErrorEvent", "GenericAsmtTaskContext", "GenericAssessmentTask", "NetworkUserHistoryRecent",
    "NoteAndAttachment", "OpenActivity", "OutgoingEmail", "OutgoingEmailRelation", "ProcessExceptionEvent",
}


def describe(obj: str) -> dict:
    p = BASE / "describe" / f"{obj}.json"
    return json.loads(p.read_text()) if p.exists() else backup.describe(obj)


def patchable(obj: str, patch_email: bool) -> list[dict]:
    deny = DENY[obj] | (set() if patch_email or obj != "Contact" else EMAIL_FIELDS)
    return [f for f in describe(obj)["fields"]
            if f["updateable"] and not f["calculated"] and f["type"] not in ("address", "location", "base64", "id")
            and f["name"] not in deny and not f["name"].startswith(DENY_PREFIX)]


def blank(v) -> bool:
    return v is None or v == ""


def resolve(fields: list[dict], rows: list[dict], master_id: str, remap: dict) -> tuple[dict, list[dict]]:
    """rows are oldest first and include the master. Returns (patch for the master, conflicts)."""
    master = next(r for r in rows if r["Id"] == master_id)
    patch: dict = {}
    conflicts: list[dict] = []
    groups: dict[str, list[dict]] = {}
    for f in fields:
        groups.setdefault(f.get("compoundFieldName") or f["name"], []).append(f)

    def conflict(name, kept, losers):
        conflicts.append({"field": name, "kept": kept, "discarded": "; ".join(f"#{i}: {v}" for i, v in losers)})

    for name, group in groups.items():
        names = [f["name"] for f in group]
        if group[0].get("compoundFieldName"):  # name and address parts move together from one member
            donors = [(i, r) for i, r in enumerate(rows, 1) if any(not blank(r[n]) for n in names)]
            if not donors:
                continue
            show = lambda r: ", ".join(str(r[n]) for n in names if not blank(r[n]))
            if any([r[n] for n in names] != [donors[0][1][n] for n in names] for _, r in donors[1:]):
                conflict(name, show(donors[0][1]), [(i, show(r)) for i, r in donors[1:]])
            if [donors[0][1][n] for n in names] != [master[n] for n in names]:
                patch.update({n: donors[0][1][n] for n in names})
            continue
        f = group[0]
        n = f["name"]
        if n in EXCLUSIVE:
            continue
        if f["type"] == "boolean":  # any true wins, so opt-outs are kept
            want = any(r[n] for r in rows)
            if want != bool(master[n]):
                patch[n] = want
            if len({bool(r[n]) for r in rows}) > 1:
                conflict(n, want, [(i, bool(r[n])) for i, r in enumerate(rows, 1) if bool(r[n]) != want])
            continue
        have = [(i, remap.get(r[n], r[n])) for i, r in enumerate(rows, 1) if not blank(r[n])]
        if not have:
            continue
        v = have[0][1]
        if f["type"] == "reference" and v == master_id:
            continue
        if v != remap.get(master[n], master[n]):
            patch[n] = v
        if len({x for _, x in have}) > 1:
            conflict(n, v, [(i, x) for i, x in have if x != v])
    if all(any(f["name"] == n for f in fields) for n in EXCLUSIVE):
        # Prospect is the step before Client/Volunteer, so a real Client or Volunteer record replaces it.
        c, v, p = (any(r[n] for r in rows) for n in EXCLUSIVE)
        want = dict(zip(EXCLUSIVE, (c, v, p and not (c or v))))
        patch.update({n: w for n, w in want.items() if w != bool(master[n])})
        flags = lambda r: ",".join(n[0] for n in EXCLUSIVE if r[n]) or "none"
        kept = flags(want)
        if any(flags(r) != kept for r in rows):
            conflict("Client/Volunteer/Prospect", kept, [(i, flags(r)) for i, r in enumerate(rows, 1) if flags(r) != kept])
    return patch, conflicts


def build_set(batch: str, s: dict, man: dict, patch_email: bool, overrides: dict) -> dict:
    sid, out = s["set_id"], BASE / batch

    def rows(label: str) -> list[dict]:
        p = out / sid / (label.replace(">", "__") + ".json")
        return json.loads(p.read_text()) if p.exists() else []

    by_id = {c["Id"]: c for c in rows("Contact")}
    order = [by_id[i] for i in s["members_oldest_first"]]
    master = s["survivor"]
    others = [c["Id"] for c in order if c["Id"] != master]
    macct = by_id[master]["AccountId"]
    oaccts = sorted({by_id[i]["AccountId"] for i in others} - {macct})
    remap = {**{i: master for i in others}, **{a: macct for a in oaccts}}
    held: list[str] = []
    flags: list[str] = []

    cpatch, conflicts = resolve(patchable("Contact", patch_email), order, master, remap)
    for c in conflicts:
        c["object"] = "Contact"

    # Human decision for one field of one set (--set S0062:Volunteer__c=true); part of the payload, so the sha and the rehearsal cover it.
    for f, v in overrides.get(sid, {}).items():
        after = {**by_id[master], **cpatch, f: v}
        if f in EXCLUSIVE and v and any(after[e] for e in EXCLUSIVE if e != f):
            held.append(f"override {f} would leave two of Client/Volunteer/Prospect set")
        cpatch[f] = v

    if any(r["Client__c"] for r in order) and any(r["Volunteer__c"] for r in order):
        held.append("Client and Volunteer both flagged across the members (validation allows one)")

    # Riders: only drop the newer ones when every one of them is empty (no child rows in the backup).
    riders = sorted(rows("Contact>Riders__c.ClientContact__c"), key=lambda r: (r["CreatedDate"], r["Id"]))
    kid_labels = [k for k in man["labels"] if k.startswith("Contact>Riders__c.ClientContact__c>")]
    for k in kid_labels:
        m = man["labels"][k]
        if m["error"] and m["obj"] not in PSEUDO:
            held.append(f"rider child export failed: {m['obj']}")
    kids = Counter(r.get(man["labels"][k]["field"]) for k in kid_labels for r in rows(k))
    rider_del: list[str] = []
    rpatch: dict = {}
    if len(riders) > 1:
        if all(not kids[r["Id"]] for r in riders[1:]):
            rider_del = [r["Id"] for r in riders[1:]]
            rpatch, rconf = resolve(patchable("Riders__c", patch_email), riders, riders[0]["Id"], remap)
            conflicts += [{**c, "object": "Riders__c"} for c in rconf]
        else:
            flags.append("riders_left_for_manual_merge")
    if len(rows("Contact>Volunteer_Info__c.Volunteer_Name__c")) > 1:
        flags.append("volunteer_info_left_for_manual_merge")

    # Site routing: the returning-client menu loads the opened Contact's Rider with LIMIT 1 and no ORDER BY, and the
    # page variation follows the login Contact's own flags (pilot review, wiki/concepts/duplicate-merge-rules.md).
    if "riders_left_for_manual_merge" in flags:
        held.append("login Contact would own 2+ Riders (site picks one at random): merge the Riders first")
    if not any(r["Client__c"] or r["Volunteer__c"] for r in order) and not riders:
        flags.append("login_contact_neither_client_nor_volunteer_no_rider")

    # Merging re-parents a loser's Enrolled Volunteer_Class rows, which can re-fire the confirmation email.
    for k in man["labels"]:
        if k.startswith("Contact>Volunteer_Class__c.") and k.count(">") == 1:
            f = man["labels"][k]["field"]
            n = sum(1 for r in rows(k) if r[f] in others and r.get("Status__c") == "Enrolled")
            if n:
                held.append(f"{n} Enrolled Volunteer_Class rows would be re-parented (confirmation email)")

    # Household name: drop the bulk-job suffix only when the older account is the same name without it.
    accts = sorted(rows("Account"), key=lambda a: (a["CreatedDate"], a["Id"]))
    master_acct = next(a for a in accts if a["Id"] == macct)
    oldest = next(a for a in accts if a["Id"] in [macct, *oaccts])
    apatch: dict = {}
    if oldest["Id"] != macct and SUFFIX.sub("", oldest["Name"]) == SUFFIX.sub("", master_acct["Name"]) != master_acct["Name"]:
        apatch = {"Name": oldest["Name"]}
        conflicts.append({"object": "Account", "field": "Name", "kept": oldest["Name"], "discarded": f"#2: {master_acct['Name']}"})

    payload = {
        "setId": sid, "masterContact": master, "otherContacts": others, "masterAccount": macct,
        "otherAccounts": oaccts, "riderDelete": rider_del,
        "patchContact": {"Id": master, **cpatch} if cpatch else None,
        "patchAccount": {"Id": macct, **apatch} if apatch else None,
        "patchRider": {"Id": riders[0]["Id"], **rpatch} if rpatch else None,
    }
    for c in conflicts:
        c["set_id"] = sid
    return {"sid": sid, "payload": payload, "conflicts": conflicts, "flags": flags, "held": held,
            "sha": hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()}


def build(batch: str, patch_email: bool, overrides: dict) -> list[dict]:
    out = BASE / batch
    man = json.loads((out / "manifest.json").read_text())
    built = [build_set(batch, s, man, patch_email, overrides) for s in json.loads((out / "sets.json").read_text())]
    (out / "payloads").mkdir(exist_ok=True)
    rows = []
    for b in built:
        (out / "payloads" / f"{b['sid']}.json").write_text(json.dumps(b["payload"], indent=1, sort_keys=True))
        rows += b["conflicts"]
    with (out / "conflicts.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["set_id", "object", "field", "kept", "discarded"])
        w.writeheader()
        w.writerows(rows)
    return built


def show_plan(built: list[dict]) -> None:
    for b in built:
        p = b["payload"]
        n = lambda k: len(p[k]) - 1 if p[k] else 0
        print(f"{b['sid']}: merge {len(p['otherContacts'])} contact(s), {len(p['otherAccounts'])} account(s); "
              f"patch contact={n('patchContact')} rider={n('patchRider')} account={n('patchAccount')} fields; "
              f"newer riders deleted={len(p['riderDelete'])}; conflicts={len(b['conflicts'])}"
              f"{'; FLAGS ' + ','.join(b['flags']) if b['flags'] else ''}{'; HELD ' + ' | '.join(b['held']) if b['held'] else ''}")


def render(b: dict, rehearsal: bool) -> str:
    js = json.dumps(b["payload"], separators=(",", ":")).replace("\\", "\\\\").replace("'", "\\'")
    return TEMPLATE.read_text().replace("/*REHEARSAL*/", "true" if rehearsal else "false").replace("/*PAYLOAD*/", js)


def run(batch: str, real: bool, only: set[str], patch_email: bool, overrides: dict) -> None:
    if not backup.verify(batch):
        sys.exit("backup no longer matches the org; re-run backup.py export before merging")
    built = build(batch, patch_email, overrides)
    show_plan(built)
    runs = BASE / batch / "runs"
    runs.mkdir(exist_ok=True)
    mode = "real" if real else "rehearse"
    for b in built:
        sid = b["sid"]
        if only and sid not in only:
            continue
        if b["held"]:
            print(f"\n{sid}: HELD, not run: {' | '.join(b['held'])}")
            continue
        state = runs / f"{sid}.rehearse.json"
        if real and not (state.exists() and json.loads(state.read_text()) == {"sha": b["sha"], "ok": True}):
            print(f"\n{sid}: SKIPPED, no ok rehearsal of this exact payload")
            continue
        apex = runs / f"{sid}.{mode}.apex"
        apex.write_text(render(b, rehearsal=not real))
        res = apex_run(apex)
        (runs / f"{sid}.{mode}.log").write_text(res["logs"])
        lines = [m for s_, m in re.findall(r"RESULT~(\w+)~(.*)", res["logs"]) if s_ == sid]
        flows = Counter(re.findall(r"CODE_UNIT_STARTED\|\[EXTERNAL\]\|((?:Flow|Workflow):\w+|[^|\r\n]*trigger event \w+)", res["logs"]))
        done = any(l.startswith("COMMITTED") or l.startswith("ROLLED BACK (rehearsal) ok=true") for l in lines)
        if not real:
            state.write_text(json.dumps({"sha": b["sha"], "ok": done}))
        print(f"\n{sid}: {'OK' if done else 'FAILED'}{'' if res['ok'] else ' (apex error: ' + res['problem'][:300] + ')'}")
        for l in lines:
            print("   ", l)
        if flows:
            print("    automation fired (code units):", dict(flows))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["plan", "rehearse", "real"])
    ap.add_argument("batch", nargs="?", default="pilot")
    ap.add_argument("--only", default="")
    ap.add_argument("--patch-email", action="store_true", help="also copy Email (default keeps the login's email)")
    ap.add_argument("--set", action="append", default=[], metavar="SET:Field=true|false",
                    help="boolean Contact field decided by a human, e.g. S0062:Volunteer__c=true (repeatable)")
    a = ap.parse_args()
    overrides: dict = {}
    for item in a.set:
        sid, rest = item.split(":", 1)
        field, val = rest.split("=", 1)
        assert val in ("true", "false"), f"--set {item}: value must be true or false"
        overrides.setdefault(sid, {})[field] = val == "true"
    if a.cmd == "plan":
        show_plan(build(a.batch, a.patch_email, overrides))
    else:
        run(a.batch, a.cmd == "real", set(filter(None, a.only.split(","))), a.patch_email, overrides)
