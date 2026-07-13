#!/usr/bin/env bash
# Search the LLM wiki by keyword (BM25-ish via ripgrep scoring).
# Usage: ./scripts/wiki/search.sh "emergency contact" [--limit N]
set -euo pipefail

WIKI_DIR="$(cd "$(dirname "$0")/../../wiki" && pwd)"
QUERY="${1:-}"
LIMIT="${3:-20}"

if [[ -z "$QUERY" ]]; then
  echo "Usage: $0 \"search query\" [--limit N]"
  exit 1
fi

if [[ "${2:-}" == "--limit" && -n "${3:-}" ]]; then
  LIMIT="$3"
fi

echo "Searching wiki for: $QUERY"
echo "---"

# Search markdown files, show file path and matching lines with context
rg -i --no-heading --line-number --color=never \
  -g '*.md' \
  --sort path \
  -C 0 \
  "$QUERY" "$WIKI_DIR" 2>/dev/null \
  | head -n "$((LIMIT * 3))" \
  | awk -F: '
    {
      file=$1; line=$2; $1=""; $2=""; sub(/^:::/,"");
      if (file != last) { print "\n" file; last=file }
      print "  L" line ":" $0
    }
  '

echo ""
echo "---"
echo "Pages found:"
rg -i -l -g '*.md' "$QUERY" "$WIKI_DIR" 2>/dev/null | sed "s|$WIKI_DIR/||" | head -n "$LIMIT"
