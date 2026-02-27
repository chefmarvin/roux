import { execSync } from "child_process";

export interface GitLogOptions {
  repo?: string;
  after?: string;   // --after=2024-01-01
  before?: string;  // --before=2025-01-01
  rev?: string;     // v1.0..v2.0
}

export function generateGitLog(opts: GitLogOptions = {}): string {
  const cwd = opts.repo ?? process.cwd();
  const args = [
    "--all", "--numstat", "--date=short",
    "--pretty=format:'--%h--%ad--%aN--%s'", "--no-renames",
  ];
  if (opts.after)  args.push(`--after=${opts.after}`);
  if (opts.before) args.push(`--before=${opts.before}`);
  if (opts.rev) {
    const idx = args.indexOf("--all");
    if (idx !== -1) args.splice(idx, 1);
    args.push(opts.rev);
  }
  return execSync(`git log ${args.join(" ")}`, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });
}
