import type { Modification } from "../parsers/types";

export interface AnalysisOptions {
  minRevs: number;           // default 5
  minSharedRevs: number;     // default 5
  minCoupling: number;       // default 30
  maxCoupling: number;       // default 100
  maxChangesetSize: number;  // default 30
  verboseResults?: boolean;
}

export const defaultOptions: AnalysisOptions = {
  minRevs: 5,
  minSharedRevs: 5,
  minCoupling: 30,
  maxCoupling: 100,
  maxChangesetSize: 30,
};

export type AnalysisFn = (
  data: Modification[],
  options: AnalysisOptions
) => Record<string, unknown>[];
