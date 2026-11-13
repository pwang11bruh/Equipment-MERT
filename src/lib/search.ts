/**
 * Item search used by the member picker (ADR-010).
 * Case-insensitive; every whitespace-separated token must appear somewhere in
 * the name, so "npa 24" matches "NPA size 24" and "bp child" matches
 * "Child BP cuff". Punctuation is ignored ("bandaid" matches "Band-Aid").
 */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Field shorthand → words that appear in catalog names. A token matches if it
 * OR any of its synonyms appears. Add entries as members report misses.
 */
const SYNONYMS: Record<string, string[]> = {
  o2: ["oxygen"],
  ice: ["cold pack"],
  nrb: ["non rebreather"],
  bandaid: ["band aid"],
  narcan: ["naloxone"],
  epi: ["epipen"],
  glucose: ["glucose", "glucometer"],
  collar: ["c collar"],
  ppe: ["gloves", "gown", "goggles", "n95", "mask"],
};

export function matchesSearch(name: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const hay = normalizeForSearch(name);
  const squashed = hay.replace(/ /g, "");
  const has = (term: string) => hay.includes(term) || squashed.includes(term.replace(/ /g, ""));
  return q.split(" ").every((token) => has(token) || (SYNONYMS[token] ?? []).some(has));
}
