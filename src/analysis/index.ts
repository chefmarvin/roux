import type { AnalysisFn } from "./types";
import { summary } from "./summary";
import { authors } from "./authors";
import { revisions } from "./revisions";
import { coupling, sumOfCoupling } from "./coupling";
import { absoluteChurn, churnByEntity, churnByAuthor } from "./churn";

export const analyses: Record<string, AnalysisFn> = {
  summary,
  authors,
  revisions,
  coupling,
  soc: sumOfCoupling,
  "abs-churn": absoluteChurn,
  "entity-churn": churnByEntity,
  "author-churn": churnByAuthor,
};
