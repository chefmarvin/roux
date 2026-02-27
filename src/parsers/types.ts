export interface Modification {
  entity: string;
  author: string;
  rev: string;
  date: string;        // "YYYY-MM-DD"
  locAdded: number;    // -1 for binary files
  locDeleted: number;  // -1 for binary files
}
