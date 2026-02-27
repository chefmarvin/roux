import { describe, test, expect } from "@jest/globals";
import { parseGroupFile, applyGrouping, parseGroupJSON, parseGroupMarkdown } from "../../src/transforms/grouper";
import type { Modification } from "../../src/parsers/types";

const mod = (entity: string): Modification => ({
  entity,
  author: "alice",
  rev: "abc",
  date: "2024-01-01",
  locAdded: 10,
  locDeleted: 5,
});

describe("parseGroupFile", () => {
  test("parses group spec lines", () => {
    const text = "src/core => Core\nsrc/ui => UI";
    const specs = parseGroupFile(text);
    expect(specs).toHaveLength(2);
    expect(specs[0].name).toBe("Core");
    expect(specs[1].name).toBe("UI");
  });

  test("ignores comments and blank lines", () => {
    const text = "# comment\n\nsrc/core => Core\n  \n";
    const specs = parseGroupFile(text);
    expect(specs).toHaveLength(1);
    expect(specs[0].name).toBe("Core");
  });

  test("normalizes leading/trailing slashes in path", () => {
    const text = "/src/core/ => Core";
    const specs = parseGroupFile(text);
    expect(specs[0].pattern.test("src/core/file.ts")).toBe(true);
  });
});

describe("applyGrouping", () => {
  const specs = parseGroupFile("src/core => Core\nsrc/ui => UI");

  test("maps entities to group names", () => {
    const data = [mod("src/core/a.ts"), mod("src/ui/b.ts")];
    const result = applyGrouping(data, specs);
    expect(result).toEqual([
      expect.objectContaining({ entity: "Core" }),
      expect.objectContaining({ entity: "UI" }),
    ]);
  });

  test("drops unmatched entities", () => {
    const data = [mod("src/core/a.ts"), mod("other/x.ts")];
    const result = applyGrouping(data, specs);
    expect(result).toHaveLength(1);
    expect(result[0].entity).toBe("Core");
  });

  test("first match wins", () => {
    const overlapping = parseGroupFile("src => All\nsrc/core => Core");
    const data = [mod("src/core/a.ts")];
    const result = applyGrouping(data, overlapping);
    expect(result).toHaveLength(1);
    expect(result[0].entity).toBe("All");
  });
});

describe("parseGroupJSON", () => {
  test("parses JSON with prefix paths", () => {
    const json = JSON.stringify({
      "src/api": "API Layer",
      "src/ui": "UI Layer",
    });
    const specs = parseGroupJSON(json);
    expect(specs).toHaveLength(2);
    expect(specs[0].name).toBe("API Layer");
    expect(specs[0].pattern.test("src/api/handler.ts")).toBe(true);
    expect(specs[1].name).toBe("UI Layer");
  });

  test("parses JSON with regex patterns", () => {
    const json = JSON.stringify({
      "^src\\/.*Test.*$": "Tests",
      "src/core": "Core",
    });
    const specs = parseGroupJSON(json);
    expect(specs[0].pattern.test("src/foo/FooTest.cs")).toBe(true);
    expect(specs[1].pattern.test("src/core/main.ts")).toBe(true);
  });
});

describe("parseGroupMarkdown", () => {
  test("parses markdown table with prefix paths", () => {
    const md = [
      "| path | group |",
      "|------|-------|",
      "| src/api | API Layer |",
      "| src/ui | UI Layer |",
    ].join("\n");
    const specs = parseGroupMarkdown(md);
    expect(specs).toHaveLength(2);
    expect(specs[0].name).toBe("API Layer");
    expect(specs[0].pattern.test("src/api/handler.ts")).toBe(true);
  });

  test("parses markdown table with regex patterns", () => {
    const md = [
      "| path | group |",
      "|------|-------|",
      "| ^src\\/.*Test.*$ | Tests |",
      "| src/core | Core |",
    ].join("\n");
    const specs = parseGroupMarkdown(md);
    expect(specs).toHaveLength(2);
    expect(specs[0].pattern.test("src/foo/BarTest.cs")).toBe(true);
    expect(specs[1].name).toBe("Core");
  });
});
