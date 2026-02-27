// Public API — import { analyze, parseGitLog } from "roux"
export { run as analyze } from "./app";
export type { AppOptions } from "./app";
export { parseGit2Log as parseGitLog } from "./parsers/git2";
export { generateGitLog } from "./git";
export type { GitLogOptions } from "./git";
export { analyses } from "./analysis";
export type { Modification } from "./parsers/types";
export type { AnalysisFn, AnalysisOptions } from "./analysis/types";
