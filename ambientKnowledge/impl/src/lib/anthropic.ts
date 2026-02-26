import Anthropic from "@anthropic-ai/sdk";
import type { ScoredItem, ContextResponse, Confidence, ContextMode } from "./types";

// ──────────────────────────────────────────────
// Anthropic synthesis — summarise retrieved KB
// snippets into a concise context suggestion.
// ──────────────────────────────────────────────

export function getAnthropicApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_KEY ||
    process.env.CLAUDE_API_KEY
  );
}

// Latency matters for this demo UX. Try the fastest model first, but keep a
// stable older Haiku as a fallback in case the "latest" alias is unavailable.
const DEFAULT_MODEL = "claude-3-haiku-20240307";
const FALLBACK_MODELS = [
  "claude-3-5-haiku-latest",
  DEFAULT_MODEL,
  "claude-3-sonnet-20240229",
  "claude-3-5-sonnet-latest",
].filter(Boolean);

let resolvedModel: string | null = null;
const unavailableModels = new Set<string>();

function getAnthropicModelCandidates(): string[] {
  if (resolvedModel && !unavailableModels.has(resolvedModel)) {
    return [resolvedModel];
  }

  const configured = process.env.ANTHROPIC_MODEL?.trim();
  const candidates = configured ? [configured, ...FALLBACK_MODELS] : [...FALLBACK_MODELS];
  const seen = new Set<string>();
  return candidates
    .filter((m) => Boolean(m))
    .filter((m) => {
      if (seen.has(m)) return false;
      seen.add(m);
      return !unavailableModels.has(m);
    });
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    const msg =
      "⚠️  ANTHROPIC_API_KEY is not set! Add it to .env.local — AI synthesis will NOT work without it.\n" +
      "   Get a key at https://console.anthropic.com/";
    console.error(msg);
    throw new Error("ANTHROPIC_API_KEY is not configured. Set it in .env.local to enable AI synthesis.");
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const COMPOSE_SYSTEM_PROMPT = `You are an invisible AI collaborator in a workplace messaging app.
Only use the provided snippets; do not invent facts.

Return ONLY valid JSON:
{"topic":"3-8 word label","summary":"1-2 sentences","openQuestions":["question",...]} or {"insufficient":true}`;

const LOOKUP_SYSTEM_PROMPT = `You are an invisible AI collaborator.
Only use the provided snippets; do not invent facts.
Return ONLY valid JSON:
{"topic":"3-8 word label","summary":"1-2 sentences","openQuestions":["question",...]} or {"insufficient":true}`;

interface SynthesisInput {
  draftText: string;
  recipientName: string;
  snippets: ScoredItem[];
  mode: ContextMode;
  channelName?: string;
  channelPurpose?: string;
}

function buildUserPrompt(input: SynthesisInput): string {
  const { draftText, recipientName, snippets, mode, channelName, channelPurpose } = input;

  const clippedDraft = draftText.length > 700 ? `${draftText.slice(0, 700)}…` : draftText;

  // Keep prompts compact for speed.
  const snippetBlock = snippets
    .map((s, i) => {
      const body = s.item.body.length > 0 ? `\n${s.item.body.slice(0, 120)}` : "";
      return `[${i + 1}] ${s.item.title}\n${s.item.summary}${body}`;
    })
    .join("\n\n");

  const channelLine = channelName
    ? `\nChannel: #${channelName}${channelPurpose ? ` — ${channelPurpose}` : ""}`
    : "";

  if (mode === "incoming_lookup") {
    return `Incoming from ${recipientName}:${channelLine}
${clippedDraft}

Snippets:
${snippetBlock}`;
  }

  return `Draft to ${recipientName}.${channelLine}
${clippedDraft}

Snippets:
${snippetBlock}`;
}

/**
 * Build a fallback ContextResponse from scored items without calling Anthropic.
 * Used when synthesis fails so the user still gets something useful.
 */
function buildFallback(scoredItems: ScoredItem[]): ContextResponse {
  const top = scoredItems[0];
  const topScore = top.score;
  let confidence: Confidence = "low";
  if (topScore >= 8) confidence = "high";
  else if (topScore >= 4) confidence = "med";

  return {
    topic: top.item.title,
    summary: top.item.summary,
    openQuestions: [],
    sources: scoredItems.map((s) => ({
      id: s.item.id,
      title: s.item.title,
      type: s.item.type,
      url: s.item.url,
    })),
    confidence,
    debug: {
      retrieved: scoredItems.map((s) => ({
        id: s.item.id,
        title: s.item.title,
        score: s.score,
        why: s.why,
      })),
    },
  };
}

/**
 * Call Anthropic to synthesise retrieved snippets into a context card payload.
 * Falls back to raw retrieval results if Anthropic call fails.
 */
export async function synthesize(
  draftText: string,
  recipientName: string,
  scoredItems: ScoredItem[],
  mode: ContextMode = "compose",
  channelName?: string,
  channelPurpose?: string,
): Promise<ContextResponse | null> {
  if (scoredItems.length === 0) return null;

  const client = getClient();

  const systemPrompt = mode === "incoming_lookup" ? LOOKUP_SYSTEM_PROMPT : COMPOSE_SYSTEM_PROMPT;

  try {
    const candidates = getAnthropicModelCandidates();
    let message: Awaited<ReturnType<typeof client.messages.create>> | null = null;
    let lastErr: unknown = null;

    for (const model of candidates) {
      try {
        message = await client.messages.create({
          model,
          // Smaller output is faster, and the UI expects concise cards.
          max_tokens: 180,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: buildUserPrompt({
                draftText,
                recipientName,
                // Trim snippet list to keep prompt small/fast.
                snippets: scoredItems.slice(0, 3),
                mode,
                channelName,
                channelPurpose,
              }),
            },
          ],
        });
        resolvedModel = model;
        break;
      } catch (err) {
        lastErr = err;
        const anyErr = err as any;
        const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
        const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
        const isModelNotFound = status === 404 && msg.toLowerCase().includes("model:");
        if (isModelNotFound) {
          unavailableModels.add(model);
          continue;
        }
        throw err;
      }
    }

    if (!message) throw lastErr;

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return buildFallback(scoredItems);

    let rawText = textBlock.text.trim();
    const fenceMatch = rawText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) rawText = fenceMatch[1].trim();

    const parsed = JSON.parse(rawText);
    if (parsed?.insufficient) return null;

    const topScore = scoredItems[0]?.score ?? 0;
    let confidence: Confidence = "low";
    if (topScore >= 8) confidence = "high";
    else if (topScore >= 4) confidence = "med";

    return {
      topic: parsed.topic,
      summary: parsed.summary,
      openQuestions: parsed.openQuestions ?? [],
      sources: scoredItems.map((s) => ({
        id: s.item.id,
        title: s.item.title,
        type: s.item.type,
        url: s.item.url,
      })),
      confidence,
      debug: {
        retrieved: scoredItems.map((s) => ({
          id: s.item.id,
          title: s.item.title,
          score: s.score,
          why: s.why,
        })),
      },
    };
  } catch (err) {
    const anyErr = err as any;
    const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
    const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
    if (status === 401 || msg.toLowerCase().includes("invalid x-api-key")) {
      console.error(
        "⚠️  ANTHROPIC_API_KEY is INVALID (401 Unauthorized). Check your key at https://console.anthropic.com/"
      );
      throw new Error("Anthropic API key is invalid (401). Update ANTHROPIC_API_KEY in .env.local.");
    }
    console.error("[anthropic] Synthesis failed:", err);
    throw err;
  }
}
