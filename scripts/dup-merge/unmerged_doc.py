#!/usr/bin/env python3
"""Read-only: write the review document for the duplicate sets that were NOT merged.

  python3 scripts/dup-merge/unmerged_doc.py [candidates-1117.csv]

Reads backups/dup-merge/<csv> (from find_candidates.py --out) and writes backups/dup-merge/unmerged/:
for-review.md/.html and set-map.csv. Holds names and emails: the folder is git-ignored.
Sets are labelled M01.. (name-only) and N01.. (no login) because the numbers inside a re-run candidates
file are not the S#### ids of the merged batches.
"""

from __future__ import annotations

import csv
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "backups" / "dup-merge"
HOST = "https://wecanride.lightning.force.com/lightning/r"
BULK_DAY = "2026-08-07"  # day the bulk job re-created the community users


def url(obj: str, i: str) -> str:
    return f"{HOST}/{obj}/{i}/view"


def flags(r: dict) -> str:
    return ", ".join(w for w, k in (("Client", "client"), ("Volunteer", "volunteer"), ("Prospect", "prospect")) if r[k] == "True") or "no flag"


def member(r: dict) -> list[str]:
    login = "HAS THE LOGIN" if r["has_user"] == "Y" else "no login"
    rider = f", {r['riders']} Rider record(s)" if r["riders"] not in ("", "0") else ""
    return [
        f"- **{r['first']} {r['last']}**: {login}, created {r['created']}, {flags(r)}{rider}  ",
        f"  email {r['email'] or 'blank'}, birthdate {r['birthdate'] or 'blank'}  ",
        f"  {url('Contact', r['contact_id'])}  ",
        f"  household \"{r['account_name']}\" ({r['account_contacts']} people): {url('Account', r['account_id'])}",
    ]


def main() -> None:
    src = BASE / (sys.argv[1] if len(sys.argv) > 1 else "candidates-1117.csv")
    sets: dict[tuple[str, str], list[dict]] = OrderedDict()
    for r in csv.DictReader(src.open()):
        if r["bucket"] in ("manual", "out_of_scope"):
            sets.setdefault((r["bucket"], r["set_id"]), []).append(r)
    key = lambda kv: (kv[1][0]["last"].lower(), kv[1][0]["first"].lower())
    groups = {b: sorted(((k, v) for k, v in sets.items() if k[0] == b), key=key) for b in ("manual", "out_of_scope")}
    label = {k: f"{'M' if b == 'manual' else 'N'}{n:02d}" for b in groups for n, (k, _) in enumerate(groups[b], 1)}

    out = BASE / "unmerged"
    out.mkdir(exist_ok=True)
    with (out / "set-map.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["label", "bucket", "set_id_in_candidates_file"])
        w.writerows((label[k], k[0], k[1]) for k in label)

    man, oos = groups["manual"], groups["out_of_scope"]
    bulk = sum(1 for _, v in man if any(r["created"] == BULK_DAY for r in v))
    summary = ["| Set | Person | Login | Records created |", "|---|---|---|---|"]
    body: list[str] = []
    for b, title, ask in (
        ("manual", "Part A: same name, different email (are they the same person?)",
         ["- [ ] Same person: merge (the record with the login stays)", "- [ ] Two different people: leave both",
          "- [ ] Not sure: leave for now"]),
        ("out_of_scope", "Part B: same person, no login on either record",
         ["- [ ] Merge (suggested: keep the older record, fill its blanks from the newer one)",
          "- [ ] Leave both", "- [ ] Merge, but keep the other record: ______________________"]),
    ):
        body += [f"# {title}", ""]
        for k, v in groups[b]:
            names = f"{v[0]['first']} {v[0]['last']}"
            why = "same email, but the birthdates differ" if b == "manual" and "birthdates" in v[0]["reason"] else \
                  "same name only (no shared email or birthdate)" if b == "manual" else "same name and the same email or birthdate"
            body += [f"## {label[k]}: {names}", "", f"Why it is on this list: {why}.", ""]
            for r in v:
                body += member(r)
            body += ["", "**Your decision:**", ""] + ask + ["", "---", ""]
            summary.append(f"| {label[k]} | {names} | {'one record' if b == 'manual' else 'none'} | {', '.join(r['created'] for r in v)} |")

    head = f"""# Duplicate contacts that were not merged: {len(man)} + {len(oos)} sets, plus one volunteer

Prepared 2026-11-23 for Mary. **Nothing here has been merged.** The 21 sets you already reviewed are done; these are the
ones the merge rules did not cover. Links open the record in Lightning.

## What I need from you

- **Part A ({len(man)} sets):** two Contacts with the same name but no shared email or birthdate. Exactly one of each pair has the
  Experience Cloud login. I will not merge on a name alone. Please tick whether they are the same person. {bulk} of these pairs include a
  record created on {BULK_DAY}, the day the logins were re-created, the likely reason the pair exists.
- **Part B ({len(oos)} sets):** the same person (same name plus the same email or birthdate) but neither record has a login, so
  no login is at risk. Please tick merge or leave. If you say merge, the older record stays and blanks are filled from the newer one.
- **One volunteer** with 12 enrolled classes (see the end).

When two records are merged the other Contact goes to the Recycle Bin for 15 days; a backup is taken first, as for the 21 earlier sets.
A Contact that appears in two sets (one name, two different matches) is listed in both.

## Summary

""" + "\n".join(summary) + "\n\n---\n\n"
    tail = """# One volunteer left unmerged earlier (set S0084 in the 15-set review)

Two volunteer Contacts for the same person. The one without the login owns 12 Enrolled class rows; the login Contact owns none, so the volunteer
does not see their own classes today. Merging moves the rows and the confirmation email may be sent again for each (up to 12, all for past dates).
Details and the 12 class links are in section S0084 of the 15-set document you already have.

- Contact without the login: https://wecanride.lightning.force.com/lightning/r/Contact/003UR00000e2Zp3YAE/view
- Contact with the login: https://wecanride.lightning.force.com/lightning/r/Contact/003UR00000eUAanYAG/view

- [ ] A (suggested): I change the flow first so it emails only when a class becomes Enrolled, then merge
- [ ] B: merge now and accept up to 12 emails (tell the family first)
- [ ] C: leave unmerged

(S0060, the volunteer with two Volunteer records, stays unmerged as you decided.)
"""
    md = out / "for-review.md"
    md.write_text(head + "\n".join(body) + "\n" + tail)
    style = ("<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;"
             "line-height:1.45}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}li{word-break:break-word}</style>")
    subprocess.run(["pandoc", "-f", "gfm", "-t", "html5", "-s", "--metadata", "title=Duplicate contacts that were not merged",
                    "-V", f"header-includes={style}", "-o", str(out / "for-review.html"), str(md)], check=True)
    print(f"A {len(man)} sets ({bulk} with a record created {BULK_DAY}), B {len(oos)} sets; wrote {md}")


if __name__ == "__main__":
    main()
