import { describe, test, expect } from "@jest/globals";
import { messages } from "../../src/analysis/messages";
import type { Modification } from "../../src/parsers/types";
import { lowThresholds } from "../fixtures/test-data";

const dataWithMessages: Modification[] = [
  { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0, message: "fix bug #123" },
  { entity: "A", rev: "2", author: "at", date: "2013-01-02", locAdded: 1, locDeleted: 0, message: "add feature" },
  { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0, message: "fix bug #456" },
  { entity: "C", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0, message: "refactor" },
];

describe("messages", () => {
  test("counts matching messages per entity", () => {
    const result = messages(dataWithMessages, {
      ...lowThresholds,
      expressionToMatch: "fix",
    });
    expect(result).toEqual([
      { entity: "A", matches: 1 },
      { entity: "B", matches: 1 },
    ]);
  });

  test("throws when expressionToMatch is not provided", () => {
    expect(() => messages(dataWithMessages, lowThresholds)).toThrow(
      "Messages analysis requires --expression-to-match (-e) option"
    );
  });

  test("returns empty array when no messages match", () => {
    const result = messages(dataWithMessages, {
      ...lowThresholds,
      expressionToMatch: "nonexistent",
    });
    expect(result).toEqual([]);
  });

  test("handles undefined messages gracefully", () => {
    const noMessages: Modification[] = [
      { entity: "A", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
      { entity: "B", rev: "1", author: "at", date: "2013-01-01", locAdded: 1, locDeleted: 0 },
    ];
    const result = messages(noMessages, {
      ...lowThresholds,
      expressionToMatch: "fix",
    });
    expect(result).toEqual([]);
  });
});
