import { NextRequest, NextResponse } from "next/server";
import { getContextSuggestion, getEngineStats } from "@/lib/contextEngine";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { USERS } from "@/lib/users";
import type { ContextRequest, ContextResponse } from "@/lib/types";

// ── Startup check: fail loudly if the API key is missing ──
if (!getAnthropicApiKey()) {
  console.error(
    "\n" +
    "╔══════════════════════════════════════════════════════════════╗\n" +
    "║  ⚠️   ANTHROPIC_API_KEY is NOT set!                         ║\n" +
    "║  AI synthesis will fail. Add it to .env.local:              ║\n" +
    "║                                                            ║\n" +
    "║    ANTHROPIC_API_KEY=sk-ant-...                             ║\n" +
    "║                                                            ║\n" +
    "║  Get a key → https://console.anthropic.com/                ║\n" +
    "╚══════════════════════════════════════════════════════════════╝\n"
  );
}

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown-client";
}

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const body: ContextRequest = await req.json();
    const { draftText, recipientId, mode = "compose", channelId } = body;

    if (!draftText || typeof draftText !== "string" || draftText.trim().length < 6) {
      return NextResponse.json<ContextResponse>({});
    }
    if (!recipientId || !USERS[recipientId]) {
      return NextResponse.json({ error: "Invalid recipientId" }, { status: 400 });
    }

    const clientKey = getClientKey(req);
    const result = await getContextSuggestion({
      draftText,
      recipientId,
      mode,
      channelId,
      clientKey,
    });

    if (!result) {
      return NextResponse.json<ContextResponse>({});
    }

    const stats = getEngineStats();
    const ms = Date.now() - startedAt;
    console.log(
      `[/api/context] ${ms}ms mode=${mode} tier=${result.servingTier} cache=${stats.cacheSize} inFlightSynth=${stats.inflightSynthesisCount} query="${draftText.slice(0, 60)}"`,
    );

    return NextResponse.json<ContextResponse>(result);
  } catch (err) {
    console.error("[/api/context] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
