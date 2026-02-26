"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { ContextResponse } from "@/lib/types";

function formatAge(ms?: number): string | null {
  if (ms === undefined || ms === null) return null;
  if (ms <= 0) return "just now";
  if (ms < 1000) return `${ms}ms ago`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s ago`;
}

function formatTier(tier?: string): string | null {
  if (!tier) return null;
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

interface ContextCardProps {
  suggestion: ContextResponse | null;
  loading: boolean;
  error: string | null;
  onAttach: () => void;
  onInsertLink?: () => void;
  onDismiss: () => void;
  onQuestionClick?: (question: string) => void;
}

export default function ContextCard({
  suggestion,
  loading,
  error,
  onAttach,
  onInsertLink,
  onDismiss,
  onQuestionClick,
}: ContextCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Auto-expand details when synthesis provides open questions
  useEffect(() => {
    if (
      suggestion?.servingTier === "synthesis" &&
      suggestion?.openQuestions &&
      suggestion.openQuestions.length > 0
    ) {
      setDetailsOpen(true);
    }
  }, [suggestion?.servingTier, suggestion?.openQuestions]);



  // Loading skeleton with stage indicator
  if (loading && !suggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="mx-5 mb-3 rounded-lg border p-3"
        style={{
          background: "var(--context-bg)",
          borderColor: "var(--context-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative w-4 h-4">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: "var(--accent)" }}
            />
            <div
              className="absolute inset-0.5 rounded-full animate-pulse"
              style={{ background: "var(--accent)" }}
            />
          </div>
          <span className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>
            Searching knowledge base…
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-gray-200 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error && !suggestion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="mx-5 mb-3 rounded-lg border p-3"
        style={{
          background: "var(--context-bg)",
          borderColor: "var(--danger)",
        }}
      >
        <p className="text-[12px]" style={{ color: "var(--danger)" }}>
          Failed to load context: {error}
        </p>
      </motion.div>
    );
  }

  if (!suggestion?.topic) return null;

  const confidenceColor =
    suggestion.confidence === "high"
      ? "var(--success)"
      : suggestion.confidence === "med"
        ? "var(--warning)"
        : "var(--main-text-muted)";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={suggestion.topic}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mx-5 mb-3 rounded-lg border overflow-hidden"
        style={{
          background: "var(--context-bg)",
          borderColor: "var(--context-border)",
        }}
        data-tutorial-id="context-card"
      >
        {/* Accent top bar */}
        <div className="h-0.5" style={{ background: "var(--accent)" }} />

        <div className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">✨</span>
              <div>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--accent)" }}
                >
                  Suggested Context
                </p>
                <h3 className="text-[14px] font-bold mt-0.5" style={{ color: "var(--main-text)" }}>
                  {suggestion.topic}
                </h3>

                {(suggestion.servingTier || suggestion.freshnessMs !== undefined) && (
                  <div className="mt-1 flex items-center gap-2">
                    {suggestion.servingTier && (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "var(--accent-light)", color: "var(--accent-dark)" }}
                        title="How this suggestion was served"
                      >
                        {formatTier(suggestion.servingTier)}
                      </span>
                    )}

                    {(suggestion.debug?.overloaded || suggestion.debug?.rateLimited) && (
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: "var(--context-bg)", color: "var(--warning)", border: "1px solid var(--context-border)" }}
                        title={
                          suggestion.debug?.overloaded
                            ? "Degraded due to load shedding"
                            : "Degraded due to rate limiting"
                        }
                      >
                        Degraded
                      </span>
                    )}

                    {formatAge(suggestion.freshnessMs) && (
                      <span className="text-[11px]" style={{ color: "var(--main-text-muted)" }}>
                        {formatAge(suggestion.freshnessMs)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span
              className="shrink-0 mt-1.5 inline-block h-2 w-2 rounded-full"
              style={{ background: confidenceColor }}
              title={`Confidence: ${suggestion.confidence}`}
            />
          </div>

          {/* Summary */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--main-text-muted)" }}>
            {suggestion.summary}
          </p>



          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAttach}
              className="rounded px-2.5 py-1 text-[12px] font-bold text-white transition-colors hover:opacity-90"
              style={{ background: "var(--accent)" }}
              data-tutorial-id="attach-context"
            >
              📎 Attach to message
            </button>

            {onInsertLink && suggestion.sources && suggestion.sources.length > 0 && (
              <button
                onClick={onInsertLink}
                className="rounded px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-gray-200"
                style={{ color: "var(--main-text-muted)" }}
                title="Insert a link to the top source into your draft"
              >
                🔗 Insert link
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-gray-200"
              style={{ color: "var(--main-text-muted)" }}
            >
              Dismiss
            </button>
          </div>

          {/* Details accordion */}
          {(suggestion.openQuestions?.length || suggestion.sources?.length) ? (
            <div className="pt-0.5">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="text-[12px] font-medium transition-colors hover:underline"
                style={{ color: "var(--accent)" }}
                data-tutorial-id="context-details-toggle"
              >
                {detailsOpen ? "Hide details ▾" : "Show details ▸"}
              </button>

              <AnimatePresence>
                {detailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 space-y-2">
                      {process.env.NODE_ENV !== "production" && suggestion.debug?.retrieved?.length ? (
                        <div>
                          <p
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: "var(--main-text-muted)" }}
                          >
                            Why this?
                          </p>
                          <div
                            className="mt-1 rounded-md p-2"
                            style={{ background: "var(--context-bg)", border: "1px solid var(--context-border)" }}
                          >
                            <ul className="space-y-1">
                              {suggestion.debug.retrieved.map((r) => (
                                <li
                                  key={r.id}
                                  className="text-[12px] flex items-baseline justify-between gap-3"
                                  style={{ color: "var(--main-text)" }}
                                >
                                  <span className="truncate">{r.title ?? r.id}</span>
                                  <span className="shrink-0" style={{ color: "var(--main-text-muted)" }}>
                                    {r.score.toFixed(1)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {(suggestion.debug.overloaded || suggestion.debug.rateLimited) && (
                              <p className="text-[11px] mt-1" style={{ color: "var(--main-text-muted)" }}>
                                {suggestion.debug.overloaded ? "Degraded: load shedding enabled." : null}
                                {suggestion.debug.overloaded && suggestion.debug.rateLimited ? " " : null}
                                {suggestion.debug.rateLimited ? "Degraded: rate limited." : null}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {suggestion.openQuestions && suggestion.openQuestions.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                            Open Questions
                          </p>
                          <ul className="mt-1 space-y-1">
                            {suggestion.openQuestions.map((q, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                {onQuestionClick ? (
                                  <button
                                    onClick={() => onQuestionClick(q)}
                                    className="text-left text-[12px] rounded-md px-2 py-1 transition-all hover:shadow-sm group/q"
                                    style={{
                                      color: "var(--accent-dark)",
                                      background: "var(--accent-light)",
                                    }}
                                    title="Click to add to your message"
                                  >
                                    <span className="opacity-60 mr-1">💬</span>
                                    {q}
                                    <span className="ml-1.5 text-[10px] opacity-0 group-hover/q:opacity-60 transition-opacity">
                                      ↵ add
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-[12px]" style={{ color: "var(--main-text)" }}>
                                    • {q}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {suggestion.sources && suggestion.sources.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--main-text-muted)" }}>
                            Sources
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {suggestion.sources.map((s) => {
                              const isInternal = s.url?.startsWith("/");
                              return (
                                isInternal ? (
                                  <Link
                                    key={s.id}
                                    href={s.url || "#"}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:opacity-80"
                                    style={{
                                      background: "var(--accent-light)",
                                      color: "var(--accent-dark)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    <span>📄</span>
                                    <span>{s.title}</span>
                                  </Link>
                                ) : (
                                  <a
                                    key={s.id}
                                    href={s.url || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:opacity-80"
                                    style={{
                                      background: "var(--accent-light)",
                                      color: "var(--accent-dark)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    <span>📄</span>
                                    <span>{s.title}</span>
                                  </a>
                                )
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
