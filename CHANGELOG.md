# Changelog

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
