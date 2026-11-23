#!/usr/bin/env python3
"""Back up every set in a batch before merging, and check the backup still matches the org.

  python3 scripts/dup-merge/backup.py export [batch]   # default batch: pilot
  python3 scripts/dup-merge/backup.py verify [batch]

Reads backups/dup-merge/<batch>/sets.json. Writes one JSON per object per set plus
manifest.json (row counts, per-file sha256, and a fingerprint of Id|SystemModstamp that
`verify` re-reads from the live org). Holds personal data: the folder is git-ignored.
Restore = undelete merged records from the Recycle Bin (15 days), then re-point children
from the old parent Ids in these files.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import query, sf, soql_list

BASE = Path(__file__).resolve().parents[2] / "backups" / "dup-merge"
SKIP_SUFFIX = ("History", "Feed", "Share", "ChangeEvent", "Tag")
DEEP = {"Riders__c", "Volunteer_Info__c", "Opportunity"}  # objects whose own children are also backed up
_desc: dict = {}


def describe(obj: str) -> dict:
    if obj not in _desc:
        _desc[obj] = sf("sobject", "describe", "--sobject", obj)
    return _desc[obj]


def field_names(obj: str) -> list[str]:
    return [f["name"] for f in describe(obj)["fields"] if f["type"] not in ("base64", "address", "location")]


def stamp(obj: str) -> str | None:
    names = {f["name"] for f in describe(obj)["fields"]}
    return next((n for n in ("SystemModstamp", "LastModifiedDate") if n in names), None)


def children(obj: str) -> list[tuple[str, str]]:
    seen = []
    for c in describe(obj)["childRelationships"]:
        key = (c["childSObject"], c["field"])
        if not c.get("deprecatedAndHidden") and not key[0].endswith(SKIP_SUFFIX) and key not in seen:
            seen.append(key)
    return seen


def fetch(obj: str, field: str, vals: list, select: list[str]) -> dict[str, dict]:
    """SELECT select FROM obj WHERE field IN vals, splitting long IN lists and field lists."""
    rows: dict[str, dict] = {}
    chunks, cur = [], ["Id"]
    for n in select:
        if n != "Id" and len(",".join(cur)) + len(n) > 8000:
            chunks.append(cur)
            cur = ["Id"]
        if n != "Id":
            cur.append(n)
    chunks.append(cur)
    for i in range(0, len(vals), 150):
        for ch in chunks:
            soql = f"SELECT {','.join(ch)} FROM {obj} WHERE {field} IN ({soql_list(vals[i:i + 150])})"
            for r in query(soql):
                rows.setdefault(r["Id"], {}).update({k: v for k, v in r.items() if k != "attributes"})
    return rows


def fingerprint(rows, st: str | None) -> str:
    keys = sorted(f"{r['Id']}|{r.get(st) or ''}" for r in rows)
    return hashlib.sha256("\n".join(keys).encode()).hexdigest()


def run_specs(specs: list[dict]) -> None:
    """Fill spec['rows'] (or spec['error']) in parallel."""
    def one(sp):
        try:
            sp["rows"] = fetch(sp["obj"], sp["field"], sp["vals"], field_names(sp["obj"]))
        except Exception as e:  # recorded in the manifest; export prints them for review
            sp["rows"], sp["error"] = {}, str(e)[:300]
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(one, [s for s in specs if s["vals"]]))
    for sp in specs:
        sp.setdefault("rows", {})


def child_specs(parent_label: str, parent_obj: str, ids: list[str]) -> list[dict]:
    return [{"label": f"{parent_label}>{o}.{f}", "obj": o, "field": f, "vals": ids} for o, f in children(parent_obj)]


def export(batch: str) -> None:
    sets = json.loads((BASE / batch / "sets.json").read_text())
    owner: dict[str, str] = {}
    email_owner: dict[str, str] = {}
    for s in sets:
        for i in s["members_oldest_first"] + s["accounts"]:
            owner.setdefault(i, s["set_id"])
    cids = sorted({c for s in sets for c in s["members_oldest_first"]})
    aids = sorted({a for s in sets for a in s["accounts"]})

    roots = [
        {"label": "Contact", "obj": "Contact", "field": "Id", "vals": cids},
        {"label": "Account", "obj": "Account", "field": "Id", "vals": aids},
        {"label": "Account>Contact.AccountId", "obj": "Contact", "field": "AccountId", "vals": aids},
    ]
    run_specs(roots)
    for r in roots[0]["rows"].values():
        if r.get("Email"):
            email_owner[r["Email"].lower()] = owner[r["Id"]]
    emails = sorted(email_owner)
    specs = roots + [{"label": "User.byEmail", "obj": "User", "field": "Email", "vals": emails}]
    specs += child_specs("Contact", "Contact", cids) + child_specs("Account", "Account", aids)
    run_specs(specs[3:])

    for sp in list(specs):  # one more level below the objects in DEEP
        if sp["obj"] in DEEP and sp["rows"]:
            deeper = child_specs(sp["label"], sp["obj"], sorted(sp["rows"]))
            run_specs(deeper)
            specs += deeper

    out = BASE / batch
    manifest = {"batch": batch, "sets": [s["set_id"] for s in sets], "labels": {}}
    for sp in specs:
        st = stamp(sp["obj"]) if not sp.get("error") else None
        per_set = defaultdict(list)
        for r in sp["rows"].values():
            key = r["Id"] if sp["field"] == "Id" else r.get(sp["field"]) if sp["field"] != "Email" else (r.get("Email") or "").lower()
            sid = (email_owner.get(key) if sp["field"] == "Email" else owner.get(key)) or "_unassigned"
            owner.setdefault(r["Id"], sid)
            per_set[sid].append(r)
        files = {}
        for sid, rows in per_set.items():
            p = out / sid / (sp["label"].replace(">", "__") + ".json")
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(sorted(rows, key=lambda r: r["Id"]), indent=1, sort_keys=True))
            files[str(p.relative_to(out))] = hashlib.sha256(p.read_bytes()).hexdigest()
        manifest["labels"][sp["label"]] = {
            "obj": sp["obj"], "field": sp["field"], "vals": sp["vals"], "count": len(sp["rows"]),
            "fp": fingerprint(sp["rows"].values(), st), "stamp": st, "error": sp.get("error"), "files": files,
        }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    total = sum(m["count"] for m in manifest["labels"].values())
    errs = {k: m["error"] for k, m in manifest["labels"].items() if m["error"]}
    print(f"{len(sets)} sets, {len(manifest['labels'])} queries, {total} rows -> {out}")
    for k, v in errs.items():
        print(f"  ERROR {k}: {v}")
    for k, m in manifest["labels"].items():
        if m["count"] and k.count(">") == 1:
            print(f"  {m['count']:4d}  {k}")


def verify(batch: str) -> bool:
    out = BASE / batch
    manifest = json.loads((out / "manifest.json").read_text())
    bad = []
    for label, m in manifest["labels"].items():
        for rel, sha in m["files"].items():
            if hashlib.sha256((out / rel).read_bytes()).hexdigest() != sha:
                bad.append(f"{label}: file changed on disk: {rel}")

    def live(item):
        label, m = item
        if m["error"] or not m["vals"]:
            return label, None
        sel = ["Id"] + ([m["stamp"]] if m["stamp"] else [])
        rows = fetch(m["obj"], m["field"], m["vals"], sel)
        return label, (len(rows), fingerprint(rows.values(), m["stamp"]))

    with ThreadPoolExecutor(6) as ex:
        for label, res in ex.map(live, manifest["labels"].items()):
            m = manifest["labels"][label]
            if res and res != (m["count"], m["fp"]):
                bad.append(f"{label}: backup has {m['count']} rows, org now has {res[0]} (or rows changed)")
    skipped = [k for k, m in manifest["labels"].items() if m["error"]]
    print(f"verified {len(manifest['labels'])} queries; {len(skipped)} skipped (errored at export)")
    for b in bad:
        print("  MISMATCH", b)
    print("OK: backup matches the org" if not bad else "FAILED: re-run export before merging")
    return not bad


if __name__ == "__main__":
    cmd, batch = (sys.argv[1:] + ["pilot"])[:2]
    if cmd == "export":
        export(batch)
    elif cmd == "verify":
        sys.exit(0 if verify(batch) else 1)
    else:
        sys.exit(__doc__)
