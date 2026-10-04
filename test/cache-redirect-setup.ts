import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Send any cached log this suite writes to a directory that goes away
 * with it.
 *
 * Caching is off by default, so today only the tests that ask for it
 * write anything, and those name their own directory. This is here so
 * that a test which forgets, or a default that changes, cannot leave
 * logs in the cache of whoever ran the tests — keyed, as they would be,
 * to temporary repositories that no longer exist.
 */
export default async function setup(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "roux-test-cache-"));
  process.env.XDG_CACHE_HOME = directory;
  (globalThis as Record<string, unknown>).__TEST_CACHE_DIR__ = directory;
}
