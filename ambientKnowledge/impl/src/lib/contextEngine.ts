import { retrieve } from "./retrieval";
import { synthesize } from "./anthropic";
import { USERS } from "./users";
import { getChannelById } from "./channels";
import { listKnowledgeItems } from "./knowledgeStore";
import type {
  Confidence,
  ContextMode,
  ContextResponse,
  ContextSource,
  ScoredItem,
} from "./types";

const CACHE_TTL_MS = 45_000;
const MAX_CACHE_SIZE = 5_000;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_INFLIGHT_SYNTHESIS = 24;

type CacheEntry = {
  data: ContextResponse;
  expiresAt: number;
  writtenAt: number;
};

type RequestInput = {
  draftText: string;
  recipientId: string;
  mode: ContextMode;
  channelId?: string;
  clientKey: string;
};

const responseCache = new Map<string, CacheEntry>();
const inflightByKey = new Map<string, Promise<ContextResponse | null>>();
const requestWindows = new Map<string, { count: number; windowStart: number }>();
let inflightSynthesisCount = 0;

function normalizeDraft(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 240);
}

function makeRequestKey({ draftText, recipientId, mode, channelId }: Omit<RequestInput, "clientKey">): string {
  return `${mode}|${channelId ?? "no-channel"}|${recipientId}|${normalizeDraft(draftText)}`;
}

function getConfidence(topScore: number): Confidence {
  if (topScore >= 8) return "high";
  if (topScore >= 4) return "med";
  return "low";
}

function toSources(items: ScoredItem[]): ContextSource[] {
  return items.map((scoreItem) => ({
    id: scoreItem.item.id,
    title: scoreItem.item.title,
    type: scoreItem.item.type,
    url: scoreItem.item.url,
  }));
}

function buildRetrievalOnly(scoredItems: ScoredItem[]): ContextResponse | null {
  if (scoredItems.length === 0) return null;
  const top = scoredItems[0];

  return {
    topic: top.item.title,
    summary: top.item.summary,
    openQuestions: [],
    sources: toSources(scoredItems),
    confidence: getConfidence(top.score),
    servingTier: "retrieval",
    debug: {
      retrieved: scoredItems.map((item) => ({
        id: item.item.id,
        title: item.item.title,
        score: item.score,
        why: item.why,
      })),
    },
  };
}

function pruneCache(now: number): void {
  for (const [key, value] of responseCache.entries()) {
    if (value.expiresAt <= now) responseCache.delete(key);
  }

  if (responseCache.size <= MAX_CACHE_SIZE) return;
  const removeCount = responseCache.size - MAX_CACHE_SIZE;
  const oldest = [...responseCache.entries()]
    .sort((a, b) => a[1].writtenAt - b[1].writtenAt)
    .slice(0, removeCount);
  oldest.forEach(([key]) => responseCache.delete(key));
}

function isRateLimited(clientKey: string, now: number): boolean {
  const current = requestWindows.get(clientKey);
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestWindows.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  current.count += 1;
  return false;
}

function shouldUseSynthesis(args: {
  mode: ContextMode;
  topScore: number;
  draftText: string;
  overloaded: boolean;
  rateLimited: boolean;
}): boolean {
  if (args.overloaded || args.rateLimited) return false;

  // Be fairly eager: the whole demo value is the LLM acting like an
  // invisible collaborator that connects dots and proposes follow-ups.
  if (args.mode === "incoming_lookup") {
    return args.topScore >= 2.2 || args.draftText.trim().length >= 110;
  }

  if (args.topScore >= 3.2) return true;
  return args.draftText.trim().length >= 18;
}

function extractUrls(text: string): string[] {
  const urls: string[] = [];
  const re = /https?:\/\/[^\s)\]}>,]+/g;
  for (const match of text.matchAll(re)) {
    const raw = match[0]?.trim();
    if (!raw) continue;
    // Strip trailing punctuation that often follows URLs in chat.
    const cleaned = raw.replace(/[.,;:!?]+$/, "");
    urls.push(cleaned);
    if (urls.length >= 6) break;
  }
  return urls;
}

function extractGithubIssueUrls(text: string): string[] {
  const urls = new Set<string>();

  // Full URLs already present.
  for (const url of extractUrls(text)) {
    if (url.includes("github.com/")) urls.add(url);
  }

  // Shorthand: owner/repo#123
  const shorthand = /\b([a-z0-9_.-]+\/[a-z0-9_.-]+)#(\d{2,7})\b/gi;
  for (const match of text.matchAll(shorthand)) {
    const repo = match[1];
    const num = match[2];
    if (!repo || !num) continue;
    urls.add(`https://github.com/${repo}/issues/${num}`);
  }

  return [...urls];
}

