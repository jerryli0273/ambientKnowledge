"use client";

import { useRef, useEffect, useState, memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Message, AttachedContext, ContextResponse } from "@/lib/types";
import { USERS } from "@/lib/users";
import Avatar from "./Avatar";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  channelId?: string;
}

function shouldOfferContextLookup(text: string): boolean {
  const normalized = text.toLowerCase();

  const responseSignals = [
    "thanks",
    "thank you",
    "perfect",
    "sounds good",
    "got it",
    "will do",
    "i'll",
    "i will",
    "on it",
    "makes sense",
  ];

  const clarificationSignals = [
    "?",
    "can you",
    "could you",
    "approve",
    "review",
    "status",
    "update",
    "why",
    "what",
    "blocked",
    "help",
  ];

  const technicalSignals = [
    "rn",
    "react native",
    "dashboard",
    "performance",
    "latency",
    "regression",
    "stutter",
    "migration",
    "api",
    "incident",
    "rollout",
    "schema",
    "build",
    "deploy",
    "query",
    "blocked",
    "v2",
    "%",
  ];

  const hasResponseSignal = responseSignals.some((signal) => normalized.includes(signal));
  const hasClarificationSignal = clarificationSignals.some((signal) => normalized.includes(signal));
  const hasTechnicalSignal = technicalSignals.some((signal) => normalized.includes(signal));

  // Keep acknowledgement replies quiet unless they clearly contain technical details.
  if (hasResponseSignal && !hasTechnicalSignal) {
    return false;
  }

  // Show for questions/requests, technical status updates, or longer ambiguous messages.
  if (hasClarificationSignal || hasTechnicalSignal) {
    return true;
  }

  return normalized.length >= 80;
}

/**
 * Slack-style message list. Messages flow top-to-bottom.
 * Groups consecutive messages from the same sender.
 */
