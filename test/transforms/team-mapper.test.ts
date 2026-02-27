import { describe, test, expect } from "@jest/globals";
import {
  parseTeamMap,
  applyTeamMapping,
  parseTeamJSON,
  parseTeamMarkdown,
} from "../../src/transforms/team-mapper";
import type { Modification } from "../../src/parsers/types";

const mod = (author: string): Modification => ({
  entity: "file.ts",
  author,
  rev: "abc",
  date: "2024-01-01",
  locAdded: 10,
  locDeleted: 5,
});

describe("parseTeamMap", () => {
  test("parses CSV mapping", () => {
    const csv = "alice,TeamA\nbob,TeamB";
    const map = parseTeamMap(csv);
    expect(map.get("alice")).toBe("TeamA");
    expect(map.get("bob")).toBe("TeamB");
  });

  test("skips header line starting with 'author'", () => {
    const csv = "author,team\nalice,TeamA";
    const map = parseTeamMap(csv);
    expect(map.size).toBe(1);
    expect(map.get("alice")).toBe("TeamA");
  });

  test("handles empty and whitespace lines", () => {
    const csv = "\n  \nalice,TeamA\n\n";
    const map = parseTeamMap(csv);
    expect(map.size).toBe(1);
  });
});

describe("applyTeamMapping", () => {
  const teamMap = parseTeamMap("alice,TeamA\nbob,TeamB");

  test("maps authors to teams", () => {
    const data = [mod("alice"), mod("bob")];
    const result = applyTeamMapping(data, teamMap);
    expect(result).toEqual([
      expect.objectContaining({ author: "TeamA" }),
      expect.objectContaining({ author: "TeamB" }),
    ]);
  });

  test("unmapped authors keep original name", () => {
    const data = [mod("alice"), mod("charlie")];
    const result = applyTeamMapping(data, teamMap);
    expect(result[0].author).toBe("TeamA");
    expect(result[1].author).toBe("charlie");
  });
});

describe("parseTeamJSON", () => {
  test("parses JSON team mapping", () => {
    const json = JSON.stringify({
      Alice: "Backend",
      Bob: "Backend",
      Charlie: "Frontend",
    });
    const map = parseTeamJSON(json);
    expect(map.size).toBe(3);
    expect(map.get("Alice")).toBe("Backend");
    expect(map.get("Charlie")).toBe("Frontend");
  });

  test("handles empty JSON object", () => {
    const map = parseTeamJSON("{}");
    expect(map.size).toBe(0);
  });
});

describe("parseTeamMarkdown", () => {
  test("parses markdown table", () => {
    const md = [
      "| author | team |",
      "|--------|------|",
      "| Alice | Backend |",
      "| Bob | Frontend |",
    ].join("\n");
    const map = parseTeamMarkdown(md);
    expect(map.size).toBe(2);
    expect(map.get("Alice")).toBe("Backend");
    expect(map.get("Bob")).toBe("Frontend");
  });

  test("skips header and separator rows", () => {
    const md = [
      "| author | team |",
      "|--------|------|",
      "| Alice | Backend |",
    ].join("\n");
    const map = parseTeamMarkdown(md);
    expect(map.size).toBe(1);
    expect(map.get("Alice")).toBe("Backend");
  });
});
