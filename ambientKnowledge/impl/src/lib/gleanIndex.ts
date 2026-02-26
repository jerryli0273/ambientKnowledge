import type { KnowledgeItem } from "./types";

/**
 * Glean-inspired local indexing layer.
 *
 * This is intentionally NOT a full Glean clone:
 * - No external connectors / incremental crawls.
 * - No true embedding model or vector DB.
 * - No per-user personalization beyond simple boosts.
 *
 * What we simulate to make the demo feel closer to production:
 * - Ingestion step that normalizes docs and chunks bodies.
 * - Hybrid scoring: lexical (TF-IDF-ish) + lightweight semantic proxy.
 * - ACL filtering based on a viewer principal.
 * - Collapse chunk hits back to document-level results.
 */

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

export type ChunkHit = {
  chunk: IndexedChunk;
  lexicalScore: number;
  semanticScore: number;
  score: number;
};

export type DocHit = {
  item: KnowledgeItem;
  score: number;
  why: {
    topChunkIds: string[];
    topChunkScores: number[];
  };
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "during",
  "before",
  "after",
  "between",
  "out",
  "off",
  "over",
  "under",
  "again",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
  "up",
  "and",
  "but",
  "or",
  "if",
  "while",
  "because",
  "until",
  "that",
  "which",
  "who",
  "whom",
  "this",
  "these",
  "those",
  "what",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
  "hey",
  "hi",
  "hello",
  "thanks",
  "thank",
  "please",
  "also",
  "like",
  "know",
  "think",
  "want",
  "get",
  "got",
  "going",
  "still",
  "any",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function chunkText(body: string, maxChars: number = 520): string[] {
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

    // Soft-split long paragraphs into sentence-ish segments.
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
        acc = acc + " " + part;
      } else {
        chunks.push(acc);
        acc = part;
      }
    }
    if (acc) chunks.push(acc);
  }

  return chunks;
}

function isAllowed(viewerPrincipals: string[], aclPrincipals: string[] | null): boolean {
  if (!aclPrincipals || aclPrincipals.length === 0) return true;
  if (viewerPrincipals.length === 0) return false;
  const allowed = new Set(aclPrincipals);
  return viewerPrincipals.some((p) => allowed.has(p));
}

function semanticProxyScore(queryTokens: string[], chunkTokens: string[]): number {
  // A lightweight semantic-ish proxy: token set overlap + partial token matches.
  // This is deterministic and fast, but not a real embedding model.
  const q = new Set(queryTokens);
  const c = new Set(chunkTokens);

  let overlap = 0;
  for (const qt of q) {
    if (c.has(qt)) overlap += 1;
  }

  let partial = 0;
  const chunkList = [...c];
  for (const qt of q) {
    for (const ct of chunkList) {
      if (ct !== qt && (ct.includes(qt) || qt.includes(ct))) {
        partial += 0.2;
        break;
      }
    }
  }

  return overlap + partial;
}

function buildIdf(chunks: IndexedChunk[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    const unique = new Set(chunk.tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const n = Math.max(1, chunks.length);
  const idf = new Map<string, number>();
  for (const [token, freq] of df.entries()) {
    // Smooth IDF.
    idf.set(token, Math.log(1 + n / (1 + freq)) + 1);
  }

  return idf;
}

export function buildIndex(items: KnowledgeItem[]): {
  chunks: IndexedChunk[];
  idf: Map<string, number>;
  byId: Map<string, KnowledgeItem>;
} {
  const byId = new Map(items.map((i) => [i.id, i] as const));
  const chunks: IndexedChunk[] = [];

  for (const item of items) {
    const aclPrincipals = item.acl?.principals ?? null;
    const entities = item.entities ?? [];

    const baseFields = [item.title, item.summary, item.tags.join(" ")].join("\n");
    const bodyChunks = chunkText(item.body);

    const allChunks = bodyChunks.length > 0 ? bodyChunks : [item.summary || item.body];

    allChunks.forEach((chunk, idx) => {
      const text = `${baseFields}\n\n${chunk}`.trim();
      const tokens = tokenize(text);
      chunks.push({
        chunkId: `${item.id}#${idx}`,
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
    });
  }

  return { chunks, idf: buildIdf(chunks), byId };
}

export function searchIndex(args: {
  query: string;
  viewerPrincipals: string[];
  recipientId?: string;
  items: KnowledgeItem[];
  topKChunks?: number;
  topNDocs?: number;
  applyRecipientBias?: boolean;
}): { hits: DocHit[]; chunkHits: ChunkHit[] } {
  const {
    query,
    viewerPrincipals,
    recipientId,
    items,
    topKChunks = 25,
    topNDocs = 3,
    applyRecipientBias = true,
  } = args;

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { hits: [], chunkHits: [] };

  const { chunks, idf, byId } = buildIndex(items);

  const chunkHits: ChunkHit[] = [];
  for (const chunk of chunks) {
    if (!isAllowed(viewerPrincipals, chunk.aclPrincipals)) continue;

    let lexical = 0;
    for (const qt of qTokens) {
      const tf = chunk.tokenCounts.get(qt) ?? 0;
      if (tf === 0) continue;
      lexical += (1 + Math.log(tf)) * (idf.get(qt) ?? 1);
    }

    const semantic = semanticProxyScore(qTokens, chunk.tokens);

    let score = lexical * 2.0 + semantic * 1.4;

    // Boost entity matches.
    if (chunk.entities.length > 0) {
      const entitySet = new Set(chunk.entities.map((e) => e.toLowerCase()));
      const qText = query.toLowerCase();
      for (const e of entitySet) {
        if (e && qText.includes(e)) {
          score *= 1.15;
          break;
        }
      }
    }

    // Recipient relevance bonus (simulates personalization / people graph signals).
    if (applyRecipientBias && recipientId) {
      const item = byId.get(chunk.docId);
      if (item && (item.id === recipientId || item.links?.includes(recipientId))) {
        score *= 1.25;
      }
    }

    if (score > 0) {
      chunkHits.push({ chunk, lexicalScore: lexical, semanticScore: semantic, score });
    }
  }

  chunkHits.sort((a, b) => b.score - a.score);
  const topChunks = chunkHits.slice(0, topKChunks);

  // Collapse chunk hits back to documents (like "best chunks per document" retrieval).
  const perDoc = new Map<string, { score: number; top: { id: string; score: number }[] }>();
  for (const hit of topChunks) {
    const current = perDoc.get(hit.chunk.docId) ?? { score: 0, top: [] };

    // Sum of top-2 chunk scores is a reasonable doc score proxy.
    current.top.push({ id: hit.chunk.chunkId, score: hit.score });
    current.top.sort((a, b) => b.score - a.score);
    current.top = current.top.slice(0, 2);
    current.score = current.top.reduce((sum, x) => sum + x.score, 0);

    perDoc.set(hit.chunk.docId, current);
  }

  const docHits: DocHit[] = [...perDoc.entries()]
    .map(([docId, v]) => {
      const item = byId.get(docId);
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
    .filter(Boolean)
    .sort((a, b) => (b as DocHit).score - (a as DocHit).score)
    .slice(0, topNDocs) as DocHit[];

  return { hits: docHits, chunkHits: topChunks };
}
