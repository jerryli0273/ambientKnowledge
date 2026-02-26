"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TUTORIAL_EVENTS } from "@/lib/tutorialEvents";

const STORAGE_OPEN_KEY = "ambientKnowledge:tutorialOpen";
const STORAGE_STEP_KEY = "ambientKnowledge:tutorialStepIndex";

function safeRead(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = safeRead(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function readInt(key: string, fallback: number): number {
  const raw = safeRead(key);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function useTutorialState({ autoOpen }: { autoOpen?: boolean } = {}) {
  const initialOpen = useMemo(() => readBool(STORAGE_OPEN_KEY, false), []);
  const initialStep = useMemo(() => readInt(STORAGE_STEP_KEY, 0), []);

  const [open, setOpen] = useState(initialOpen);
  const [initialStepIndex, setInitialStepIndex] = useState(initialStep);

  const openFromStart = useCallback(() => {
    setInitialStepIndex(0);
    setOpen(true);
    safeWrite(STORAGE_STEP_KEY, "0");
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    safeWrite(STORAGE_OPEN_KEY, "false");
  }, []);

  const persistStepIndex = useCallback((nextIndex: number) => {
    safeWrite(STORAGE_STEP_KEY, String(nextIndex));
  }, []);

  // Persist open state.
  useEffect(() => {
    safeWrite(STORAGE_OPEN_KEY, String(open));
  }, [open]);

  // Optionally start the guided demo immediately on mount.
  useEffect(() => {
    if (!autoOpen) return;
    if (open) return;
    openFromStart();
  }, [autoOpen, open, openFromStart]);

  // Allow any page to open the tutorial via a global event.
  useEffect(() => {
    const handler = () => openFromStart();
    window.addEventListener(TUTORIAL_EVENTS.open, handler);
    return () => window.removeEventListener(TUTORIAL_EVENTS.open, handler);
  }, [openFromStart]);

  return {
    open,
    setOpen,
    initialStepIndex,
    setInitialStepIndex,
    openFromStart,
    close,
    persistStepIndex,
  };
}
