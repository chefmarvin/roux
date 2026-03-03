import { parseGit2Log } from "./git2.js";
import { parseGitLog } from "./git.js";

export const parsers = {
  git2: parseGit2Log,
  git: parseGitLog,
} as const;

export type VcsType = keyof typeof parsers;
