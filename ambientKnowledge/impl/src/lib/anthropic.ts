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

You are generating a small “Suggested Context” card that helps the user send a productive message.

Rules:
- Return ONLY valid JSON (no markdown, no extra keys).
- "topic": 3–8 words.
- "summary": 1–2 sentences, concrete and grounded in snippets.
- "openQuestions": 2–4 items. Each must be:
  - Specific and answerable in one reply.
  - Useful for moving work forward (owner, date, criteria, next action, dependency).
  - Written so it can be pasted directly into the draft (no mention of “snippets” or “context”).
  - NOT a rephrase of the summary; avoid generic questions like “Can you confirm…?”
  - If snippets include names/roles (e.g., release manager), prefer questions that route to that owner.
  - If snippets contain a checklist/action-items section, turn it into questions that ask for: who owns each item, by when, and what “done” looks like.

If the snippets are too thin to ground a helpful card, return {"insufficient":true}.

Return ONLY valid JSON:
{"topic":"3-8 word label","summary":"1-2 sentences","openQuestions":["question",...]} or {"insufficient":true}`;

const LOOKUP_SYSTEM_PROMPT = `You are an invisible AI collaborator.
Only use the provided snippets; do not invent facts.

You are generating a small context card to help the user respond to an incoming message.

Rules:
- Return ONLY valid JSON (no markdown, no extra keys).
- "topic": 3–8 words.
- "summary": 1–2 sentences, concrete and grounded in snippets.
- "openQuestions": 2–4 items, specific/answerable, focused on unblocking the thread (owner/date/criteria/next action).
- Do not rephrase the summary as a question.
 - If names/roles are present, prefer routing questions to the right owner.

If the snippets are too thin to ground a helpful card, return {"insufficient":true}.

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

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

function isGenericOpenQuestion(q: string): boolean {
  const s = normalizeQuestion(q).toLowerCase();
  // Heuristics: questions that restate the summary without adding actionable detail.
  if (s.startsWith("can you confirm")) return true;
  if (s === "who is responsible for signing off?" || s === "who is signing off?") return true;
  if (s.includes("who is responsible") && s.includes("signing off")) return true;
  if (s.includes("who is the owner") && (s.includes("sign") || s.includes("approve"))) return true;
  if ((s.includes("expected date") || s.includes("target date")) && !s.includes("deploy") && !s.includes("publish")) {
    return true;
  }
  return false;
}

function uniqStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = normalizeQuestion(raw);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function buildHeuristicQuestions(scoredItems: ScoredItem[]): string[] {
  // Derive actionable follow-ups from checklist-style docs and rollout/runbook language.
  const questions: string[] = [];
  const bodies = scoredItems
    .filter((s) => s.item.type !== "user")
    .slice(0, 5)
    .map((s) => s.item.body)
    .filter(Boolean);

  const text = bodies.join("\n\n");

  // Checklist items like "- [ ] Legal review ... (Priya to coordinate)"
  const checklist = /^(?:-\s*)?\[\s*\]\s*(.+)$/gim;
  for (const match of text.matchAll(checklist)) {
    const item = (match[1] ?? "").trim();
    if (!item) continue;

    const ownerMatch = item.match(/\(([^)]+)\)\s*$/);
    const owner = ownerMatch?.[1]?.trim();
    const itemNoOwner = ownerMatch ? item.replace(/\s*\([^)]+\)\s*$/, "").trim() : item;

    // Turn the checkbox into an owner/date/definition-of-done question.
    if (owner && owner.length <= 40) {
      questions.push(`For \"${itemNoOwner}\" (${owner}) — what’s the ETA, and what’s the sign-off step?`);
    } else {
      questions.push(`For \"${itemNoOwner}\" — who owns it, and what’s the ETA?`);
    }

    if (questions.length >= 3) break;
  }

  // Rollback plan section.
  const rollbackLine = text.match(/Rollback plan:\s*([^\n]+)/i)?.[1]?.trim();
  if (rollbackLine) {
    questions.push(`Rollback: have we verified \"${rollbackLine}\" in staging, and who signs off that validation?`);
  }

  // If a doc calls out a publish/deploy window, ask for the concrete scheduling link.
  if (/publish date/i.test(text) || /deploy window/i.test(text)) {
    questions.push("What’s the planned deploy window for the rollout, and when should we publish the release notes relative to it?");
  }

  return uniqStrings(questions).slice(0, 4);
}

function buildUserPrompt(input: SynthesisInput): string {
  const { draftText, recipientName, snippets, mode, channelName, channelPurpose } = input;

  const clippedDraft = draftText.length > 700 ? `${draftText.slice(0, 700)}…` : draftText;

  // Keep prompts compact for speed.
  const snippetBlock = snippets
    .map((s, i) => {
      const body = s.item.body.length > 0 ? `\n${s.item.body.slice(0, 360)}` : "";
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
          max_tokens: 280,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: buildUserPrompt({
                draftText,
                recipientName,
                // Include a few more snippets so owners/dates/checklists can surface.
                snippets: scoredItems.slice(0, 5),
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

    const heuristicQuestions = buildHeuristicQuestions(scoredItems);
    const parsedQuestions = Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [];
    const cleanedParsedQuestions = uniqStrings(parsedQuestions);
    const genericCount = cleanedParsedQuestions.filter(isGenericOpenQuestion).length;
    const genericRatio = cleanedParsedQuestions.length
      ? genericCount / cleanedParsedQuestions.length
      : 1;

    // If the model gives vague questions, replace them with snippet-grounded ones.
    const openQuestions =
      heuristicQuestions.length > 0 && (cleanedParsedQuestions.length < 2 || genericRatio >= 0.5)
        ? uniqStrings([
            ...heuristicQuestions,
            ...cleanedParsedQuestions.filter((q) => !isGenericOpenQuestion(q)),
          ]).slice(0, 4)
        : cleanedParsedQuestions;

    const topScore = scoredItems[0]?.score ?? 0;
    let confidence: Confidence = "low";
    if (topScore >= 8) confidence = "high";
    else if (topScore >= 4) confidence = "med";

    return {
      topic: parsed.topic,
      summary: parsed.summary,
      openQuestions,
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
