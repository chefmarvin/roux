import { readFileSync } from "fs";
import { parsers, type VcsType } from "./parsers";
import { analyses, analysisHeaders } from "./analysis";
import { defaultOptions, type AnalysisOptions } from "./analysis/types";
import { toCSV } from "./output/csv";
import { toJSON } from "./output/json";
import { generateGitLog } from "./git";
import { parseGroupConfig, applyGrouping } from "./transforms/grouper";
import { parseTeamConfig, applyTeamMapping } from "./transforms/team-mapper";
import { applyTemporalGrouping } from "./transforms/temporal-grouper";

export interface AppOptions extends Partial<AnalysisOptions> {
  log?: string;         // log file path
  repo?: string;        // git repo path
  input?: string;       // raw log text (from stdin)
  analysis: string;
  rows?: number;
  after?: string;       // --after=2024-01-01
  before?: string;      // --before=2025-01-01
  rev?: string;         // v1.0..v2.0
}

function getLogText(opts: AppOptions): string {
  if (opts.input) return opts.input;
  if (opts.log) return readFileSync(opts.log, "utf-8");
  return generateGitLog({ repo: opts.repo, after: opts.after, before: opts.before, rev: opts.rev });
}

export function run(opts: AppOptions): string {
  const analysisFn = analyses[opts.analysis];
  if (!analysisFn) {
    const available = Object.keys(analyses).join(", ");
    throw new Error(`Unknown analysis "${opts.analysis}". Available: ${available}`);
  }

  const text = getLogText(opts);
  // Filter out undefined values so defaults aren't overridden
  const defined = Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined)
  );
  const options: AnalysisOptions = { ...defaultOptions, ...defined };

  const format: VcsType = options.logFormat ?? "git2";
  const parser = parsers[format];
  if (!parser) {
    throw new Error(`Unknown log format "${format}". Available: ${Object.keys(parsers).join(", ")}`);
  }
  let modifications = parser(text);

  if (options.groupFile) {
    const specs = parseGroupConfig(options.groupFile);
    modifications = applyGrouping(modifications, specs);
  }
  if (options.temporalPeriod) {
    modifications = applyTemporalGrouping(modifications, options.temporalPeriod);
  }
  if (options.teamMapFile) {
    const teamMap = parseTeamConfig(options.teamMapFile);
    modifications = applyTeamMapping(modifications, teamMap);
  }

  let result = analysisFn(modifications, options);

  if (opts.rows && opts.rows > 0) {
    result = result.slice(0, opts.rows);
  }

  if (options.outputFormat === "json") {
    return toJSON(result);
  }
  return toCSV(result, analysisHeaders[opts.analysis]);
}
