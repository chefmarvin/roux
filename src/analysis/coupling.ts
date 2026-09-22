import type { Modification } from "../parsers/types.js";
import type { AnalysisOptions } from "./types.js";
import { groupBy, orderBy } from "../utils/dataset.js";

/** Group modifications by revision, return map of rev → entities */
function entitiesByRevision(
  data: Modification[],
  maxChangesetSize: number
): Map<string, string[]> {
  const byRev = groupBy(data, "rev");
  const result = new Map<string, string[]>();
  for (const [rev, mods] of byRev) {
    const entities = [...new Set(mods.map((m) => m.entity))];
    if (entities.length <= maxChangesetSize) {
      result.set(rev as string, entities);
    }
  }
  return result;
}

/** Count how many times each pair of entities co-changed */
function couplingFrequencies(
  byRevision: Map<string, string[]>
): Map<string, number> {
  const freqs = new Map<string, number>();
  for (const entities of byRevision.values()) {
    const sorted = [...entities].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}||${sorted[j]}`;
        freqs.set(key, (freqs.get(key) ?? 0) + 1);
      }
    }
  }
  return freqs;
}

/**
 * Count revisions per entity, over the revisions that survived the
 * changeset-size filter. code-maat drops an oversized changeset before it
 * counts revisions (coupling_algos.clj: co-changing-by-revision removes it,
 * module-by-revs then counts what is left), so a sweeping commit must not
 * inflate an entity's revision count and dilute its coupling degree.
 */
function revisionsByEntity(
  byRevision: Map<string, string[]>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const entities of byRevision.values()) {
    for (const entity of entities) {
      result.set(entity, (result.get(entity) ?? 0) + 1);
    }
  }
  return result;
}

export function coupling(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byRevision = entitiesByRevision(data, options.maxChangesetSize);
  const freqs = couplingFrequencies(byRevision);
  const revsByEntity = revisionsByEntity(byRevision);
  const result: Record<string, unknown>[] = [];

  for (const [key, sharedRevs] of freqs) {
    const [e1, e2] = key.split("||");
    const revs1 = revsByEntity.get(e1) ?? 0;
    const revs2 = revsByEntity.get(e2) ?? 0;
    const avgRevs = (revs1 + revs2) / 2;
    const degree = Math.floor((sharedRevs / avgRevs) * 100);
    const avgRevsRounded = Math.round(avgRevs);

    if (
      sharedRevs >= options.minSharedRevs &&
      degree >= options.minCoupling &&
      degree <= options.maxCoupling &&
      // code-maat thresholds on the pair's average revisions, not on each
      // entity separately (logical_coupling.clj passes average-revs to
      // within-threshold?). Requiring both would drop pairs where a stable
      // module is dragged along by a churning one.
      avgRevs >= options.minRevs
    ) {
      result.push({
        entity: e1,
        coupled: e2,
        degree,
        "average-revs": avgRevsRounded,
      });
    }
  }

  return orderBy(result, "degree", "desc");
}

export function sumOfCoupling(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  // SOC uses non-deduplicated entities per revision (matches code-maat row-level counting).
  // It also counts every revision: code-maat applies the changeset-size filter
  // only in co-changing-by-revision, which the soc analysis does not call
  // (sum_of_coupling.clj defines its own entities-by-revision without it).
  const byRev = groupBy(data, "rev");
  const soc = new Map<string, number>();

  for (const [, mods] of byRev) {
    const entities = mods.map((m) => m.entity);
    for (const entity of entities) {
      soc.set(entity, (soc.get(entity) ?? 0) + (entities.length - 1));
    }
  }

  const result: Record<string, unknown>[] = [];
  for (const [entity, value] of soc) {
    if (value > options.minRevs) {
      result.push({ entity, soc: value });
    }
  }

  return orderBy(result, "soc", "desc");
}
