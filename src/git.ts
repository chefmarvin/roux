import { execSync } from "child_process";

export interface GitLogOptions {
  repo?: string;
  after?: string;        // --after=2024-01-01
  before?: string;       // --before=2025-01-01
  rev?: string;          // v1.0..v2.0
  followRenames?: boolean; // true (default) → -M, false → --no-renames
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

export function generateGitLog(opts: GitLogOptions = {}): string {
  const cwd = opts.repo ?? process.cwd();
  const followRenames = opts.followRenames !== false;
  const args = [
    "--all", "--numstat", "--date=short",
    "--pretty=format:'--%h--%ad--%aN--%s'",
    followRenames ? "-M" : "--no-renames",
  ];
  if (opts.after)  args.push(`--after=${startOfDay(opts.after)}`);
  if (opts.before) args.push(`--before=${endOfDay(opts.before)}`);
  if (opts.rev) {
    const idx = args.indexOf("--all");
    if (idx !== -1) args.splice(idx, 1);
    args.push(opts.rev);
  }
  // core.quotePath=false: git otherwise quotes and octal-escapes any path
  // outside ASCII, and a quoted path matches no glob, no group definition
  // and no listing of the working tree.
  return execSync(`git -c core.quotePath=false log ${args.join(" ")}`, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });
}
