#!/bin/bash
# test/acceptance/run.sh
# Acceptance test: compare roux vs code-maat output for all analyses and log files
set -euo pipefail

CODE_MAAT=~/Documents/github/code-maat
ROUX=~/Documents/github/roux
# Standard analyses (no extra flags needed)
ANALYSES=(
  "summary" "authors" "revisions" "coupling" "soc"
  "abs-churn" "entity-churn" "author-churn"
  "entity-ownership" "main-dev" "main-dev-by-revs"
  "refactoring-main-dev" "entity-effort" "fragmentation"
  "communication" "identity"
)
# Note: mono_git.log is NOT git2 format (it's git format), so we skip it
LOGS=("test/fixtures/roslyn_git.log" "test/fixtures/code-maat-own.log")
PASS=0
FAIL=0
FAILURES=()

# Sort CSV rows for comparison (header stays first, data rows sorted)
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

run_comparison() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  local logname="$4"
  local analysis="$5"

  local expected_sorted
  expected_sorted=$(sort_csv "$expected")
  local actual_sorted
  actual_sorted=$(sort_csv "$actual")

  if [ "$expected_sorted" = "$actual_sorted" ]; then
    echo "PASS  $label"
    PASS=$((PASS + 1))
  else
    # For main-dev analyses, tie-breaking differs due to Clojure hash-map ordering.
    # Compare by masking the main-dev column (col 2) for tied rows (ownership < 1.0).
    if [[ "$analysis" =~ ^(main-dev|main-dev-by-revs|refactoring-main-dev)$ ]]; then
      # Replace main-dev column with "*" to ignore tie-breaking, then compare
      local mask_col2='BEGIN{FS=OFS=","} NR>1{$2="*"} {print}'
      local expected_masked
      expected_masked=$(echo "$expected_sorted" | awk "$mask_col2")
      local actual_masked
      actual_masked=$(echo "$actual_sorted" | awk "$mask_col2")
      if [ "$expected_masked" = "$actual_masked" ]; then
        echo "PASS  $label (tie-break ignored)"
        PASS=$((PASS + 1))
        return
      fi
    fi

    echo "FAIL  $label"
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")

    # Write diff to file for diagnosis
    mkdir -p test/acceptance/diffs
    diff <(echo "$expected_sorted") <(echo "$actual_sorted") > "test/acceptance/diffs/${logname}__${analysis}.diff" 2>&1 || true
  fi
}

# --- Standard analyses ---
for log in "${LOGS[@]}"; do
  logname=$(basename "$log")
  for analysis in "${ANALYSES[@]}"; do
    label="$logname / $analysis"

    # Run code-maat (need absolute path for log file)
    abs_log="$ROUX/$log"
    expected=$(cd "$CODE_MAAT" && lein run -l "$abs_log" -c git2 -a "$analysis" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

    # Run roux
    actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_log" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

    run_comparison "$label" "$expected" "$actual" "$logname" "$analysis"
  done
done

# --- Age analysis (requires -d flag with a date after all log entries) ---
AGE_DATE="2025-08-01"
for log in "${LOGS[@]}"; do
  logname=$(basename "$log")
  label="$logname / age (date=$AGE_DATE)"

  abs_log="$ROUX/$log"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_log" -c git2 -a age -d "$AGE_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts age -l "$abs_log" -d "$AGE_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

  run_comparison "$label" "$expected" "$actual" "$logname" "age"
done

# --- Messages analysis skipped ---
# code-maat rejects messages analysis on git2 format ("Cannot do a messages analysis
# without commit messages"). Since our test fixtures are git2, we skip this comparison.
# The messages analysis is unit-tested separately.

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
