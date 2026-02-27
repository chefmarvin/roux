#!/bin/bash
# test/acceptance/run.sh
# Acceptance test: compare roux vs code-maat output for all analyses and log files
set -euo pipefail

CODE_MAAT=~/Documents/github/code-maat
ROUX=~/Documents/github/roux
ANALYSES=("summary" "authors" "revisions" "coupling" "soc" "abs-churn" "entity-churn" "author-churn")
# Note: mono_git.log is NOT git2 format (it's git format), so we skip it
LOGS=("test/fixtures/roslyn_git.log" "test/fixtures/code-maat-own.log")
PASS=0
FAIL=0
FAILURES=()

for log in "${LOGS[@]}"; do
  logname=$(basename "$log")
  for analysis in "${ANALYSES[@]}"; do
    label="$logname / $analysis"

    # Run code-maat (need absolute path for log file)
    abs_log="$ROUX/$log"
    expected=$(cd "$CODE_MAAT" && lein run -l "$abs_log" -c git2 -a "$analysis" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

    # Run roux
    actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_log" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

    # Sort rows for comparison (header stays first, data rows sorted)
    # This handles tie-breaking differences between Clojure hash-map and JS alphabetical ordering
    sort_csv() {
      local input="$1"
      local header
      header=$(echo "$input" | head -1)
      local body
      body=$(echo "$input" | tail -n +2 | sort)
      echo "$header"
      echo "$body"
    }
    expected_sorted=$(sort_csv "$expected")
    actual_sorted=$(sort_csv "$actual")

    if [ "$expected_sorted" = "$actual_sorted" ]; then
      echo "PASS  $label"
      ((PASS++))
    else
      echo "FAIL  $label"
      ((FAIL++))
      FAILURES+=("$label")

      # Write diff to file for agent diagnosis
      mkdir -p test/acceptance/diffs
      diff <(echo "$expected_sorted") <(echo "$actual_sorted") > "test/acceptance/diffs/${logname}__${analysis}.diff" 2>&1 || true
    fi
  done
done

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  echo ""
  echo "Diffs saved to test/acceptance/diffs/"
fi
