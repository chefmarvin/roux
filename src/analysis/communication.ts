import type { Modification } from "../parsers/types";
import type { AnalysisOptions } from "./types";
import { groupBy, orderBy } from "../utils/dataset";

export function communication(
  data: Modification[],
  _options: AnalysisOptions
): Record<string, unknown>[] {
  const byEntity = groupBy(data, "entity");

  // Build a map: author -> set of entities they contribute to
  const authorEntities = new Map<string, Set<string>>();
  // Build a map: entity -> set of unique authors
  const entityAuthors = new Map<string, Set<string>>();

  for (const [entity, mods] of byEntity) {
    const authors = new Set(mods.map((m) => m.author));
    entityAuthors.set(entity as string, authors);
    for (const author of authors) {
      let entities = authorEntities.get(author);
      if (!entities) {
        entities = new Set();
        authorEntities.set(author, entities);
      }
      entities.add(entity as string);
    }
  }

  // Count shared entities for each ordered pair
  const pairShared = new Map<string, number>();

  for (const [, authors] of entityAuthors) {
    const authorList = [...authors];
    for (let i = 0; i < authorList.length; i++) {
      for (let j = 0; j < authorList.length; j++) {
        if (i === j) continue;
        const key = `${authorList[i]}\0${authorList[j]}`;
        pairShared.set(key, (pairShared.get(key) ?? 0) + 1);
      }
    }
  }

  const result: Record<string, unknown>[] = [];

  for (const [key, shared] of pairShared) {
    const [author, peer] = key.split("\0");
    const selfCountAuthor = authorEntities.get(author)!.size;
    const selfCountPeer = authorEntities.get(peer)!.size;
    const average = Math.ceil((selfCountAuthor + selfCountPeer) / 2);
    const strength = Math.floor((shared / average) * 100);
    result.push({ author, peer, shared, average, strength });
  }

  return orderBy(result, "strength", "desc");
}
