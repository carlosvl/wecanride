#!/usr/bin/env python3
"""Read-only: find duplicate Contact sets and bucket them for the merge plan.

Survivor = the Contact that owns the active Experience Cloud user, whatever its age.
Data precedence (column `precedence`, 1 = oldest) decides whose field values win later.
Writes backups/dup-merge/candidates.csv (git-ignored) and prints bucket counts without
names. Nothing is changed in the org.
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path

from common import query

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backups" / "dup-merge" / "candidates.csv"
PORTAL_TYPES = "('PowerPartner','PowerCustomerSuccess','CustomerSuccess','CspLitePortal')"


def norm(s: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


class UF:
    def __init__(self, n: int):
        self.p = list(range(n))

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> None:
        self.p[self.find(a)] = self.find(b)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", nargs="*", default=[], help="Contact Ids to report the bucket for")
    ap.add_argument("--out", type=Path, default=OUT, help="CSV to write (default keeps the 2026-11-12 set numbers)")
    args = ap.parse_args()
    out = args.out

    contacts = query(
        "SELECT Id, FirstName, LastName, Email, Birthdate, AccountId, Account.Name, "
        "Account.RecordType.Name, CreatedDate, Client__c, Volunteer__c, Prospect__c FROM Contact"
    )
    active = {u["ContactId"]: u for u in query(
        "SELECT Id, ContactId, Email FROM User WHERE IsActive = true AND ContactId != null")}
    # Inactive portal users hide ContactId, so the only link back is email.
    inactive_emails = {(u["Email"] or "").lower() for u in query(
        f"SELECT Email FROM User WHERE IsActive = false AND UserType IN {PORTAL_TYPES}")}
    riders: dict[str, int] = defaultdict(int)
    for r in query("SELECT ClientContact__c FROM Riders__c WHERE ClientContact__c != null"):
        riders[r["ClientContact__c"]] += 1
    acct_size: dict[str, int] = defaultdict(int)
    for c in contacts:
        acct_size[c["AccountId"]] += 1

    by_name: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for c in contacts:
        if norm(c["FirstName"]) and norm(c["LastName"]):
            by_name[(norm(c["FirstName"]), norm(c["LastName"]))].append(c)

    sets: list[dict] = []  # {members, bucket, reason}

    for group in (g for g in by_name.values() if len(g) > 1):
        uf = UF(len(group))
        blocked: set[tuple[int, int]] = set()
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                same_email = bool(a["Email"]) and (a["Email"] or "").lower() == (b["Email"] or "").lower()
                same_bd = bool(a["Birthdate"]) and a["Birthdate"] == b["Birthdate"]
                bd_conflict = bool(a["Birthdate"]) and bool(b["Birthdate"]) and a["Birthdate"] != b["Birthdate"]
                if (same_email or same_bd) and not bd_conflict:
                    uf.union(i, j)
                elif same_email and bd_conflict:
                    blocked.add((i, j))
        comps: dict[int, list[int]] = defaultdict(list)
        for i in range(len(group)):
            comps[uf.find(i)].append(i)

        for idxs in comps.values():
            if len(idxs) < 2:
                continue
            m = [group[i] for i in idxs]
            users = [c for c in m if c["Id"] in active]
            m.sort(key=lambda c: (c["CreatedDate"], c["Id"]))
            if not users:
                sets.append({"members": m, "bucket": "out_of_scope", "reason": "no community user"})
            elif len(users) > 1:
                sets.append({"members": m, "bucket": "manual", "reason": "more than one community user"})
            else:
                sets.append({"members": m, "bucket": "in_scope", "reason": "ok", "survivor": users[0]})

        for i, j in blocked:
            if uf.find(i) != uf.find(j) and (group[i]["Id"] in active or group[j]["Id"] in active):
                sets.append({"members": [group[i], group[j]], "bucket": "manual",
                             "reason": "same email but birthdates differ"})
        loose = [group[i] for i in range(len(group)) if len(comps[uf.find(i)]) == 1]
        if len(loose) > 1 and any(c["Id"] in active for c in loose):
            sets.append({"members": loose, "bucket": "manual", "reason": "name-only match"})

    rows = []
    for n, s in enumerate(sets, 1):
        sid = f"S{n:04d}"
        m = s["members"]
        surv = s.get("survivor")
        losers = [c for c in m if c is not surv]
        flags = []
        if s["bucket"] == "in_scope":
            if surv is m[-1]:
                flags.append("survivor_is_newest")
            login_email = (active[surv["Id"]]["Email"] or "").lower()
            if any(c["Email"] and c["Email"].lower() != login_email for c in m):
                flags.append("email_differs_from_login")
            if sum(riders[c["Id"]] for c in m) > 1:
                flags.append("multiple_riders")
            if any(c["AccountId"] != surv["AccountId"] for c in losers):
                flags.append("cross_account")
            if any(acct_size[c["AccountId"]] > 1 and c["AccountId"] != surv["AccountId"] for c in losers):
                flags.append("loser_household_has_others")
            if riders[surv["Id"]] and any(riders[c["Id"]] for c in losers):
                flags.append("both_have_riders")
            if any((c["Email"] or "").lower() in inactive_emails for c in losers if c["Email"]):
                flags.append("loser_email_has_inactive_login")
            if len(m) > 2:
                flags.append("three_or_more")
            if (surv["Account"]["Name"] or "").endswith(("(C2)", "(C3)", "(Community)")):
                flags.append("survivor_in_8_7_account")
        s["id"], s["flags"] = sid, flags
        for k, c in enumerate(m):
            role = ("survivor" if c is surv else "other") if s["bucket"] == "in_scope" else "member"
            rows.append({
                "set_id": sid, "bucket": s["bucket"], "reason": s["reason"], "flags": ";".join(flags),
                "role": role, "precedence": k + 1, "contact_id": c["Id"], "first": c["FirstName"], "last": c["LastName"],
                "email": c["Email"] or "", "birthdate": c["Birthdate"] or "", "created": c["CreatedDate"][:10],
                "has_user": "Y" if c["Id"] in active else "", "riders": riders[c["Id"]],
                "client": c["Client__c"], "volunteer": c["Volunteer__c"], "prospect": c["Prospect__c"],
                "account_id": c["AccountId"], "account_name": c["Account"]["Name"],
                "account_contacts": acct_size[c["AccountId"]],
            })

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    tally: dict[tuple[str, str], int] = defaultdict(int)
    for s in sets:
        tally[(s["bucket"], s["reason"])] += 1
    print(f"contacts={len(contacts)} active_portal_users={len(active)} duplicate_sets={len(sets)}")
    for (b, r), n in sorted(tally.items()):
        print(f"  {b:13s} {r:42s} {n}")
    fl: dict[str, int] = defaultdict(int)
    for s in sets:
        if s["bucket"] == "in_scope":
            for f_ in s["flags"]:
                fl[f_] += 1
    print("in_scope flags:", dict(fl))
    for cid in args.ids:
        hit = next((s for s in sets if any(c["Id"] == cid for c in s["members"])), None)
        print(f"{cid}: " + (f"{hit['id']} {hit['bucket']} ({hit['reason']}) flags={hit['flags']}" if hit else "not in any set"))
    print(f"wrote {out} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
