import type { KnowledgeItem, ScoredItem } from "./types";
import { listKnowledgeItems } from "./knowledgeStore";
import { searchIndex } from "./gleanIndex";
import { CURRENT_USER_ID } from "./users";

// ──────────────────────────────────────────────
// Glean-inspired retrieval engine
// ──────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "about", "up", "and", "but", "or", "if", "while", "because", "until",
  "that", "which", "who", "whom", "this", "these", "those", "what",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "it", "its", "they", "them", "their",
  "hey", "hi", "hello", "thanks", "thank", "please", "also", "like",
  "know", "think", "want", "get", "got", "going", "still", "any",
]);

/** Tokenise text into meaningful lowercase terms (used only for fast empty checks). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

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
  const queryTokens = tokenize(draftText);
  if (queryTokens.length === 0) return [];

  const items = listKnowledgeItems() as KnowledgeItem[];

  // In the demo we don't have real auth; simulate Glean-style principals.
  // Treat every user as part of a shared "group:all" and allow per-user ACLs.
  const viewerPrincipals = ["group:all", CURRENT_USER_ID];

  const { hits } = searchIndex({
    query: draftText,
    viewerPrincipals,
    recipientId,
    items,
    topNDocs: topN,
    applyRecipientBias,
  });

  const scored = hits
    .map((h) => ({ item: h.item, score: h.score, why: h.why }))
    .filter((x) => x.score >= minScore);

  return scored;
}
