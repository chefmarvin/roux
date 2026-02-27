import type { Modification } from "../../src/parsers/types";

export const simple: Modification[] = [
  { entity: "B", rev: "2", author: "ta", date: "2013-11-11", locAdded: 20, locDeleted: 2 },
  { entity: "A", rev: "1", author: "at", date: "2013-11-10", locAdded: 10, locDeleted: 1 },
  { entity: "B", rev: "1", author: "at", date: "2013-11-10", locAdded: 1, locDeleted: 1 },
  { entity: "B", rev: "3", author: "at", date: "2013-11-11", locAdded: 2, locDeleted: 0 },
];

export const withBinary: Modification[] = [
  { entity: "binary", rev: "1", author: "at", date: "2013-11-10", locAdded: -1, locDeleted: -1 },
];
