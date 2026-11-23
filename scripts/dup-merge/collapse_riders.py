#!/usr/bin/env python3
"""Collapse two Riders under one login Contact (rehearse with rollback, then run for real).

  collapse_riders.py rehearse|real <batch> <setId> --keep <RiderId> [--move W1,W2] [--drop W3]

The kept Rider gets the older Rider's values only where it is blank; the older Rider's waivers are moved
to it (--move) or deleted (--drop), then the older Rider is deleted. Needs a verified backup in
backups/dup-merge/<batch>/ and, for `real`, an ok rehearsal of the identical payload.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter

import backup
from build_merge_apex import blank, patchable
from common import apex_run

TEMPLATE = backup.BASE.parents[1] / "scripts" / "apex" / "collapse-duplicate-riders.apex"


def payload(batch: str, sid: str, keep: str, move: list[str], drop: list[str]) -> dict:
    out = backup.BASE / batch / sid
    riders = {r["Id"]: r for r in json.loads((out / "Contact__Riders__c.ClientContact__c.json").read_text())}
    if keep not in riders or len(riders) != 2:
        sys.exit(f"expected exactly two Riders including {keep}, backup has {sorted(riders)}")
    older = next(i for i in riders if i != keep)
    fill = {f["name"]: riders[older][f["name"]] for f in patchable("Riders__c", False)
            if blank(riders[keep][f["name"]]) and not blank(riders[older][f["name"]])}
    p = {"setId": sid, "contactId": riders[keep]["ClientContact__c"], "keeperRider": keep, "olderRider": older,
         "patchRider": {"Id": keep, **fill} if fill else None, "moveWaivers": move, "deleteWaivers": drop}
    waivers = json.loads((out / "Contact__Riders__c.ClientContact__c__VolunteerWaiver__c.Client__c.json").read_text())
    mine = {w["Id"] for w in waivers if w["Client__c"] == older}
    if mine != set(move) | set(drop):
        sys.exit(f"older Rider has waivers {sorted(mine)}, but --move/--drop cover {sorted(set(move) | set(drop))}")
    conflicts = [n for n in (f["name"] for f in patchable("Riders__c", False))
                 if not blank(riders[keep][n]) and not blank(riders[older][n]) and riders[keep][n] != riders[older][n]]
    print(f"{sid}: keep {keep}, delete {older}; fill {sorted(fill)}; keeper wins on {conflicts}; move {move}; delete waivers {drop}")
    return p


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["rehearse", "real"])
    ap.add_argument("batch")
    ap.add_argument("set_id")
    ap.add_argument("--keep", required=True)
    ap.add_argument("--move", default="")
    ap.add_argument("--drop", default="")
    a = ap.parse_args()
    if not backup.verify(a.batch):
        sys.exit("backup no longer matches the org; re-run backup.py export first")
    p = payload(a.batch, a.set_id, a.keep, [x for x in a.move.split(",") if x], [x for x in a.drop.split(",") if x])
    sha = hashlib.sha256(json.dumps(p, sort_keys=True).encode()).hexdigest()
    runs = backup.BASE / a.batch / "runs"
    runs.mkdir(exist_ok=True)
    state = runs / f"{a.set_id}.riders.rehearse.json"
    real = a.cmd == "real"
    if real and not (state.exists() and json.loads(state.read_text()) == {"sha": sha, "ok": True}):
        sys.exit("no ok rehearsal of this exact payload")
    js = json.dumps(p, separators=(",", ":")).replace("\\", "\\\\").replace("'", "\\'")
    tpl = TEMPLATE.read_text()
    apex = runs / f"{a.set_id}.riders.{a.cmd}.apex"
    apex.write_text(tpl.replace("/*REHEARSAL*/", "false" if real else "true").replace("/*PAYLOAD*/", js))
    res = apex_run(apex)
    (runs / f"{a.set_id}.riders.{a.cmd}.log").write_text(res["logs"])
    lines = [m for s_, m in re.findall(r"RESULT~(\w+)~(.*)", res["logs"]) if s_ == a.set_id]
    done = any(l.startswith("COMMITTED") or l.startswith("ROLLED BACK (rehearsal) ok=true") for l in lines)
    if not real:
        state.write_text(json.dumps({"sha": sha, "ok": done}))
    print(f"\n{a.set_id}: {'OK' if done else 'FAILED'}{'' if res['ok'] else ' (apex error: ' + res['problem'][:300] + ')'}")
    for l in lines:
        print("   ", l)
    flows = Counter(re.findall(r"FLOW_START_INTERVIEW_BEGIN\|[^|]*\|([^|\r\n]+)", res["logs"]))
    units = Counter(re.findall(r"CODE_UNIT_STARTED\|\[EXTERNAL\]\|((?:Flow|Workflow):\w+|[^|\r\n]*trigger event \w+)", res["logs"]))
    print("    flow interviews started:", dict(flows) or "none")
    print("    code units:", dict(units) or "none")
