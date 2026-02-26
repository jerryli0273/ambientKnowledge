"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";

type Placement = "auto" | "top" | "right" | "bottom" | "left" | "center";

type TutorialStep = {
  key: string;
  title: string;
  body: string;
  targetId?: string;
  placement?: Placement;
  suggestions?: string[];
  waitForSend?: boolean;
  allowInteraction?: boolean;
};

type Rect = { top: number; left: number; width: number; height: number; right: number; bottom: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getRectForTarget(targetId?: string): Rect | null {
  if (!targetId) return null;
  const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
}

function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640;
}

function rectsEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export default function TutorialOverlay({
  open,
  onClose,
  onFillComposer,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onFillComposer?: (text: string) => void;
  onNavigate?: (target: { kind: "channel"; channelId: string } | { kind: "dm"; recipientId: string }) => void;
}) {
  const [viewport, setViewport] = useState(() => ({ w: 1024, h: 768 }));

  const steps: TutorialStep[] = useMemo(
    () => [
      {
        key: "welcome",
        title: "Welcome to Ambient Knowledge",
        body: "This demo shows how AI can act as an invisible collaborator. As you type a message, the system finds relevant docs, code links, and context \u2014 then suggests a compact card you can attach with one click.\n\nLet\u2019s walk through it together by sending a couple of real messages.",
        placement: "center" as Placement,
      },
      {
        key: "try-compose-1",
        title: "Try it: ask about the billing migration",
        body: "You\u2019re in #platform-migration. Type a message below (or click a suggestion) and watch the context card appear. Then hit Enter to send.",
        targetId: "composer",
        placement: "top" as Placement,
        allowInteraction: true,
        waitForSend: true,
        suggestions: [
          "Hey Marcus, what\u2019s the status of the billing service migration?",
          "Can you give me a quick recap of the dual-write strategy?",
          "What were the main blockers from the last standup?",
        ],
      },
      {
        key: "context-card-explain",
        title: "The context card",
        body: "See how a Suggested Context card appeared as you typed? It automatically retrieved relevant project docs and summarized them. You can click \u201cAttach\u201d to include it with your message, or \u201cInsert link\u201d to drop a source URL into the draft.\n\nThe card is grounded in retrieved sources \u2014 not free-form AI guessing.",
        targetId: "context-card",
        placement: "right" as Placement,
        allowInteraction: true,
      },
      {
        key: "try-dm",
        title: "Try it: DM someone about a code issue",
        body: "Now let\u2019s try a DM. Click a suggestion below \u2014 it\u2019ll switch to a DM with Marcus and fill in a message about React Native performance. Send it to see code-level context.",
        placement: "center" as Placement,
        allowInteraction: true,
        waitForSend: true,
        suggestions: [
          "Hey Marcus, the RN transaction list is stuttering on Android \u2014 any ideas?",
          "What was the fix for the FlatList lazy init issue?",
        ],
      },
      {
        key: "sources",
        title: "Sources & auditability",
        body: "Every context card shows its sources \u2014 internal wiki pages, standup notes, and even public GitHub issues (e.g., React Native, Next.js). Click any source link to see the full article.\n\nThis means \u201ccode links\u201d appear naturally whenever they\u2019re relevant.",
        targetId: "context-details-toggle",
        placement: "right" as Placement,
        allowInteraction: true,
      },
      {
        key: "lookup",
        title: "Incoming context lookup",
        body: "See a message you don\u2019t have context on? Click \u201cWhat\u2019s this about?\u201d on any message to get an instant recap with sources. Try it now!",
        targetId: "lookup-button",
        placement: "bottom" as Placement,
        allowInteraction: true,
      },
      {
        key: "more-ideas",
        title: "More things to try",
        body: "You\u2019ve seen the core flow! Here are more things to explore:",
        placement: "center" as Placement,
        allowInteraction: true,
        suggestions: [
          "Hey Sarah, can you approve the PR for the API gateway rate limiting?",
          "What happened in the Feb 18 incident?",
          "Priya, what\u2019s the latest on the onboarding redesign?",
        ],
      },
      {
        key: "free",
        title: "Free roam \u2014 you\u2019re on your own!",
        body: "That\u2019s it. Switch channels, open DMs, click wiki links, and try any message you like. The context engine works across all conversations.\n\nYou can reopen this tutorial anytime from the \u2726 button in the sidebar.",
        placement: "center" as Placement,
      },
    ],
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[stepIndex];
  const lastIndex = steps.length - 1;
  const guidedSteps = steps.filter((_, i) => i > 0 && i < steps.length - 1);
  const guidedIndex = stepIndex - 1;
  const showCounter = stepIndex > 0 && stepIndex < steps.length - 1;

  useEffect(() => {
    if (!open || !onNavigate) return;
    if (step.key === "try-dm") {
      onNavigate({ kind: "dm", recipientId: "user-marcus" });
    } else if (step.key === "try-compose-1") {
      onNavigate({ kind: "channel", channelId: "platform-migration" });
    }
  }, [open, step.key, onNavigate]);

  const handleMessageSent = useCallback(() => {
    if (step.waitForSend) {
      setStepIndex((i) => Math.min(lastIndex, i + 1));
    }
  }, [step.waitForSend, lastIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = () => handleMessageSent();
    window.addEventListener("tutorial:messageSent", handler);
    return () => window.removeEventListener("tutorial:messageSent", handler);
  }, [open, handleMessageSent]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  const prevRectRef = useRef<Rect | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      setViewport((prev) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
      const next = getRectForTarget(step.targetId);
      if (!rectsEqual(next, prevRectRef.current)) {
        prevRectRef.current = next;
        setRect(next);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // Only poll when we're targeting an element (need to track layout shifts)
    const id = step.targetId ? window.setInterval(update, 800) : 0;
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      if (id) window.clearInterval(id);
    };
  }, [open, step.targetId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const vw = viewport.w;
  const vh = viewport.h;
  const overlayColor = "color-mix(in srgb, var(--main-text) 45%, transparent)";
  const allowInteraction = step.allowInteraction ?? false;

  const spotlight = rect
    ? {
        position: "fixed" as const,
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
        borderRadius: 12,
        boxShadow: allowInteraction ? "none" : `0 0 0 9999px ${overlayColor}`,
        border: "2px solid var(--accent)",
        pointerEvents: "none" as const,
        transition: "top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease",
        zIndex: 61,
      }
    : null;

  const mobile = isSmallViewport();
  const cardWidth = mobile ? Math.min(vw - 24, 420) : 400;
  const placement: Placement = mobile
    ? "center"
    : (step.placement ?? "auto") === "auto"
      ? rect ? "right" : "center"
      : (step.placement ?? "auto");

  let cardTop = 16;
  let cardLeft = 16;
  if (placement === "center" || !rect) {
    cardTop = mobile ? Math.max(16, vh - 280) : Math.max(16, (vh - 280) / 2);
    cardLeft = Math.max(12, (vw - cardWidth) / 2);
  } else {
    const margin = 14;
    const preferredTop = rect.top;
    if (placement === "right") {
      cardTop = clamp(preferredTop, 12, vh - 300);
      cardLeft = clamp(rect.right + margin, 12, vw - cardWidth - 12);
    } else if (placement === "left") {
      cardTop = clamp(preferredTop, 12, vh - 300);
      cardLeft = clamp(rect.left - margin - cardWidth, 12, vw - cardWidth - 12);
    } else if (placement === "bottom") {
      cardTop = clamp(rect.bottom + margin, 12, vh - 300);
      cardLeft = clamp(rect.left, 12, vw - cardWidth - 12);
    } else if (placement === "top") {
      cardTop = clamp(rect.top - margin - 280, 12, vh - 300);
      cardLeft = clamp(rect.left, 12, vw - cardWidth - 12);
    }
  }

  const canBack = stepIndex > 0;
  const canNext = stepIndex < lastIndex && !step.waitForSend;

  const handleSuggestionClick = (text: string) => {
    if (step.key === "try-dm" && onNavigate) {
      onNavigate({ kind: "dm", recipientId: "user-marcus" });
    }
    if (step.key === "more-ideas" && onNavigate) {
      const lower = text.toLowerCase();
      if (lower.includes("sarah") || lower.includes("api gateway")) {
        onNavigate({ kind: "channel", channelId: "api-gateway" });
      } else if (lower.includes("incident") || lower.includes("feb 18")) {
        onNavigate({ kind: "channel", channelId: "incident-ops" });
      } else if (lower.includes("priya") || lower.includes("onboarding")) {
        onNavigate({ kind: "dm", recipientId: "user-priya" });
      }
    }
    onFillComposer?.(text);
  };

  return (
    <>
      {/* Backdrop: blocks background clicks on non-interactive steps */}
      {!allowInteraction && (
        <div
          className="fixed inset-0 z-[60]"
          style={{ background: spotlight ? "transparent" : overlayColor }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {spotlight && <div style={spotlight} />}

      <div
        className="fixed rounded-xl border p-4 z-[62]"
        style={{
          width: cardWidth,
          top: cardTop,
          left: cardLeft,
          background: "var(--main-bg)",
          borderColor: "var(--main-border)",
          boxShadow: "0 10px 24px color-mix(in srgb, var(--main-text) 18%, transparent)",
        }}
        role="dialog"
        aria-label="Tutorial"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
              {showCounter ? `Tutorial \u00b7 Step ${guidedIndex} / ${guidedSteps.length}` : "Tutorial"}
            </p>
            <h2 className="text-[15px] font-bold mt-1" style={{ color: "var(--main-text)" }}>
              {step.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-gray-100"
            style={{ color: "var(--main-text-muted)" }}
            title="Close (Esc)"
          >
            Skip
          </button>
        </div>

        <p className="text-[13px] leading-relaxed mt-2 whitespace-pre-line" style={{ color: "var(--main-text-muted)" }}>
          {step.body}
        </p>

        {step.suggestions && step.suggestions.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              {step.waitForSend ? "Click to try:" : "Suggestions:"}
            </p>
            {step.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="text-left text-[12.5px] leading-snug px-3 py-2 rounded-lg border transition-all hover:scale-[1.01]"
                style={{
                  borderColor: "var(--main-border)",
                  color: "var(--main-text)",
                  background: "color-mix(in srgb, var(--accent) 6%, var(--main-bg))",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 12%, var(--main-bg))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--main-border)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 6%, var(--main-bg))";
                }}
              >
                &ldquo;{s}&rdquo;
              </button>
            ))}
          </div>
        )}

        {step.waitForSend && (
          <p className="text-[11.5px] mt-2 italic" style={{ color: "var(--main-text-muted)" }}>
            Type or click a suggestion, then press Enter to send. The tutorial advances automatically.
          </p>
        )}

        {step.targetId && !rect && !step.waitForSend ? (
          <p className="text-[12px] mt-2 italic" style={{ color: "var(--main-text-muted)" }}>
            Tip: this element isn&apos;t visible yet &mdash; follow the step, then it will highlight.
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!canBack}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 hover:bg-gray-100"
            style={{ color: "var(--main-text)" }}
          >
            &larr; Back
          </button>

          {canNext ? (
            <button
              onClick={() => setStepIndex((i) => Math.min(lastIndex, i + 1))}
              className="rounded-md px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Next &rarr;
            </button>
          ) : step.waitForSend ? (
            <button
              onClick={() => setStepIndex((i) => Math.min(lastIndex, i + 1))}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-100"
              style={{ color: "var(--main-text-muted)" }}
            >
              Skip step &rarr;
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Done &#10022;
            </button>
          )}
        </div>
      </div>
    </>
  );
}
