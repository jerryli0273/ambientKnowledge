"use client";

import { useState, useRef, useEffect } from "react";
import type { AttachedContext, User } from "@/lib/types";

interface ComposerProps {
  recipient: User;
  attachedContext: AttachedContext | null;
  /** Externally controlled draft text (for back/forward restore). */
  draftText?: string;
  onDraftChange: (text: string) => void;
  onSend: (text: string) => void;
  onRemoveContext: () => void;
}

export default function Composer({
  recipient,
  attachedContext,
  draftText: externalDraft,
  onDraftChange,
  onSend,
  onRemoveContext,
}: ComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from external draft when it changes (e.g. popstate restore)
  useEffect(() => {
    if (externalDraft !== undefined && externalDraft !== draft) {
      setDraft(externalDraft);
    }
    // Only react to external changes, not internal draft changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDraft]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [draft]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setDraft(text);
    onDraftChange(text);
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-5 pb-4">
      <div
        className="rounded-lg border transition-colors"
        style={{
          borderColor: "var(--composer-border)",
          background: "var(--composer-bg)",
        }}
        data-tutorial-id="composer"
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--composer-focus)";
          e.currentTarget.style.boxShadow = "0 0 0 1px var(--composer-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--composer-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Attached context preview */}
        {attachedContext && (
          <div className="mx-2 mt-2.5 rounded-lg overflow-hidden" style={{ border: "1px solid var(--composer-border)" }}>
            {/* Accent top bar */}
            <div className="h-[3px]" style={{ background: "var(--accent)" }} />
            <div className="px-3 py-2" style={{ background: "var(--accent-light)" }}>
              {/* Header row */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: "var(--accent-dark)" }}>
                  ✨ {attachedContext.topic}
                </span>
                <button
                  onClick={onRemoveContext}
                  className="text-[12px] hover:opacity-60 transition-opacity rounded px-1"
                  style={{ color: "var(--accent-dark)" }}
                  aria-label="Remove context"
                >
                  ✕
                </button>
              </div>
              {/* Summary */}
              <p className="text-[11.5px] leading-relaxed line-clamp-2 opacity-80" style={{ color: "var(--accent-dark)" }}>
                {attachedContext.summary}
              </p>
              {/* Source count */}
              {attachedContext.sources.length > 0 && (
                <span className="text-[10.5px] mt-1 inline-block opacity-60" style={{ color: "var(--accent-dark)" }}>
                  📎 {attachedContext.sources.length} source{attachedContext.sources.length !== 1 ? "s" : ""} attached
                </span>
              )}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipient.name}…`}
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-[1.46] outline-none placeholder:text-gray-400"
          style={{ color: "var(--main-text)" }}
        />

        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-t"
          style={{ borderColor: "var(--main-border)" }}
        >
          <div className="flex items-center gap-1">
            {/* Formatting hint icons */}
            <ToolbarButton title="Bold">
              <strong className="text-[13px]">B</strong>
            </ToolbarButton>
            <ToolbarButton title="Italic">
              <em className="text-[13px]">I</em>
            </ToolbarButton>
            <ToolbarButton title="Code">
              <span className="text-[12px] font-mono">&lt;/&gt;</span>
            </ToolbarButton>
          </div>

          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="rounded-lg p-1.5 transition-colors disabled:opacity-30"
            style={{
              background: draft.trim() ? "var(--accent)" : "transparent",
              color: draft.trim() ? "#fff" : "var(--main-text-muted)",
            }}
            title="Send (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M1.5 8L14 1.5L10.5 14.5L8 9L1.5 8Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-[11px] mt-1 px-1" style={{ color: "var(--main-text-muted)" }}>
        <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
      </p>
    </div>
  );
}

function ToolbarButton({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-gray-100"
      style={{ color: "var(--main-text-muted)" }}
    >
      {children}
    </button>
  );
}
