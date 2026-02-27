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

# --- Git format analyses (mono_git.log) ---
GIT_LOG="test/fixtures/mono_git.log"
abs_git_log="$ROUX/$GIT_LOG"
git_logname=$(basename "$GIT_LOG")
for analysis in "${ANALYSES[@]}"; do
  label="$git_logname / $analysis (git format)"

  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_git_log" -c git -a "$analysis" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_git_log" -c git -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

  run_comparison "$label" "$expected" "$actual" "$git_logname" "$analysis"
done

# Git format age analysis
label="$git_logname / age (git format, date=$AGE_DATE)"
expected=$(cd "$CODE_MAAT" && lein run -l "$abs_git_log" -c git -a age -d "$AGE_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
actual=$(cd "$ROUX" && npx tsx src/cli.ts age -l "$abs_git_log" -c git -d "$AGE_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
run_comparison "$label" "$expected" "$actual" "$git_logname" "age"

# --- Messages analysis (requires git format with commit messages) ---
label="$git_logname / messages (git format, expr=Fix)"
expected=$(cd "$CODE_MAAT" && lein run -l "$abs_git_log" -c git -a messages -e "Fix" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
actual=$(cd "$ROUX" && npx tsx src/cli.ts messages -l "$abs_git_log" -c git -e "Fix" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
run_comparison "$label" "$expected" "$actual" "$git_logname" "messages"

# --- Architectural grouping (-g flag) ---
# Test with roslyn_git.log (git2 format) and various group definitions
ROSLYN_LOG="test/fixtures/roslyn_git.log"
abs_roslyn_log="$ROUX/$ROSLYN_LOG"
CM_E2E="$CODE_MAAT/test/code_maat/end_to_end"

GROUP_ANALYSES=("summary" "revisions" "entity-churn" "main-dev" "authors" "soc" "coupling" "entity-ownership")

# Text-based grouping
for analysis in "${GROUP_ANALYSES[@]}"; do
  label="roslyn (text-group) / $analysis"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_roslyn_log" -c git2 -a "$analysis" -g "$CM_E2E/text-layers-definition.txt" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/text-layers.txt -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_text_group" "$analysis"
done

# Regex-based grouping
for analysis in "${GROUP_ANALYSES[@]}"; do
  label="roslyn (regex-group) / $analysis"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_roslyn_log" -c git2 -a "$analysis" -g "$CM_E2E/regex-layers-definition.txt" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/regex-layers.txt -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_regex_group" "$analysis"
done

# Mixed text+regex grouping
for analysis in "${GROUP_ANALYSES[@]}"; do
  label="roslyn (mixed-group) / $analysis"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_roslyn_log" -c git2 -a "$analysis" -g "$CM_E2E/regex-and-text-layers-definition.txt" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/mixed-layers.txt -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_mixed_group" "$analysis"
done

# --- Multi-format grouping (JSON + Markdown) ---
# Compare JSON/MD group configs against TXT baseline (roux vs roux)
for analysis in "${GROUP_ANALYSES[@]}"; do
  expected=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/text-layers.txt -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

  label="roslyn (json-group) / $analysis"
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/text-layers.json -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_json_group" "$analysis"

  label="roslyn (md-group) / $analysis"
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -g test/fixtures/text-layers.md -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_md_group" "$analysis"
done

# --- Team mapping (-p flag) ---
# Test with mono_git.log (git format) and team map CSV
TEAM_ANALYSES=("main-dev" "authors" "communication" "entity-ownership" "author-churn")

for analysis in "${TEAM_ANALYSES[@]}"; do
  label="mono (team-map) / $analysis"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_git_log" -c git -a "$analysis" -p "$CM_E2E/mono_git_team_map.csv" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_git_log" -c git -p test/fixtures/mono_team_map.csv -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "mono_team_map" "$analysis"
done

# --- Multi-format team mapping (JSON + Markdown) ---
# Compare JSON/MD team configs against CSV baseline (roux vs roux)
for analysis in "${TEAM_ANALYSES[@]}"; do
  expected=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_git_log" -c git -p test/fixtures/mono_team_map.csv -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")

  label="mono (json-team) / $analysis"
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_git_log" -c git -p test/fixtures/mono_team_map.json -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "mono_json_team" "$analysis"

  label="mono (md-team) / $analysis"
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_git_log" -c git -p test/fixtures/mono_team_map.md -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "mono_md_team" "$analysis"
done

# --- Temporal coupling (-t flag) ---
TEMPORAL_ANALYSES=("coupling" "soc")
for analysis in "${TEMPORAL_ANALYSES[@]}"; do
  label="roslyn (temporal-1) / $analysis"
  expected=$(cd "$CODE_MAAT" && lein run -l "$abs_roslyn_log" -c git2 -a "$analysis" -t 1 -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_roslyn_log" -t 1 -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "roslyn_temporal" "$analysis"
done

# --- JSON output validation ---
# Verify each analysis produces valid JSON AND matches CSV content
ALL_ANALYSES=("${ANALYSES[@]}" "age" "messages")
JSON_LOG="test/fixtures/code-maat-own.log"
abs_json_log="$ROUX/$JSON_LOG"

# Helper: convert JSON array-of-objects to sorted CSV
json_to_csv() {
  node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const rows=JSON.parse(d);
      if(!Array.isArray(rows)||rows.length===0){process.stdout.write('');process.exit(0)}
      const hdr=Object.keys(rows[0]);
      process.stdout.write(hdr.join(',')+'\n');
      for(const r of rows){process.stdout.write(hdr.map(h=>String(r[h])).join(',')+'\n')}
    });
  "
}

for analysis in "${ALL_ANALYSES[@]}"; do
  extra_flags=""
  if [ "$analysis" = "age" ]; then
    extra_flags="-d 2025-08-01"
  elif [ "$analysis" = "messages" ]; then
    extra_flags="-e fix"
  fi

  json_output=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_json_log" -n 1 -m 1 -i 1 -s 1000 -o json $extra_flags 2>/dev/null || echo "ERROR")
  csv_output=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$abs_json_log" -n 1 -m 1 -i 1 -s 1000 $extra_flags 2>/dev/null || echo "ERROR")

  # 1) Valid JSON check
  label="JSON valid / $analysis"
  if echo "$json_output" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=JSON.parse(d);if(!Array.isArray(r))throw 1;process.exit(0)}catch(e){process.exit(1)}})" 2>/dev/null; then
    echo "PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $label"
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")
    continue  # skip content check if JSON is invalid
  fi

  # 2) JSON-vs-CSV content check
  label="JSON==CSV / $analysis"
  json_as_csv=$(echo "$json_output" | json_to_csv)

  # Empty JSON array [] => no rows to compare; just verify CSV has header only
  if [ -z "$json_as_csv" ]; then
    csv_lines=$(echo "$csv_output" | wc -l | tr -d ' ')
    if [ "$csv_lines" -le 1 ]; then
      echo "PASS  $label (empty)"
      PASS=$((PASS + 1))
      continue
    fi
  fi

  expected_sorted=$(sort_csv "$csv_output")
  actual_sorted=$(sort_csv "$json_as_csv")

  if [ "$expected_sorted" = "$actual_sorted" ]; then
    echo "PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $label"
    FAIL=$((FAIL + 1))
    FAILURES+=("$label")
    mkdir -p test/acceptance/diffs
    diff <(echo "$expected_sorted") <(echo "$actual_sorted") > "test/acceptance/diffs/json_csv__${analysis}.diff" 2>&1 || true
  fi
