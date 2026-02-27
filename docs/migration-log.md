# Migration Log: code-maat (Clojure) → roux (TypeScript)

This document tracks the incremental migration of code-maat's analysis capabilities into roux, a TypeScript reimplementation.

---

## Phase 1: Scaffolding + Core Analyses

**Status:** Completed

- Project initialized with **npm** runtime, **TypeScript**, **Jest** (ts-jest ESM)
- Dependencies: **commander** (CLI), **tsx** (dev runner)
- Core types: `Modification`, `AnalysisOptions`, `AnalysisFn`
- Dataset utilities: `groupBy`, `orderBy`
- Git2 log parser
- 8 analyses: summary, authors, revisions, coupling, soc, abs-churn, entity-churn, author-churn
- CLI via commander subcommands + programmatic API
- CSV output formatter
- Acceptance tests vs code-maat: all 8 analyses pass on 2 log files
- **21 unit tests, 16 acceptance tests**

---

## Phase 2: Full Analysis Suite + Infrastructure

**Status:** Completed

### Agent Team Execution

Used Claude Code Agent Teams with 7 members working in parallel:

| Agent | Tasks | Output |
|-------|-------|--------|
| infra-agent | Grouper, team-mapper, temporal-grouper, pipeline integration | 3 transform modules, 14 tests |
| analysis-a | age, entity-ownership, identity | 3 analyses, 8 tests |
| analysis-b | main-dev, main-dev-by-revs, refactoring-main-dev | 3 analyses, 7 tests |
| analysis-c | entity-effort, fragmentation | 2 analyses, 7 tests |
| analysis-d | communication, messages | 2 analyses, 6 tests |
| integrator | Register analyses, acceptance tests, fix loop | Wired 18 analyses, 34 acceptance tests |

### New Infrastructure

- **Grouper** (`src/transforms/grouper.ts`) — map entities to architectural layers via group spec file (`-g` flag)
- **Team Mapper** (`src/transforms/team-mapper.ts`) — map authors to teams via CSV (`-p` flag)
- **Temporal Grouper** (`src/transforms/temporal-grouper.ts`) — sliding window analysis (`-t` flag)
- **JSON Output** (`src/output/json.ts`) — `-o json` flag
- **Pipeline**: parse → group → temporal → team-map → analyze → format

### New Analyses (10)

| Analysis | Description | Output columns |
|----------|-------------|---------------|
| age | Months since last change per entity | entity, age-months |
| entity-ownership | LOC contributions by author per entity | entity, author, added, deleted |
| main-dev | Primary developer by lines added | entity, main-dev, added, total-added, ownership |
| main-dev-by-revs | Primary developer by revision count | entity, main-dev, added, total-added, ownership |
| refactoring-main-dev | Primary refactorer by lines deleted | entity, main-dev, removed, total-removed, ownership |
| entity-effort | Revision effort distribution | entity, author, author-revs, total-revs |
| fragmentation | Knowledge fragmentation (fractal value) | entity, fractal-value, total-revs |
| communication | Author communication strength | author, peer, shared, average, strength |
| messages | Commit message pattern matching | entity, matches |
| identity | Raw modification data (debug) | author, rev, date, entity, message, loc-added, loc-deleted |

### Code-maat Compatibility Fixes

| Issue | Fix |
|-------|-----|
| Clojure `1.0` vs JS `1` for ownership | Format as string with trailing `.0` |
| `ratio->centi-float-precision` (2 sig figs) | `toPrecision(2)` for fragmentation |
| FP accumulation (`0.65^2` precision) | `toPrecision(10)` intermediate |
| Identity column order | Match code-maat: author, rev, date, entity, message, loc-added, loc-deleted |
| Binary file rendering | `-1` → `"-"` in identity output |
| Zero-count entities | Include entities with 0 added/removed |
| Tie-breaking | `>=` (last author wins) matches Clojure `(first (reverse (sort-by ...)))` |
| Empty result headers | CSV outputs header row even with no data |

### Final Metrics

- **18 analyses** (8 Phase 1 + 10 Phase 2)
- **3 transforms** (grouper, team-mapper, temporal-grouper)
- **63 unit tests** — ALL PASS
- **34 acceptance tests** — ALL PASS (vs code-maat on 2 log files)
- **CLI flags**: `-l`, `-r`, `-n`, `-m`, `-i`, `-x`, `-s`, `-o`, `-g`, `-p`, `-t`, `-d`, `-e`

---

## Porting Decisions

| Clojure | TypeScript (roux) | Rationale |
|---------|-------------------|-----------|
| Maps (hash-maps) | `Record<string, unknown>[]` | Native JS object arrays; easy to serialize |
| Keywords (`:entity`) | String keys | CSV headers match code-maat output |
| Lazy sequences | Arrays (eager) | Git logs fit in memory; simplicity over laziness |
| `group-by` | `groupBy` returning `Map` | Preserves insertion order |
| `:binary` marker | `locAdded === -1` | Mirrors code-maat convention |
| `ratio->centi-float-precision` | `toPrecision(2)` | 2 significant figures, not 2 decimal places |
| `(first (reverse (sort-by ...)))` | `>=` comparison | Last-wins tie-breaking |

---

## Architecture

```
git log (git2 format)
        │
        ▼
   git2 parser          (text → Modification[])
        │
        ▼
   transforms           (optional: group → temporal → team-map)
        │
        ▼
   AnalysisFn           (Modification[] → Record<string, unknown>[])
        │
        ▼
   CSV / JSON formatter  (Record[] → string)
```

- **Functional pipeline** — no classes, pure functions throughout
- **Dual interface**: CLI subcommands + programmatic API
- **Tech stack**: TypeScript, npm, Jest (ts-jest ESM), Commander.js

---

## Not Yet Ported

- Git format parser (only git2 supported; commit messages unavailable)
- Exclude patterns (`-X` flag)
- SVN / Mercurial / Perforce parsers
- See `code-maat/docs/plans/2026-02-27-roux-phase3-plan.md` for Phase 3
