"""Shared `sf` helpers for the duplicate-merge scripts (stdlib only).

Run the scripts without `python3 -I`, otherwise this sibling import is not found.
"""

import json
import os
import subprocess

ORG = "WCRProd"
# sfdx-project.json says sourceApiVersion 55.0, which the CLI then uses for queries: ApplicationForm,
# ContactPointOttSvc and EmailMessage.FromId do not exist there. The backups were exported at 68.0.
ENV = {**os.environ, "SF_DISABLE_LOG_FILE": "true", "SF_ORG_API_VERSION": "68.0"}


def sf(*args: str) -> dict:
    r = subprocess.run(["sf", *args, "-o", ORG, "--json"], capture_output=True, text=True, env=ENV)
    out = json.loads(r.stdout)
    if out.get("status") != 0:
        raise RuntimeError(out.get("message") or r.stderr)
    return out["result"]


def query(soql: str) -> list[dict]:
    res = sf("data", "query", "-q", soql)
    if len(res["records"]) != res["totalSize"]:  # CLI paging cap: stop rather than undercount
        raise RuntimeError(f"short read {len(res['records'])}/{res['totalSize']}: {soql[:200]}")
    return res["records"]


def soql_list(vals) -> str:
    return ",".join("'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'" for v in vals)


def apex_run(path) -> dict:
    """Run an anonymous Apex file; returns ok, problem (compile/exception text) and the debug log."""
    r = subprocess.run(["sf", "apex", "run", "--file", str(path), "-o", ORG, "--json"],
                       capture_output=True, text=True, env=ENV)
    out = json.loads(r.stdout)
    res = out.get("result") or {}
    return {
        "ok": bool(res.get("success")),
        "problem": res.get("compileProblem") or res.get("exceptionMessage") or out.get("message") or "",
        "logs": res.get("logs") or "",
    }
