import type { AnalysisFn } from "./types";
import { summary } from "./summary";
import { authors } from "./authors";
import { revisions } from "./revisions";
import { coupling, sumOfCoupling } from "./coupling";
import { absoluteChurn, churnByEntity, churnByAuthor } from "./churn";
import { age } from "./age";
import { entityOwnership } from "./entity-ownership";
import { mainDev } from "./main-dev";
import { mainDevByRevs } from "./main-dev-by-revs";
import { refactoringMainDev } from "./refactoring-main-dev";
import { entityEffort } from "./entity-effort";
import { fragmentation } from "./fragmentation";
import { communication } from "./communication";
import { messages } from "./messages";
import { identity } from "./identity";

/** Column headers for each analysis, used when results are empty */
export const analysisHeaders: Record<string, string[]> = {
  summary: ["statistic", "value"],
  authors: ["entity", "n-authors", "n-revs"],
  revisions: ["entity", "n-revs"],
  coupling: ["entity", "coupled", "degree", "average-revs"],
  soc: ["entity", "soc"],
  "abs-churn": ["date", "added", "deleted", "commits"],
  "entity-churn": ["entity", "added", "deleted", "commits"],
  "author-churn": ["author", "added", "deleted", "commits"],
  age: ["entity", "age-months"],
  "entity-ownership": ["entity", "author", "added", "deleted"],
  "main-dev": ["entity", "main-dev", "added", "total-added", "ownership"],
  "main-dev-by-revs": ["entity", "main-dev", "added", "total-added", "ownership"],
  "refactoring-main-dev": ["entity", "main-dev", "removed", "total-removed", "ownership"],
  "entity-effort": ["entity", "author", "author-revs", "total-revs"],
  fragmentation: ["entity", "fractal-value", "total-revs"],
  communication: ["author", "peer", "shared", "average", "strength"],
  messages: ["entity", "matches"],
  identity: ["author", "rev", "date", "entity", "message", "loc-added", "loc-deleted"],
};

export const analyses: Record<string, AnalysisFn> = {
  // Phase 1
  summary,
  authors,
  revisions,
  coupling,
  soc: sumOfCoupling,
  "abs-churn": absoluteChurn,
  "entity-churn": churnByEntity,
  "author-churn": churnByAuthor,
  // Phase 2
  age,
  "entity-ownership": entityOwnership,
  "main-dev": mainDev,
  "main-dev-by-revs": mainDevByRevs,
  "refactoring-main-dev": refactoringMainDev,
  "entity-effort": entityEffort,
  fragmentation,
  communication,
  messages,
  identity,
};
