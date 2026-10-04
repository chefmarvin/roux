import { rmSync } from "fs";

/** Take the suite's cache directory with it. */
export default async function teardown(): Promise<void> {
  const directory = (globalThis as Record<string, unknown>).__TEST_CACHE_DIR__ as
    | string
    | undefined;
  if (directory) rmSync(directory, { recursive: true, force: true });
}
