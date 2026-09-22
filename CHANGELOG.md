# Changelog

## 0.4.0

### Added

- **Group definitions can be passed inline.** `analyze({ groups: "src/api => API\n..." })`
  takes the same syntax as a group file, for callers that build the mapping
  in code rather than keeping it on disk. The CLI continues to use `-g`.

### Fixed

- **The CLI returned nothing when run from a script.** 0.3.2 started
  treating an empty `input` as an empty history, which was right for the
  programmatic API but wrong for the CLI: a non-TTY stdin reads as an empty
  string, so `-l` and `--repo` were silently ignored and every run printed
  only a header. Interactive use was unaffected, which is why it went
  unnoticed. Anything driving roux from a script should skip 0.3.2.

## 0.3.2

### Fixed

- **An empty log was treated as no input at all.** `analyze({ input: "" })`
  fell through to generating a log from the current working directory, so a
  date range with no commits in it reported on whatever repository the
  process happened to be sitting in — silently, and with entirely plausible
  numbers. Now an empty input means an empty history.

  Reached through any caller that slices a range into periods and analyses
  each one: quiet periods came back full of another repository's data.

## 0.3.1

### Fixed

- **`--after` and `--before` dropped commits on the boundary date.** git
  resolves a bare date through approxidate, which fills in the missing time
  from the current clock rather than from midnight, so `--after=2025-09-01`
  skipped commits made earlier that day — and skipped a different number of
  them depending on what time the analysis ran. Bare dates are now pinned to
  `T00:00:00` and `T23:59:59`, making the range the whole day at both ends.
  Values that already carry a time are passed through untouched.

  Only affects `--repo`; analysing a pre-generated log with `-l` was never
  impacted. The existing tests missed this because they asserted that every
  returned date fell inside the range, which says nothing about dates that
  went missing.

## 0.3.0

Threshold handling now matches code-maat exactly. Output changes for
`coupling`, `soc`, `revisions` and `authors` whenever a threshold is left at
its default or raised — if you always passed `-n 1 -m 1 -i 1 -s 1000`, nothing
changes for you.

### Fixed

- **`coupling` dropped pairs it should have kept.** The `--min-revs` threshold
  was applied to each entity separately; code-maat applies it to the pair's
  average (`logical_coupling.clj` passes `average-revs` to `within-threshold?`).
  Requiring both entities to clear the bar discarded exactly the finding this
  analysis is for: a stable module repeatedly dragged along by a churning one.

- **`coupling` counted revisions over the unfiltered log.** code-maat counts
  them over the changesets that survived `--max-changeset-size`. A sweeping
  commit inflated revision counts, diluted the coupling degree, and pushed
  pairs below `--min-coupling`. In a 363-revision history with 21 oversized
  commits this cost 82 of 268 pairs.

- **`soc` applied `--max-changeset-size`.** code-maat applies that filter only
  in `co-changing-by-revision`, which the soc analysis never calls.

- **`revisions` and `authors` applied `--min-revs`.** code-maat does not:
  `entities.clj/by-revision` and `authors.clj/by-count` accept an options map
  and never read it. With the default of 5, roux silently dropped 38% of the
  entities in the reference history. These listings are sorted descending, so
  low-frequency files sink to the bottom on their own.

### Testing

- Acceptance runs now sweep three threshold sets per analysis — permissive
  (`-n 1 -m 1 -i 1 -s 1000`), default, and strict (`-n 10 -m 3 -i 50 -s 20`).
  Every run previously used the permissive set, which disables all four
  filters; all four bugs above lived in the columns that were never compared.

## 0.2.2

- Add shebang to `cli.ts` so the `roux` command works when installed globally.
- Switch to `nodenext` module resolution for proper ESM support.

## 0.2.0

- 18 analyses, architectural grouping, team mapping, temporal coupling.
