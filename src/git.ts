import { execSync } from "child_process";

const GIT_LOG_FORMAT =
  "--all --numstat --date=short --pretty=format:'--%h--%ad--%aN' --no-renames";

export function generateGitLog(repo?: string): string {
  const cwd = repo ?? process.cwd();
  return execSync(`git log ${GIT_LOG_FORMAT}`, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024, // 100MB for large repos
  });
}