const MessageList = memo(function MessageList({
  messages,
  currentUserId,
  channelId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Per-message lookup context state
  const [lookupContext, setLookupContext] = useState<Record<string, AttachedContext | null>>({});
  const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleGetContext = async (msg: Message) => {
    if (lookupLoading[msg.id]) return;
    setLookupLoading((prev) => ({ ...prev, [msg.id]: true }));

    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftText: msg.text,
          recipientId: msg.senderId,
          channelId,
          mode: "incoming_lookup",
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: ContextResponse = await res.json();

      if (data.topic && data.summary) {
        setLookupContext((prev) => ({
          ...prev,
          [msg.id]: {
            topic: data.topic!,
            summary: data.summary!,
            openQuestions: data.openQuestions,
            sources: data.sources ?? [],
          },
        }));
      } else {
        setLookupContext((prev) => ({ ...prev, [msg.id]: null }));
      }
    } catch (err) {
      console.error("[GetContext]", err);
      setLookupContext((prev) => ({ ...prev, [msg.id]: null }));
    } finally {
      setLookupLoading((prev) => ({ ...prev, [msg.id]: false }));
    }
  };

  const handleDismissContext = (msgId: string) => {
    setLookupContext((prev) => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-[15px] font-bold" style={{ color: "var(--main-text)" }}>
          Start a conversation
        </p>
        <p className="text-[13px] mt-1" style={{ color: "var(--main-text-muted)" }}>
          Type a message below. AI will suggest relevant context as you write.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => {
          const sender = USERS[msg.senderId];
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isGrouped = prevMsg?.senderId === msg.senderId;
          const isMine = msg.senderId === currentUserId;
          const isReceived = !isMine;
          const hasAttachedContext = !!msg.attachedContext;
          const hasLookup = msg.id in lookupContext;
          const isLookupLoading = lookupLoading[msg.id] ?? false;
          const canGetContext =
            isReceived &&
            !hasAttachedContext &&
            !hasLookup &&
            !isLookupLoading &&
            shouldOfferContextLookup(msg.text);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="group px-5 py-0.5 transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--msg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {!isGrouped ? (
                /* First message in a group — show avatar + name + time */
                <div className={`flex gap-2.5 ${!isGrouped && idx > 0 ? "mt-3" : ""}`}>
                  <div className="mt-0.5">
                    <Avatar user={sender} size="md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-bold" style={{ color: "var(--main-text)" }}>
                        {sender?.name}
                        {isMine && (
                          <span className="text-[11px] font-normal ml-1" style={{ color: "var(--main-text-muted)" }}>
                            (you)
                          </span>
                        )}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--main-text-muted)" }} suppressHydrationWarning>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <MessageBody msg={msg} />
                    {/* Get Context button for received messages */}
                    {canGetContext && (
                      <button
                        onClick={() => handleGetContext(msg)}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-all hover:shadow-sm"
                        style={{
                          background: "var(--context-bg)",
                          color: "var(--accent)",
                          border: "1px solid var(--context-border)",
                        }}
                        data-tutorial-id="lookup-button"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M6.5 6.5C6.5 5.67 7.17 5 8 5s1.5.67 1.5 1.5c0 .83-.67 1-1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                        </svg>
                        What&apos;s this about?
                      </button>
                    )}
                    {isLookupLoading && (
                      <LookupLoadingIndicator />
                    )}
                    {hasLookup && lookupContext[msg.id] && (
                      <div className="mt-2">
                        <AttachedContextBlock
                          context={lookupContext[msg.id]!}
                          label="Context"
                          onDismiss={() => handleDismissContext(msg.id)}
                        />
                      </div>
                    )}
                    {hasLookup && lookupContext[msg.id] === null && (
                      <div className="mt-1.5">
                        <span className="text-[12px]" style={{ color: "var(--main-text-muted)" }}>
                          No relevant context found for this message.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Grouped message — no avatar, compact */
                <div className="flex gap-2.5">
                  <div className="w-9 shrink-0 flex items-start justify-center">
                    <span
                      className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--main-text-muted)" }}
                      suppressHydrationWarning
                    >
                      {formatTimeShort(msg.timestamp)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <MessageBody msg={msg} />
                    {canGetContext && (
                      <button
                        onClick={() => handleGetContext(msg)}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-all hover:shadow-sm"
                        style={{
                          background: "var(--context-bg)",
                          color: "var(--accent)",
                          border: "1px solid var(--context-border)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M6.5 6.5C6.5 5.67 7.17 5 8 5s1.5.67 1.5 1.5c0 .83-.67 1-1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                        </svg>
                        What&apos;s this about?
                      </button>
                    )}
                    {isLookupLoading && (
                      <LookupLoadingIndicator />
                    )}
                    {hasLookup && lookupContext[msg.id] && (
                      <div className="mt-2">
                        <AttachedContextBlock
                          context={lookupContext[msg.id]!}
                          label="Context"
                          onDismiss={() => handleDismissContext(msg.id)}
                        />
                      </div>
                    )}
                    {hasLookup && lookupContext[msg.id] === null && (
                      <div className="mt-1.5">
                        <span className="text-[12px]" style={{ color: "var(--main-text-muted)" }}>
                          No relevant context found for this message.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
});

export default MessageList;

function MessageBody({ msg }: { msg: Message }) {
  return (
    <div>
      <p className="text-[15px] leading-[1.46] whitespace-pre-wrap" style={{ color: "var(--main-text)" }}>
        {renderTextWithLinks(msg.text)}
      </p>

      {msg.attachedContext && <AttachedContextBlock context={msg.attachedContext} />}
    </div>
  );
}

function renderTextWithLinks(text: string): ReactNode[] {
  // Linkify absolute URLs plus internal wiki routes.
  const pattern = /(https?:\/\/[^\s]+|\/wiki\/[A-Za-z0-9_-]+)/g;
  const parts = text.split(pattern);
  return parts.map((part, idx) => {
    if (!part) return null;
    const isHttp = part.startsWith("http://") || part.startsWith("https://");
    const isWiki = part.startsWith("/wiki/");
    if (isHttp || isWiki) {
      if (isWiki) {
        return (
          <Link
            key={`link-${idx}`}
            href={part}
            className="underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            {part}
          </Link>
        );
      }
      return (
        <a
          key={`link-${idx}`}
          href={part}
          {...(isHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          {part}
        </a>
      );
    }
    return <span key={`text-${idx}`}>{part}</span>;
  });
}

/** Loading indicator for "What's this about?" lookups */
function LookupLoadingIndicator() {
  return (
    <div
      className="mt-2 rounded-lg border overflow-hidden max-w-lg"
      style={{ borderColor: "var(--context-border)", background: "var(--context-bg)" }}
    >
      <div className="h-0.5 overflow-hidden" style={{ background: "var(--accent-light)" }}>
        <div
          className="h-full animate-pulse"
          style={{
            background: "var(--accent)",
            width: "60%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-3.5 h-3.5">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ background: "var(--accent)" }}
            />
            <div
              className="absolute inset-0.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
          </div>
          <span className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>
            Analyzing message context…
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-3/4 rounded bg-gray-200 animate-pulse" />
          <div className="h-2.5 w-full rounded bg-gray-200 animate-pulse" />
          <div className="h-2.5 w-2/3 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Rich context attachment card shown inline in messages */
function AttachedContextBlock({
  context,
  label = "Attached Context",
  onDismiss,
}: {
  context: AttachedContext;
  label?: string;
  onDismiss?: () => void;
}) {

  const typeIcons: Record<string, string> = {
    project: "📋",
    note: "📝",
    user: "👤",
  };

  return (
    <div
      className="mt-2 rounded-lg border overflow-hidden max-w-lg"
      style={{ borderColor: "var(--main-border)", background: "var(--main-bg)" }}
      data-tutorial-id="attached-context"
    >
      {/* Accent bar */}
      <div className="h-1" style={{ background: "var(--accent)" }} />

      <div className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[11px]"
              style={{ background: "var(--accent-light)" }}
            >
              ✨
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                {label}
              </p>
              <p className="text-[14px] font-bold" style={{ color: "var(--main-text)" }}>
                {context.topic}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[12px] rounded px-1.5 py-0.5 hover:bg-gray-100 transition-colors"
              style={{ color: "var(--main-text-muted)" }}
              aria-label="Dismiss context"
            >
              ✕
            </button>
          )}
        </div>

        {/* Summary */}
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--main-text-muted)" }}
          >
            Summary
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--main-text-muted)" }}>
            {context.summary}
          </p>
        </div>

        {/* Open Questions */}
        {context.openQuestions && context.openQuestions.length > 0 && (
          <div
            className="rounded-md p-2.5"
            style={{ background: "var(--context-bg)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--warning)" }}>
              💡 Open Questions
            </p>
            {context.openQuestions.map((q, i) => (
              <p key={i} className="text-[12px] leading-relaxed" style={{ color: "var(--main-text)" }}>
                • {q}
              </p>
            ))}
          </div>
        )}

        {/* Source links */}
        {context.sources.length > 0 && (
          <div data-tutorial-id="attached-context-sources">
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--main-text-muted)" }}
            >
              Linked Sources (used for this summary)
            </p>
            <div className="flex flex-wrap gap-1.5">
            {context.sources.map((source) => {
              const isInternal = source.url?.startsWith("/");
              const commonProps = {
                className:
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:opacity-80",
                style: {
                  background: "var(--accent-light)",
                  color: "var(--accent-dark)",
                  textDecoration: "none",
                } as CSSProperties,
                title: source.title,
              };

              const content = (
                <>
                  <span>{typeIcons[source.type] || "📄"}</span>
                  <span className="truncate max-w-[180px]">{source.title}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 opacity-60">
                    <path d="M7 3L3 7M7 3H4M7 3V6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              );

              if (isInternal) {
                return (
                  <Link key={source.id} href={source.url || "#"} {...commonProps}>
                    {content}
                  </Link>
                );
              }

              return (
                <a
                  key={source.id}
                  href={source.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...commonProps}
                >
                  {content}
                </a>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeShort(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
