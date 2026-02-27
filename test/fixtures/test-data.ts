import type { Modification } from "../../src/parsers/types";
import type { AnalysisOptions } from "../../src/analysis/types";

export const simple: Modification[] = [
  { entity: "B", rev: "2", author: "ta", date: "2013-11-11", locAdded: 20, locDeleted: 2 },
  { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
  { entity: "B", rev: "1", author: "at", date: "2013-11-10", locAdded: 1, locDeleted: 1 },
  { entity: "B", rev: "3", author: "at", date: "2013-11-11", locAdded: 2, locDeleted: 0 },
];

export const withBinary: Modification[] = [
  { entity: "binary", rev: "1", author: "at", date: "2013-11-10", locAdded: -1, locDeleted: -1 },
];

export const vcs: Modification[] = [
  { author: "apt", entity: "A", rev: "1", date: "2023-01-01", locAdded: 10, locDeleted: 1 },
  { author: "apt", entity: "B", rev: "1", date: "2023-01-01", locAdded: 5, locDeleted: 0 },
  { author: "apt", entity: "A", rev: "2", date: "2023-01-02", locAdded: 3, locDeleted: 2 },
  { author: "jt",  entity: "A", rev: "3", date: "2023-01-03", locAdded: 7, locDeleted: 1 },
];

export const lowThresholds: AnalysisOptions = {
  minRevs: 1,
  minSharedRevs: 1,
  minCoupling: 50,
  maxCoupling: 100,
  maxChangesetSize: 10,
};
