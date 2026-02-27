import { readFileSync } from "fs";
import { parseGit2Log } from "./parsers/git2";
import { analyses } from "./analysis";
import { defaultOptions, type AnalysisOptions } from "./analysis/types";
import { toCSV } from "./output/csv";
import { toJSON } from "./output/json";
import { generateGitLog } from "./git";
import { parseGroupFile, applyGrouping } from "./transforms/grouper";
import { parseTeamMap, applyTeamMapping } from "./transforms/team-mapper";
import { applyTemporalGrouping } from "./transforms/temporal-grouper";

export interface AppOptions extends Partial<AnalysisOptions> {
  log?: string;         // log file path
  repo?: string;        // git repo path
  input?: string;       // raw log text (from stdin)
  analysis: string;
  rows?: number;
}

function getLogText(opts: AppOptions): string {
  if (opts.input) return opts.input;
  if (opts.log) return readFileSync(opts.log, "utf-8");
  return generateGitLog(opts.repo);
}

export function run(opts: AppOptions): string {
  const analysisFn = analyses[opts.analysis];
  if (!analysisFn) {
    const available = Object.keys(analyses).join(", ");
    throw new Error(`Unknown analysis "${opts.analysis}". Available: ${available}`);
  }

  const text = getLogText(opts);
  let modifications = parseGit2Log(text);
  // Filter out undefined values so defaults aren't overridden
  const defined = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined)
  );
  const options: AnalysisOptions = { ...defaultOptions, ...defined };

  if (options.groupFile) {
    const specs = parseGroupFile(readFileSync(options.groupFile, "utf-8"));
    modifications = applyGrouping(modifications, specs);
  }
  if (options.temporalPeriod) {
    modifications = applyTemporalGrouping(modifications, options.temporalPeriod);
  }
  if (options.teamMapFile) {
    const teamMap = parseTeamMap(readFileSync(options.teamMapFile, "utf-8"));
    modifications = applyTeamMapping(modifications, teamMap);
  }

  let result = analysisFn(modifications, options);

  if (opts.rows && opts.rows > 0) {
    result = result.slice(0, opts.rows);
  }

  const formatter = options.outputFormat === "json" ? toJSON : toCSV;
  return formatter(result);
}
