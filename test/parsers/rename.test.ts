import { describe, test, expect } from "@jest/globals";
import { parseRenamePath } from "../../src/parsers/rename";

describe("parseRenamePath", () => {
  test("returns null for ordinary paths", () => {
    expect(parseRenamePath("src/foo.ts")).toBeNull();
    expect(parseRenamePath("a/b/c.txt")).toBeNull();
  });

  test("parses brace rename with prefix and suffix", () => {
    const result = parseRenamePath("src/{old => new}/file.ts");
    expect(result).toEqual({ oldPath: "src/old/file.ts", newPath: "src/new/file.ts" });
  });

  test("parses brace rename without prefix", () => {
    const result = parseRenamePath("{yaml => internal/yaml}/utils.go");
    expect(result).toEqual({ oldPath: "yaml/utils.go", newPath: "internal/yaml/utils.go" });
  });

  test("parses brace rename without suffix", () => {
    const result = parseRenamePath("src/{old.ts => new.ts}");
    expect(result).toEqual({ oldPath: "src/old.ts", newPath: "src/new.ts" });
  });

  test("parses empty old part (move into subdirectory)", () => {
    const result = parseRenamePath("a/{ => b}/c.ts");
    expect(result).toEqual({ oldPath: "a/c.ts", newPath: "a/b/c.ts" });
  });

  test("parses empty new part (move out of subdirectory)", () => {
    const result = parseRenamePath("a/{b => }/c.ts");
    expect(result).toEqual({ oldPath: "a/b/c.ts", newPath: "a/c.ts" });
  });

  test("parses full path rename (arrow without braces)", () => {
    const result = parseRenamePath("foo.ts => bar/foo.ts");
    expect(result).toEqual({ oldPath: "foo.ts", newPath: "bar/foo.ts" });
  });

  test("normalizes paths (no double slashes)", () => {
    // When prefix ends with / and old part starts empty
    const result = parseRenamePath("src/{ => sub}/file.ts");
    expect(result!.oldPath).toBe("src/file.ts");
    expect(result!.newPath).toBe("src/sub/file.ts");
    expect(result!.oldPath).not.toMatch(/\/\//);
    expect(result!.newPath).not.toMatch(/\/\//);
  });
});
