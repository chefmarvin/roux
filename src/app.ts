import { readFileSync } from "fs";
import { parseGit2Log } from "./parsers/git2";
import { analyses } from "./analysis";
import { defaultOptions, type AnalysisOptions } from "./analysis/types";
import { toCSV } from "./output/csv";
import { generateGitLog } from "./git";

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
  const modifications = parseGit2Log(text);
  const options: AnalysisOptions = { ...defaultOptions, ...opts };
  let result = analysisFn(modifications, options);

  if (opts.rows && opts.rows > 0) {
    result = result.slice(0, opts.rows);
  }

  return toCSV(result);
}
