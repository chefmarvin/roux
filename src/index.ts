// Public API — import { analyze, parseGitLog } from "roux"
export { run as analyze } from "./app.js";
export type { AppOptions } from "./app.js";
export { parseGit2Log as parseGitLog } from "./parsers/git2.js";
export { generateGitLog } from "./git.js";
export type { GitLogOptions } from "./git.js";
export { analyses } from "./analysis/index.js";
export type { Modification } from "./parsers/types.js";
export type { AnalysisFn, AnalysisOptions } from "./analysis/types.js";
export { applyRenameTracking, buildRenameMap } from "./transforms/rename-tracker.js";
export { parseRenamePath } from "./parsers/rename.js";
