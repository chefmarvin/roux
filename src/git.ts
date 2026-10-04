import { execFileSync } from "child_process";

import { maybeCachedLog } from "./cache.js";

export interface GitLogOptions {
  repo?: string;
  after?: string;        // --after=2024-01-01
  before?: string;       // --before=2025-01-01
  rev?: string;          // v1.0..v2.0
  followRenames?: boolean; // true (default) → -M, false → --no-renames
  /**
   * Reuse the log cached from an earlier run, asking git only for what
   * has happened since. Off by default: a library should not start
   * writing to somebody's disk because it was convenient.
   *
   * Only a whole history is cached. Asking for a range or a revision
   * goes straight to git.
   */
  cache?: boolean;
  /** Where cached logs live. Defaults to the user's cache directory. */
  cacheDir?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pin a bare date to a specific moment.
 *
 * git resolves an underspecified date through approxidate, which fills the
 * missing time from the current clock rather than from midnight. Left alone,
 * `--after=2025-09-01` silently skips commits made earlier that day, and how
 * many it skips depends on what time the analysis runs. Anything already
 * carrying a time is passed through untouched.
 */
function startOfDay(date: string): string {
  return DATE_ONLY.test(date) ? `${date}T00:00:00` : date;
}

function endOfDay(date: string): string {
  return DATE_ONLY.test(date) ? `${date}T23:59:59` : date;
}

/**
 * The whole git invocation, as an argument list.
 *
 * One definition of how to ask git for a history, exported so a caller
 * that wants to run it some other way — through a different runner, over
 * a connection, with its own range appended — does not have to assemble a
 * second copy. A second copy is how the format string and the parser come
 * to disagree, and they sit in the same package precisely so they cannot.
 *
 * core.quotePath=false because git otherwise quotes and octal-escapes any
 * path outside ASCII, and a quoted path matches no glob, no group
 * definition and no listing of a working tree.
 *
 * The pretty format carries no quotes of its own: these arguments are
 * handed to git directly, and a shell's quotes would arrive as part of
 * the data.
 */
export function gitLogArgs(opts: GitLogOptions = {}): string[] {
  const followRenames = opts.followRenames !== false;
  const args = [
    "-c", "core.quotePath=false",
    "log",
    "--all", "--numstat", "--date=short",
    "--pretty=format:--%h--%ad--%aN--%s",
    followRenames ? "-M" : "--no-renames",
  ];
  if (opts.after)  args.push(`--after=${startOfDay(opts.after)}`);
  if (opts.before) args.push(`--before=${endOfDay(opts.before)}`);
  if (opts.rev) {
    const idx = args.indexOf("--all");
    if (idx !== -1) args.splice(idx, 1);
    args.push(opts.rev);
  }
  return args;
}

export function generateGitLog(opts: GitLogOptions = {}): string {
  return maybeCachedLog(opts) ?? execFileSync("git", gitLogArgs(opts), {
    cwd: opts.repo ?? process.cwd(),
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });
}
