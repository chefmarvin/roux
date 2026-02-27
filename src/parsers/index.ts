import { parseGit2Log } from "./git2";

export const parsers = {
  git2: parseGit2Log,
} as const;

export type VcsType = keyof typeof parsers;
