# Migration Log: code-maat (Clojure) to roux (TypeScript)

This document tracks the incremental migration of code-maat's analysis capabilities into roux, a TypeScript reimplementation built on Bun.

---

## Phase 1: Scaffolding

**Status:** Completed

- Project initialized with **Bun** runtime and **TypeScript**
- Dependencies: **commander** (CLI framework)
- Core types defined:
  - `Modification` -- parser output representing a single file change in a commit
  - `AnalysisOptions` -- options bag passed to every analysis function
  - `AnalysisFn` -- the analysis contract: `(rows: Modification[], opts: AnalysisOptions) => Record<string, unknown>[]`
- Dataset utilities:
  - `groupBy` -- Map-based grouping (`Map<unknown, T[]>`)
  - `orderBy` -- sort with configurable direction
- TDD workflow: tests written first, verified failing, then implementation verified passing
- 2 commits: project init + core types/utils

---

## Phase 2: Parser + Analyses

**Status:** In progress

Four agents working in parallel on isolated worktree branches:

| Agent | Branch | Scope |
|-------|--------|-------|
| parser-agent | `feat/git2-parser` | git2 log parser |
| analysis-a | `feat/basic-analyses` | summary, authors, revisions |
| analysis-b | `feat/coupling-analysis` | coupling, soc (sum of coupling) |
| analysis-c | `feat/churn-analysis` | absolute churn, entity churn, author churn |

---

## Porting Decisions

Decisions made when translating Clojure idioms into TypeScript:

| Clojure | TypeScript (roux) | Rationale |
|---------|-------------------|-----------|
| Maps (hash-maps) | `Record<string, unknown>[]` | Native JS object arrays; easy to serialize to CSV |
| Keywords (`:entity`, `:rev`) | String keys, camelCase internally | Idiomatic JS naming; CSV headers can differ from internal keys |
| Lazy sequences | Arrays (eager evaluation) | Git logs are finite and fit in memory; simplicity over laziness |
| `group-by` | `groupBy` returning `Map<unknown, T[]>` | Map preserves insertion order and avoids prototype pollution |
| `:binary` marker | `locAdded === -1 && locDeleted === -1` | Mirrors code-maat's convention for binary file detection |

---

## Architecture

```
git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN'
        |
        v
   git2 parser          (text -> Modification[])
        |
        v
   AnalysisFn           (Modification[] -> Record<string, unknown>[])
        |
        v
   CSV formatter         (Record[] -> string)
```

- **Functional pipeline** -- no classes, pure functions throughout
- **Dual interface**:
  - CLI via commander subcommands (`roux summary`, `roux coupling`, etc.)
  - Programmatic API (`import { summary, coupling } from "roux"`)

---

## Phase 3: Integration

**Status:** Planned

_Placeholder -- to be filled after Phase 2 branches are merged._

- [ ] Analysis registry wiring
- [ ] CSV output formatter
- [ ] CLI subcommand registration
- [ ] Public API surface (`index.ts` exports)
- [ ] End-to-end tests against a sample git log

---

## Phase 4: Acceptance Testing

**Status:** Planned

_Placeholder -- to be filled after Phase 3 is complete._

- [ ] Run roux against real repositories
- [ ] Compare output with code-maat for correctness
- [ ] Performance benchmarking
- [ ] Edge-case and error-handling review
