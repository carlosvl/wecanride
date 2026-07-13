#!/usr/bin/env bash
# Health-check the LLM wiki: orphans, stale pages, manifest drift, missing frontmatter.
# Usage: ./scripts/wiki/lint.sh
set -euo pipefail

WIKI_DIR="$(cd "$(dirname "$0")/../../wiki" && pwd)"
REPORT_DIR="$WIKI_DIR/reports"
DATE=$(date +%Y-%m-%d)
REPORT="$REPORT_DIR/lint-$DATE.md"
FLOWS_DIR="$(cd "$(dirname "$0")/../../force-app/main/default/flows" && pwd)"
OBJECTS_DIR="$(cd "$(dirname "$0")/../../force-app/main/default/objects" && pwd)"

mkdir -p "$REPORT_DIR"

issues=0
report() { echo "$1" >> "$REPORT"; }
issue() { issues=$((issues + 1)); report "- ⚠️ $1"; }

# Header
cat > "$REPORT" <<EOF
---
title: Lint Report $DATE
type: report
category: lint
last_verified: $DATE
status: current
---

# Wiki Lint Report — $DATE

EOF

report "## Summary"
report ""

# 1. Required files
report "### Required files"
for f in index.md log.md overview.md; do
  if [[ -f "$WIKI_DIR/$f" ]]; then
    report "- ✅ $f exists"
  else
    issue "$f is missing"
  fi
done
report ""

# 2. Frontmatter check
report "### Frontmatter"
missing_fm=0
while IFS= read -r f; do
  if ! head -1 "$f" | grep -q '^---'; then
    issue "Missing frontmatter: ${f#$WIKI_DIR/}"
    missing_fm=$((missing_fm + 1))
  fi
done < <(find "$WIKI_DIR" -name '*.md' -not -name 'index.md' -not -name 'log.md')
if [[ $missing_fm -eq 0 ]]; then
  report "- ✅ All pages have frontmatter"
fi
report ""

# 3. Orphan detection (pages with no inbound wikilinks)
report "### Orphan pages"
orphans=0
while IFS= read -r page; do
  slug=$(basename "$page" .md)
  # Skip index, log, overview, manifests, reports
  case "$slug" in index|log|overview|flows-registry|objects-registry) continue ;; esac
  if ! rg -q "\[\[$slug\]\]|\[\[[^]]*/$slug\]\]" "$WIKI_DIR" --glob '*.md' 2>/dev/null; then
    issue "Orphan: ${page#$WIKI_DIR/}"
    orphans=$((orphans + 1))
  fi
done < <(find "$WIKI_DIR" -name '*.md' -not -path '*/reports/*')
if [[ $orphans -eq 0 ]]; then
  report "- ✅ No orphan pages detected"
fi
report ""

# 4. Stale pages (last_verified > 90 days ago)
report "### Stale pages (last_verified > 90 days)"
stale=0
while IFS= read -r f; do
  verified=$(rg '^last_verified:\s*(\S+)' -o -r '$1' "$f" 2>/dev/null || true)
  if [[ -n "$verified" ]]; then
    days=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$verified" +%s 2>/dev/null || echo 0)) / 86400 ))
    if [[ $days -gt 90 ]]; then
      issue "Stale (${days}d): ${f#$WIKI_DIR/} — last_verified: $verified"
      stale=$((stale + 1))
    fi
  fi
done < <(find "$WIKI_DIR" -name '*.md' -not -path '*/reports/*')
if [[ $stale -eq 0 ]]; then
  report "- ✅ No stale pages"
fi
report ""

# 5. Manifest drift — flows in repo but not in registry
report "### Manifest drift (flows)"
flow_count=$(find "$FLOWS_DIR" -name '*.flow-meta.xml' | wc -l | tr -d ' ')
registry_count=$(rg -o '`[A-Za-z][A-Za-z0-9_]*`' "$WIKI_DIR/manifests/flows-registry.md" | tr -d '`' | sort -u | wc -l | tr -d ' ')
report "- Repo flows: $flow_count"
report "- Registry entries: ~$registry_count"
if [[ "$flow_count" != "$registry_count" ]]; then
  issue "Flow count mismatch: repo=$flow_count registry≈$registry_count"
  comm -23 \
    <(find "$FLOWS_DIR" -name '*.flow-meta.xml' -exec basename {} .flow-meta.xml \; | sort) \
    <(rg -o '`[A-Za-z][A-Za-z0-9_]*`' "$WIKI_DIR/manifests/flows-registry.md" | tr -d '`' | sort -u) \
    | while read -r f; do issue "Flow missing from registry: $f"; done
else
  report "- ✅ Flow registry matches repo count"
fi
report ""

# 6. Index freshness
report "### Index coverage"
indexed=$(rg -c '^\| \[\[' "$WIKI_DIR/index.md" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
total_pages=$(find "$WIKI_DIR" -name '*.md' -not -name 'index.md' -not -name 'log.md' -not -path '*/reports/*' -not -path '*/manifests/*' | wc -l | tr -d ' ')
report "- Index entries: $indexed"
report "- Content pages: $total_pages"
if [[ "$indexed" -lt "$total_pages" ]]; then
  issue "Index may be incomplete: $indexed entries vs $total_pages content pages"
else
  report "- ✅ Index appears complete"
fi
report ""

# Footer
report "## Result"
if [[ $issues -eq 0 ]]; then
  report "✅ No issues found."
else
  report "⚠️ $issues issue(s) found. Review items above."
fi

# Append to log
echo "" >> "$WIKI_DIR/log.md"
echo "## [$DATE] lint | Automated health check" >> "$WIKI_DIR/log.md"
echo "- Report: [[reports/lint-$DATE]]" >> "$WIKI_DIR/log.md"
echo "- Issues: $issues" >> "$WIKI_DIR/log.md"

echo "Lint complete: $issues issue(s)"
echo "Report: $REPORT"
cat "$REPORT"
