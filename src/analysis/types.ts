import type { Modification } from "../parsers/types";

export interface AnalysisOptions {
  minRevs: number;           // default 5
  minSharedRevs: number;     // default 5
  minCoupling: number;       // default 30
  maxCoupling: number;       // default 100
  maxChangesetSize: number;  // default 30
  verboseResults?: boolean;
  ageTimeNow?: string;          // -d flag, "YYYY-MM-DD"
  expressionToMatch?: string;   // -e flag, regex pattern
  groupFile?: string;           // -g flag, path to group spec
  teamMapFile?: string;         // -p flag, path to team CSV
  temporalPeriod?: number;      // -t flag, days in sliding window
  outputFormat?: "csv" | "json"; // -o flag
  logFormat?: "git2" | "git";    // -c flag, input log format
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
