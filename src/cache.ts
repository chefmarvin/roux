import { execFileSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { gitLogArgs } from "./git.js";
import type { GitLogOptions } from "./git.js";

export interface CacheOptions {
  repo?: string;
  followRenames?: boolean;
  /** Where to keep cached logs. Defaults to the user's cache directory. */
  cacheDir?: string;
}

/**
 * Bumped whenever the log we write changes shape, so a cache from before
 * the change is never read. A stale cache is worse than no cache: the run
 * succeeds and answers the old way.
 *
 * 1: first version written by roux.
 */
const FORMAT_VERSION = 1;

/** Header lines, in the order they are written. */
const REFS = "# refs ";
const MAILMAP = "# mailmap ";

function git(repo: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf-8",
    maxBuffer: 512 * 1024 * 1024,
  });
}

function defaultCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "roux");
}

/**
 * Where one repository's log is cached.
 *
 * The key covers only what makes a log a different log — a different
 * question, which you might ask alternately and want both answers kept.
 * Things that merely make the stored answer wrong, like a changed
 * .mailmap, belong in the freshness check instead: there is no reason to
 * keep the superseded copy.
 */
export function cacheLocation(opts: CacheOptions): string {
  const key = createHash("sha256")
    .update(`${opts.repo ?? process.cwd()}\u0000${opts.followRenames !== false}\u0000${FORMAT_VERSION}`)
    .digest("hex")
    .slice(0, 16);

  return join(opts.cacheDir ?? defaultCacheDir(), `${key}.log`);
}

/**
 * Whether a log can be cached at all.
 *
 * Only a repository's whole history is worth storing under its name. A
 * log narrowed to a range or a revision is a different, smaller thing,
 * and keeping it there would hand the next run — asking the wider
 * question — an answer missing most of it.
 */
function cacheable(opts: GitLogOptions): boolean {
  return opts.cache === true && !opts.after && !opts.before && !opts.rev;
}

/**
 * A repository's full history, reusing what was cached last time.
 *
 * Generating the log is where the time goes — on a repository of a few
 * thousand commits it is over a minute, against a tenth of a second for
 * the analysis itself — and almost all of that work is repeated on every
 * run. Caching turns the second run into "what happened since?".
 */
export function cachedLog(opts: GitLogOptions): string {
  const repo = opts.repo ?? process.cwd();
  const location = cacheLocation(opts);
  const state = { refs: currentRefs(repo), mailmap: mailmapDigest(repo) };

  const cached = readCache(location);
  if (cached && cached.mailmap === state.mailmap) {
    if (sameRefs(cached.refs, state.refs)) return cached.log;

    if (stillReachable(repo, cached.refs, state.refs)) {
      // Everything the cache holds is still history, so the only work
      // left is whatever the current refs reach that the old ones did
      // not. git lists newest first, so fresh commits go in front.
      const fresh = git(repo, [...gitLogArgs(opts), "--not", ...cached.refs]).trim();
      const log = fresh === "" ? cached.log : `${fresh}\n\n${cached.log}`;
      writeCache(location, state, log);
      return log;
    }
  }

  // Either a ref the cache was built from has left the history — rewritten,
  // or on a branch that is gone — so the cached log describes commits that
  // no longer exist; or .mailmap now names people differently, which can
  // change any commit in it. Neither can be patched.
  const log = git(repo, gitLogArgs(opts)).trim();
  writeCache(location, state, log);
  return log;
}

/** Use the cache if this log is one worth keeping, otherwise just ask git. */
export function maybeCachedLog(opts: GitLogOptions): string | undefined {
  return cacheable(opts) ? cachedLog(opts) : undefined;
}

/** Every commit a ref points at, sorted and deduplicated. */
function currentRefs(repo: string): string[] {
  const listed = git(repo, ["rev-parse", "--all"]).trim();
  return listed === "" ? [] : [...new Set(listed.split("\n"))].sort();
}

function sameRefs(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((sha, i) => sha === b[i]);
}

/**
 * What .mailmap says, as something comparable.
 *
 * The log carries author names as .mailmap maps them, and .mailmap is not
 * in any ref — edit it and the log changes while the refs do not. Its
 * absence has to be told from its presence too, so a missing file gets a
 * digest of its own rather than being skipped.
 */
function mailmapDigest(repo: string): string {
  const path = join(repo, ".mailmap");
  if (!existsSync(path)) return "none";
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
}

/**
 * Whether the history the cache was built from survives in the current
 * one, which is what makes the cached log a subset worth adding to.
 *
 * Only the refs that have moved need checking, and after an ordinary
 * fetch that is one or two.
 */
function stillReachable(repo: string, before: string[], now: string[]): boolean {
  const present = new Set(now);
  return before
    .filter((sha) => !present.has(sha))
    .every((sha) => git(repo, ["for-each-ref", `--contains=${sha}`]).trim() !== "");
}

interface CacheState {
  refs: string[];
  mailmap: string;
}

function readCache(location: string): (CacheState & { log: string }) | undefined {
  if (!existsSync(location)) return undefined;

  const contents = readFileSync(location, "utf-8");
  if (!contents.startsWith(REFS)) return undefined;

  const firstBreak = contents.indexOf("\n");
  const refs = contents.slice(REFS.length, firstBreak).trim();

  const rest = contents.slice(firstBreak + 1);
  if (!rest.startsWith(MAILMAP)) return undefined;

  const secondBreak = rest.indexOf("\n");
  return {
    refs: refs === "" ? [] : refs.split(" "),
    mailmap: rest.slice(MAILMAP.length, secondBreak).trim(),
    log: rest.slice(secondBreak + 1),
  };
}

/**
 * Written beside the cache and moved into place, because rename is
 * atomic where a write is not: a run cut short leaves the previous
 * answer rather than half of a new one.
 */
function writeCache(location: string, state: CacheState, log: string): void {
  mkdirSync(join(location, ".."), { recursive: true });

  const partial = `${location}.${randomUUID()}.partial`;
  try {
    writeFileSync(partial, `${REFS}${state.refs.join(" ")}\n${MAILMAP}${state.mailmap}\n${log}`);
    renameSync(partial, location);
  } catch (error) {
    if (existsSync(partial)) unlinkSync(partial);
    throw error;
  }
}