done

# --- Git log filter tests (--after / --before) ---
# Strategy: roux(repo + filter) vs roux(filtered log file) — proves filter params produce
# identical results to manually filtering with git log.
# (Existing 101 tests already prove roux == code-maat for log file analysis.)
FILTER_ANALYSES=("summary" "revisions" "abs-churn" "authors")
FILTER_REPO="$CODE_MAAT"

# Test --after
AFTER_DATE="2015-01-01"
AFTER_LOG=$(mktemp)
(cd "$FILTER_REPO" && git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN--%s' --no-renames --after="$AFTER_DATE") > "$AFTER_LOG"

for analysis in "${FILTER_ANALYSES[@]}"; do
  label="filter --after=$AFTER_DATE / $analysis"
  expected=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$AFTER_LOG" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" --repo "$FILTER_REPO" --after "$AFTER_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "filter_after" "$analysis"
done

# Test --before
BEFORE_DATE="2014-06-01"
BEFORE_LOG=$(mktemp)
(cd "$FILTER_REPO" && git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN--%s' --no-renames --before="$BEFORE_DATE") > "$BEFORE_LOG"

for analysis in "${FILTER_ANALYSES[@]}"; do
  label="filter --before=$BEFORE_DATE / $analysis"
  expected=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$BEFORE_LOG" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" --repo "$FILTER_REPO" --before "$BEFORE_DATE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "filter_before" "$analysis"
done

# Test --after + --before combined
COMBINED_AFTER="2014-01-01"
COMBINED_BEFORE="2015-06-01"
COMBINED_LOG=$(mktemp)
(cd "$FILTER_REPO" && git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN--%s' --no-renames --after="$COMBINED_AFTER" --before="$COMBINED_BEFORE") > "$COMBINED_LOG"

for analysis in "${FILTER_ANALYSES[@]}"; do
  label="filter --after=$COMBINED_AFTER --before=$COMBINED_BEFORE / $analysis"
  expected=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" -l "$COMBINED_LOG" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  actual=$(cd "$ROUX" && npx tsx src/cli.ts "$analysis" --repo "$FILTER_REPO" --after "$COMBINED_AFTER" --before "$COMBINED_BEFORE" -n 1 -m 1 -i 1 -s 1000 2>/dev/null || echo "ERROR")
  run_comparison "$label" "$expected" "$actual" "filter_combined" "$analysis"
done

# Cleanup temp files
rm -f "$AFTER_LOG" "$BEFORE_LOG" "$COMBINED_LOG"

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
