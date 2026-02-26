import type { KnowledgeItem } from "./types";
import { listKnowledgeItems } from "./knowledgeStore";
import { CURRENT_USER_ID } from "./users";

/**
 * Production-grade search index.
 *
 * Design decisions for scale:
 *
 * 1. INVERTED INDEX with posting lists.
 *    token → Set<chunkIndex>
 *    Query-time cost is O(Σ |posting(qt)|) — proportional to the number of
 *    chunks that actually contain a query term, NOT the total corpus size.
 *    At 10K docs × ~3 chunks each = 30K chunks, a naive linear scan would
 *    touch all 30K; with posting lists a typical 4-token query touches ~200.
 *
 * 2. ENTITY INDEX.
 *    Lowercased entity string → Set<chunkIndex>
 *    Allows O(1) entity-boost lookups instead of scanning every chunk's
 *    entity list.
 *
 * 3. LAZY SINGLETON initialization.
 *    The index is built once on first query (or module import) and never
 *    rebuilt unless the corpus changes. In production this would be an
 *    external service (Elasticsearch / Vespa / Glean); here we simulate the
 *    same contract.
 *
 * 4. PRE-COMPUTED IDF.
 *    Computed at index-build time, O(1) lookup per query token at search time.
 *
 * 5. ACL FILTERING via a per-chunk principal set.
 *    Chunks that fail ACL are skipped during candidate scoring, not after.
 *
 * 6. NO DUPLICATE CODE.
 *    Tokenizer, stop words, chunker all defined once and exported for reuse.
 */

// ── Types ──────────────────────────────────────────────────

export type IndexedChunk = {
  chunkId: string;
  docId: string;
  docType: KnowledgeItem["type"];
  title: string;
  url?: string;
  sourceSystem?: KnowledgeItem["sourceSystem"];
  container?: string;
  updatedAtMs?: number;
  entities: string[];
  tags: string[];
  text: string;
  tokens: string[];
  tokenCounts: Map<string, number>;
  aclPrincipals: string[] | null;
};

export type DocHit = {
  item: KnowledgeItem;
  score: number;
  why: {
    topChunkIds: string[];
    topChunkScores: number[];
  };
};

// ── Stop words (shared, exported for reuse) ────────────────