function boostLinkedGithubSources(draftText: string, scored: ScoredItem[]): ScoredItem[] {
  const githubUrls = extractGithubIssueUrls(draftText);
  if (githubUrls.length === 0) return scored;

  const items = listKnowledgeItems();

  const byId = new Map(scored.map((s) => [s.item.id, s] as const));
  const byUrl = new Map<string, string>();
  for (const item of items) {
    if (item.url) byUrl.set(item.url, item.id);
  }

  const topScore = scored[0]?.score ?? 0;
  for (const url of githubUrls) {
    const matchId = byUrl.get(url);
    if (!matchId) continue;
    if (byId.has(matchId)) continue;
    const item = items.find((i) => i.id === matchId);
    if (!item) continue;
    byId.set(matchId, { item, score: topScore + 12, why: undefined });
  }

  return [...byId.values()];
}

export function getEngineStats() {
  return {
    inflightSynthesisCount,
    inflightKeys: inflightByKey.size,
    cacheSize: responseCache.size,
  };
}

export async function getContextSuggestion(input: RequestInput): Promise<ContextResponse | null> {
  const now = Date.now();
  const normalizedDraft = input.draftText.trim();
  if (!normalizedDraft) return null;

  const requestKey = makeRequestKey({
    draftText: normalizedDraft,
    recipientId: input.recipientId,
    mode: input.mode,
    channelId: input.channelId,
  });

  const cached = responseCache.get(requestKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      servingTier: "cache",
      freshnessMs: now - cached.writtenAt,
    };
  }

  if (inflightByKey.has(requestKey)) {
    const shared = await inflightByKey.get(requestKey)!;
    return shared;
  }

  const task = (async () => {
    pruneCache(now);

    const applyRecipientBias = input.mode !== "incoming_lookup";
    // Pull a few more candidates so external/code-link KB items can surface
    // alongside strong internal matches (helps demos where a message cites a
    // GitHub issue/PR but also mentions an internal project).
    const scoredItems = boostLinkedGithubSources(
      normalizedDraft,
      retrieve(normalizedDraft, input.recipientId, 6, 2, applyRecipientBias),
    )
      .map((scored) => {
        if (input.mode === "incoming_lookup" && scored.item.type === "user") {
          return { ...scored, score: scored.score * 0.45 };
        }
        return scored;
      })
      .sort((a, b) => b.score - a.score);
    if (scoredItems.length === 0) return null;

    const topScore = scoredItems[0].score;
    const overloaded = inflightSynthesisCount >= MAX_INFLIGHT_SYNTHESIS;
    const rateLimited = isRateLimited(input.clientKey, now);
    const useSynthesis = shouldUseSynthesis({
      mode: input.mode,
      topScore,
      draftText: normalizedDraft,
      overloaded,
      rateLimited,
    });

    let response: ContextResponse | null = null;

    if (useSynthesis) {
      // Resolve channel metadata for richer synthesis prompts
      const channelMeta = input.channelId ? getChannelById(input.channelId) : undefined;

      try {
        inflightSynthesisCount += 1;
        response = await synthesize(
          normalizedDraft,
          USERS[input.recipientId]?.name ?? "teammate",
          scoredItems,
          input.mode,
          channelMeta?.name,
          channelMeta?.purpose,
        );
      } finally {
        inflightSynthesisCount = Math.max(0, inflightSynthesisCount - 1);
      }
    }

    if (!response) {
      response = buildRetrievalOnly(scoredItems);
      if (!response) return null;
      response.servingTier = "retrieval";
    } else {
      response.servingTier = "synthesis";
    }

    if (input.mode === "incoming_lookup" && response.sources?.length) {
      const nonUserSources = response.sources.filter((source) => source.type !== "user");
      if (nonUserSources.length > 0) {
        response.sources = nonUserSources;
      }
    }

    response.freshnessMs = 0;
    if (overloaded || rateLimited) {
      response.debug = {
        ...(response.debug ?? { retrieved: [] }),
        overloaded,
        rateLimited,
      };
    }

    responseCache.set(requestKey, {
      data: response,
      writtenAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  })();

  inflightByKey.set(requestKey, task);
  try {
    return await task;
  } finally {
    inflightByKey.delete(requestKey);
  }
}
