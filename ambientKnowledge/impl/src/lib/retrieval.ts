import type { ScoredItem } from "./types";
import { searchIndex, tokenize } from "./gleanIndex";

// ──────────────────────────────────────────────
// Glean-inspired retrieval engine
//
// Thin wrapper around the production search index.
// Tokenizer and stop words live in gleanIndex (single source of truth).
// ──────────────────────────────────────────────

/**
 * Retrieve the top-N most relevant knowledge items for the given draft text.
 * Returns items sorted by descending score, with a minimum score threshold.
 */
export function retrieve(
  draftText: string,
  recipientId: string,
  topN: number = 3,
  minScore: number = 2,
  applyRecipientBias: boolean = true,
): ScoredItem[] {
  // Quick empty-check using the shared tokenizer
  if (tokenize(draftText).length === 0) return [];

  const { hits } = searchIndex({
    query: draftText,
    recipientId,
    topNDocs: topN,
    applyRecipientBias,
  });

  return hits
    .map((h) => ({ item: h.item, score: h.score, why: h.why }))
    .filter((x) => x.score >= minScore);
}
