"use client";

import { useEffect } from "react";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useTutorialState } from "@/hooks/useTutorialState";

export default function TutorialGate({
  onFillComposer,
  onNavigate,
  onOpenChange,
  onStepKeyChange,
  autoOpen,
}: {
  onFillComposer?: (text: string) => void;
  onNavigate?: (target: { kind: "channel"; channelId: string } | { kind: "dm"; recipientId: string }) => void;
  onOpenChange?: (open: boolean) => void;
  onStepKeyChange?: (stepKey: string) => void;
  autoOpen?: boolean;
}) {
  const { open, initialStepIndex, close, persistStepIndex } = useTutorialState({ autoOpen });

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    <TutorialOverlay
      open={open}
      onClose={close}
      onFillComposer={onFillComposer}
      onNavigate={onNavigate}
      initialStepIndex={initialStepIndex}
      onStepIndexChange={persistStepIndex}
      onStepKeyChange={onStepKeyChange}
    />
  );
}