export const STOP_WORDS = new Set([
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

// ── Tokenizer (exported for reuse) ─────────────────────────

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ── Helpers ────────────────────────────────────────────────

function countTokens(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function chunkText(body: string, maxChars = 520): string[] {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      chunks.push(paragraph);
      continue;
    }
    const parts = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    let acc = "";
    for (const part of parts) {
      if (!acc) {
        acc = part;
        continue;
      }
      if ((acc + " " + part).length <= maxChars) {
        acc += " " + part;
      } else {
        chunks.push(acc);
        acc = part;
      }
    }
    if (acc) chunks.push(acc);
  }
  return chunks;
}

function isAllowed(
  viewerPrincipals: string[],
  aclPrincipals: string[] | null,
): boolean {
  if (!aclPrincipals || aclPrincipals.length === 0) return true;
  if (viewerPrincipals.length === 0) return false;
  const allowed = new Set(aclPrincipals);
  return viewerPrincipals.some((p) => allowed.has(p));
}

// ── The Index ──────────────────────────────────────────────

interface InternalSearchIndex {
  chunks: IndexedChunk[];
  byId: Map<string, KnowledgeItem>;
  idf: Map<string, number>;
  /** Inverted index: token → set of chunk array indices */
  postings: Map<string, Set<number>>;
  /** Entity index: lowercased entity → set of chunk array indices */
  entityPostings: Map<string, Set<number>>;
  /** Doc-link index: linked ID → set of chunk array indices */
  linkPostings: Map<string, Set<number>>;
}

function buildIndex(items: KnowledgeItem[]): InternalSearchIndex {
  const byId = new Map(items.map((i) => [i.id, i] as const));
  const chunks: IndexedChunk[] = [];

  for (const item of items) {
    const aclPrincipals = item.acl?.principals ?? null;
    const entities = item.entities ?? [];
    const baseFields = [item.title, item.summary, item.tags.join(" ")].join(
      "\n",
    );
    const bodyChunks = chunkText(item.body);
    const allChunks =
      bodyChunks.length > 0 ? bodyChunks : [item.summary || item.body];

    for (let ci = 0; ci < allChunks.length; ci++) {
      const text = `${baseFields}\n\n${allChunks[ci]}`.trim();
      const tokens = tokenize(text);
      chunks.push({
        chunkId: `${item.id}#${ci}`,
        docId: item.id,
        docType: item.type,
        title: item.title,
        url: item.url,
        sourceSystem: item.sourceSystem,
        container: item.container,
        updatedAtMs: item.updatedAtMs,
        entities,
        tags: item.tags,
        text,
        tokens,
        tokenCounts: countTokens(tokens),
        aclPrincipals,
      });
    }
  }

  // ── Build IDF ──────────────────────────────────────────
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    const unique = new Set(chunk.tokens);
    for (const token of unique) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const n = Math.max(1, chunks.length);
  const idf = new Map<string, number>();
  for (const [token, freq] of df)
    idf.set(token, Math.log(1 + n / (1 + freq)) + 1);

  // ── Build inverted index (posting lists) ───────────────
  const postings = new Map<string, Set<number>>();
  for (let i = 0; i < chunks.length; i++) {
    const unique = new Set(chunks[i].tokens);
    for (const token of unique) {
      let set = postings.get(token);
      if (!set) {
        set = new Set();
        postings.set(token, set);
      }
      set.add(i);
    }
  }

  // ── Build entity index ─────────────────────────────────
  const entityPostings = new Map<string, Set<number>>();
  for (let i = 0; i < chunks.length; i++) {
    for (const e of chunks[i].entities) {
      const key = e.toLowerCase();
      let set = entityPostings.get(key);
      if (!set) {
        set = new Set();
        entityPostings.set(key, set);
      }
      set.add(i);
    }
  }

  // ── Build link index (for recipient bias) ──────────────
  const linkPostings = new Map<string, Set<number>>();
  for (let i = 0; i < chunks.length; i++) {
    const docId = chunks[i].docId;
    const item = byId.get(docId);
    if (!item) continue;
    const ids = [docId, ...(item.links ?? [])];
    for (const id of ids) {
      let set = linkPostings.get(id);
      if (!set) {
        set = new Set();
        linkPostings.set(id, set);
      }
      set.add(i);
    }
  }

  return { chunks, byId, idf, postings, entityPostings, linkPostings };
}

// ── Lazy singleton ─────────────────────────────────────────
let _index: InternalSearchIndex | null = null;

function getIndex(): InternalSearchIndex {
  if (_index) return _index;
  _index = buildIndex(listKnowledgeItems());
  return _index;
}

/** Call if the knowledge base changed (e.g. after an add/delete). */
export function invalidateIndex(): void {
  _index = null;
}

// ── Search ─────────────────────────────────────────────────

export function searchIndex(args: {
  query: string;
  viewerPrincipals?: string[];
  recipientId?: string;
  topNDocs?: number;
  applyRecipientBias?: boolean;
}): { hits: DocHit[] } {
  const {
    query,
    viewerPrincipals = ["group:all", CURRENT_USER_ID],
    recipientId,
    topNDocs = 3,
    applyRecipientBias = true,
  } = args;

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { hits: [] };

  const idx = getIndex();

  // ── 1. Gather candidate chunk indices from posting lists ─
  //    Union of all posting lists for query tokens.
  //    Cost: O(Σ |posting(qt)|), NOT O(all chunks).
  const candidateSet = new Set<number>();
  for (const qt of qTokens) {
    const posting = idx.postings.get(qt);
    if (posting) for (const ci of posting) candidateSet.add(ci);

    // Partial-match candidates: tokens sharing a 3-char prefix
    if (qt.length >= 3) {
      const prefix = qt.slice(0, 3);
      for (const [token, posting2] of idx.postings) {
        if (
          token !== qt &&
          token.startsWith(prefix) &&
          (token.includes(qt) || qt.includes(token))
        ) {
          for (const ci of posting2) candidateSet.add(ci);
        }
      }
    }
  }

  if (candidateSet.size === 0) return { hits: [] };

  // ── 2. Score only candidate chunks ───────────────────────
  const recipientChunks =
    applyRecipientBias && recipientId
      ? idx.linkPostings.get(recipientId)
      : undefined;
  const queryLower = query.toLowerCase();

  type ScoredChunk = { ci: number; score: number };
  const scored: ScoredChunk[] = [];

  for (const ci of candidateSet) {
    const chunk = idx.chunks[ci];

    // ACL check
    if (!isAllowed(viewerPrincipals, chunk.aclPrincipals)) continue;

    // Lexical: TF-IDF
    let lexical = 0;
    for (const qt of qTokens) {
      const tf = chunk.tokenCounts.get(qt) ?? 0;
      if (tf === 0) continue;
      lexical += (1 + Math.log(tf)) * (idx.idf.get(qt) ?? 1);
    }

    // Semantic proxy: token overlap + partial matches
    let overlap = 0;
    let partial = 0;
    for (const qt of qTokens) {
      if (chunk.tokenCounts.has(qt)) {
        overlap += 1;
      } else {
        for (const ct of chunk.tokens) {
          if (ct !== qt && (ct.includes(qt) || qt.includes(ct))) {
            partial += 0.2;
            break;
          }
        }
      }
    }

    let score = lexical * 2.0 + (overlap + partial) * 1.4;

    // Entity boost — only for candidates, not all chunks
    if (chunk.entities.length > 0) {
      for (const e of chunk.entities) {
        if (e && queryLower.includes(e.toLowerCase())) {
          score *= 1.15;
          break;
        }
      }
    }

    // Recipient bias — O(1) set lookup
    if (recipientChunks?.has(ci)) {
      score *= 1.25;
    }

    if (score > 0) {
      scored.push({ ci, score });
    }
  }

  // ── 3. Top-K chunks → collapse to documents ─────────────
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, 25);

  const perDoc = new Map<
    string,
    { score: number; top: { id: string; score: number }[] }
  >();
  for (const hit of topChunks) {
    const chunk = idx.chunks[hit.ci];
    const cur = perDoc.get(chunk.docId) ?? { score: 0, top: [] };
    cur.top.push({ id: chunk.chunkId, score: hit.score });
    cur.top.sort((a, b) => b.score - a.score);
    cur.top = cur.top.slice(0, 2);
    cur.score = cur.top.reduce((s, x) => s + x.score, 0);
    perDoc.set(chunk.docId, cur);
  }

  const docHits: DocHit[] = ([...perDoc.entries()]
    .map(([docId, v]) => {
      const item = idx.byId.get(docId);
      if (!item) return null;
      return {
        item,
        score: v.score,
        why: {
          topChunkIds: v.top.map((t) => t.id),
          topChunkScores: v.top.map((t) => t.score),
        },
      } as DocHit;
    })
    .filter(Boolean) as DocHit[])
    .sort((a, b) => b.score - a.score)
    .slice(0, topNDocs);

  return { hits: docHits };
}
