import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

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

/** Count total revisions per entity */
function revisionsByEntity(data: Modification[]): Map<string, number> {
  const byEntity = groupBy(data, "entity");
  const result = new Map<string, number>();
  for (const [entity, mods] of byEntity) {
    result.set(entity as string, new Set(mods.map((m) => m.rev)).size);
  }
  return result;
}

export function coupling(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byRevision = entitiesByRevision(data, options.maxChangesetSize);
  const freqs = couplingFrequencies(byRevision);
  const revsByEntity = revisionsByEntity(data);
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
      revs1 >= options.minRevs &&
      revs2 >= options.minRevs
    ) {
      result.push({
        entity: e1,
        coupled: e2,
        degree,
        averageRevs: avgRevsRounded,
      });
    }
  }

  return orderBy(result, "degree", "desc");
}

export function sumOfCoupling(
  data: Modification[],
  options: AnalysisOptions
): Record<string, unknown>[] {
  const byRevision = entitiesByRevision(data, options.maxChangesetSize);
  const soc = new Map<string, number>();

  for (const entities of byRevision.values()) {
    for (const entity of entities) {
      soc.set(entity, (soc.get(entity) ?? 0) + (entities.length - 1));
    }
  }

  const result: Record<string, unknown>[] = [];
  for (const [entity, value] of soc) {
    result.push({ entity, soc: value });
  }

  return orderBy(result, "soc", "desc");
}
