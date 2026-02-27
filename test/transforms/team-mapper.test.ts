import { describe, test, expect } from "@jest/globals";
import {
  parseTeamMap,
  applyTeamMapping,
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
