"use client";

import { useCallback, useRef, useState } from "react";
import type { ContextResponse } from "@/lib/types";

const DEBOUNCE_MS = 250;
const MIN_LENGTH = 10;
const COOLDOWN_MS = 900;
const DISMISS_SUPPRESS_MS = 12_000;

function normalizeDraft(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 240);
}

/**
 * Hook that debounces draft text and fetches context suggestions
 * from /api/context. Includes cooldown + min-length heuristics
 * to avoid noisy requests.
 */
export function useContextSuggestion(recipientId: string, channelId?: string) {
  const [suggestion, setSuggestion] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastDismissRef = useRef<{ key: string; at: number } | null>(null);
  const lastDraftKeyRef = useRef<string>("");

  const fetchContext = useCallback(
    async (draftText: string) => {
      if (draftText.trim().length < MIN_LENGTH) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      // If the user dismissed suggestions for this same draft recently, stay quiet.
      const key = normalizeDraft(draftText);
      if (
        lastDismissRef.current &&
        lastDismissRef.current.key === key &&
        Date.now() - lastDismissRef.current.at < DISMISS_SUPPRESS_MS
      ) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      // Cooldown: if a request was made recently, schedule a retry
      const now = Date.now();
      const elapsed = now - lastFetchRef.current;
      if (elapsed < COOLDOWN_MS) {
        // Schedule retry after cooldown expires
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(
          () => fetchContext(draftText),
          COOLDOWN_MS - elapsed + 50,
        );
        return;
      }

      // Abort previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      lastFetchRef.current = Date.now();

      try {
        const res = await fetch("/api/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftText, recipientId, channelId, mode: "compose" }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data: ContextResponse = await res.json();

        if (data.topic && data.summary) {
          setSuggestion(data);
        } else {
          setSuggestion(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[useContextSuggestion]", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setSuggestion(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [recipientId, channelId],
  );

  const onDraftChange = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (text.trim().length < MIN_LENGTH) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      // If this draft is currently suppressed due to a recent dismiss, don't flash loading.
      const key = normalizeDraft(text);
      lastDraftKeyRef.current = key;
      if (
        lastDismissRef.current &&
        lastDismissRef.current.key === key &&
        Date.now() - lastDismissRef.current.at < DISMISS_SUPPRESS_MS
      ) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      setLoading(true); // Show loading immediately on debounce start
      timerRef.current = setTimeout(() => fetchContext(text), DEBOUNCE_MS);
    },
    [fetchContext],
  );

  const dismiss = useCallback(() => {
    // Suppress re-suggesting the same draft for a short window.
    if (lastDraftKeyRef.current) {
      lastDismissRef.current = { key: lastDraftKeyRef.current, at: Date.now() };
    }
    abortRef.current?.abort();
    setSuggestion(null);
    setLoading(false);
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  /**
   * Restore a draft from history state — triggers a fetch immediately
   * (bypassing debounce) so the suggestion re-appears.
   */
  const setInitialDraft = useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (text.trim().length < MIN_LENGTH) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      const key = normalizeDraft(text);
      lastDraftKeyRef.current = key;
      if (
        lastDismissRef.current &&
        lastDismissRef.current.key === key &&
        Date.now() - lastDismissRef.current.at < DISMISS_SUPPRESS_MS
      ) {
        setSuggestion(null);
        setLoading(false);
        return;
      }
      fetchContext(text);
    },
    [fetchContext],
  );

  return { suggestion, loading, error, onDraftChange, dismiss, setInitialDraft };
}
