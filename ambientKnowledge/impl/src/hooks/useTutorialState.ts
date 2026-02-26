"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TUTORIAL_EVENTS } from "@/lib/tutorialEvents";

const STORAGE_OPEN_KEY = "ambientKnowledge:tutorialOpen";
const STORAGE_STEP_KEY = "ambientKnowledge:tutorialStepIndex";
const STORAGE_DISMISSED_KEY = "ambientKnowledge:tutorialDismissed";
const STORAGE_AUTOOPEN_KEY = "ambientKnowledge:tutorialAutoOpened";

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
    // Manual/open-event starts should override a previous dismissal.
    safeWrite(STORAGE_DISMISSED_KEY, "false");
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    safeWrite(STORAGE_OPEN_KEY, "false");
    // If the user closes/skips, don't auto-open again this session.
    safeWrite(STORAGE_DISMISSED_KEY, "true");
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
    const dismissed = readBool(STORAGE_DISMISSED_KEY, false);
    const alreadyAutoOpened = readBool(STORAGE_AUTOOPEN_KEY, false);
    if (dismissed || alreadyAutoOpened) return;
    safeWrite(STORAGE_AUTOOPEN_KEY, "true");
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
