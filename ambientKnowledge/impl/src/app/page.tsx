"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Composer from "@/components/Composer";
import ContextCard from "@/components/ContextCard";
import MessageList from "@/components/MessageList";
import Avatar from "@/components/Avatar";
import TutorialGate from "@/components/TutorialGate";
import { useContextSuggestion } from "@/hooks/useContextSuggestion";
import { USERS, CURRENT_USER_ID } from "@/lib/users";
import {
  CHANNEL_MESSAGES,
  CHANNELS,
  DEFAULT_CHANNEL_ID,
  DIRECT_MESSAGES,
  getChannelById,
} from "@/lib/channels";
import type { Message, AttachedContext } from "@/lib/types";
import { emitTutorialMessageSent, emitTutorialContextAttached, emitTutorialOpen } from "@/lib/tutorialEvents";

type ActiveView =
  | { kind: "channel"; channelId: string }
  | { kind: "dm"; recipientId: string };

/** Shape of the data we stash in history.state */
interface NavState {
  view: ActiveView;
  attachedContext: AttachedContext | null;
  draftText: string;
}

export default function Home() {
  const initialChannel = DEFAULT_CHANNEL_ID;

  const [tutorialIsOpen, setTutorialIsOpen] = useState(false);
  const [tutorialStepKey, setTutorialStepKey] = useState<string>("");
  const tutorialWasOpenRef = useRef(false);

  const [activeView, setActiveView] = useState<ActiveView>({
    kind: "channel",
    channelId: initialChannel,
  });
  const activeChannelId = activeView.kind === "channel" ? activeView.channelId : null;
  const activeDmRecipientId = activeView.kind === "dm" ? activeView.recipientId : null;

  const [recipientId, setRecipientId] = useState(() => {
    const channel = getChannelById(initialChannel);
    return channel?.recipientId ?? CHANNELS[0].recipientId;
  });
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(
    CHANNEL_MESSAGES,
  );
  const [messagesByDm, setMessagesByDm] = useState<Record<string, Message[]>>(DIRECT_MESSAGES);
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(null);
  const [draftText, setDraftText] = useState("");

  /** Track whether we're currently restoring from popstate to avoid loops */
  const restoringRef = useRef(false);

  const { suggestion, loading, error, onDraftChange, dismiss, setInitialDraft } =
    useContextSuggestion(
      recipientId,
      activeView.kind === "channel" ? activeView.channelId : `dm-${activeView.recipientId}`,
    );

  const activeChannel = useMemo(
    () => getChannelById(activeChannelId ?? "") ?? CHANNELS[0],
    [activeChannelId],
  );
  const messages = useMemo(() => {
    if (activeView.kind === "channel") {
      return messagesByChannel[activeView.channelId] ?? [];
    }
    return messagesByDm[activeView.recipientId] ?? [];
  }, [activeView, messagesByChannel, messagesByDm]);
  const recipient = USERS[recipientId];

  // ── Helper: build URL for a view ─────────────────────────
  const urlForView = useCallback((view: ActiveView) => {
    if (view.kind === "dm") return `/?dm=${view.recipientId}`;
    return `/?channel=${view.channelId}`;
  }, []);

  // ── Helper: apply a view + context from history state ────
  const applyNavState = useCallback(
    (state: NavState) => {
      restoringRef.current = true;
      setActiveView(state.view);
      setAttachedContext(state.attachedContext);
      setDraftText(state.draftText);

      if (state.view.kind === "dm") {
        setRecipientId(state.view.recipientId);
      } else {
        const channel = getChannelById(state.view.channelId);
        if (channel) setRecipientId(channel.recipientId);
      }

      // Restore the draft into the context hook so suggestion fires if needed
      if (state.draftText.length > 0) {
        setInitialDraft(state.draftText);
      } else {
        dismiss();
      }

      // Allow next state push after a tick
      requestAnimationFrame(() => {
        restoringRef.current = false;
      });
    },
    [dismiss, setInitialDraft],
  );

  // ── Save current state into history.state (replaceState) so
  //    the *current* entry is always fresh before we push a new one.
  const saveCurrentState = useCallback(() => {
    const state: NavState = {
      view: activeView,
      attachedContext,
      draftText,
    };
    window.history.replaceState(state, "", urlForView(activeView));
  }, [activeView, attachedContext, draftText, urlForView]);

  // ── On mount: read URL → set initial view, replace state ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dmFromUrl = params.get("dm");
    const channelFromUrl = params.get("channel");

    let view: ActiveView = { kind: "channel", channelId: initialChannel };

    if (dmFromUrl && USERS[dmFromUrl]) {
      view = { kind: "dm", recipientId: dmFromUrl };
      setActiveView(view);
      setRecipientId(dmFromUrl);
    } else if (channelFromUrl && getChannelById(channelFromUrl)) {
      const channel = getChannelById(channelFromUrl)!;
      view = { kind: "channel", channelId: channel.id };
      setActiveView(view);
      setRecipientId(channel.recipientId);
    }

    // Seed history.state for the initial entry
    const state: NavState = { view, attachedContext: null, draftText: "" };
    window.history.replaceState(state, "", urlForView(view));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tutorialIsOpen) {
      tutorialWasOpenRef.current = true;
      return;
    }
    if (!tutorialWasOpenRef.current) return;
    try {
      window.localStorage.setItem("ak_tutorial_done", "1");
    } catch {
      // ignore
    }
  }, [tutorialIsOpen]);

  // ── Popstate: restore from history.state ──────────────────
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as NavState | null;
      if (state?.view) {
        applyNavState(state);
      } else {
        // Fallback: read from URL
        const params = new URLSearchParams(window.location.search);
        const dm = params.get("dm");
        const ch = params.get("channel");
        const fallback: NavState = {
          view: dm && USERS[dm]
            ? { kind: "dm", recipientId: dm }
            : { kind: "channel", channelId: ch && getChannelById(ch) ? ch : initialChannel },
          attachedContext: null,
          draftText: "",
        };
        applyNavState(fallback);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyNavState, initialChannel]);

  // ── Navigate to a channel ─────────────────────────────────
  const selectChannel = useCallback(
    (channelId: string) => {
      if (restoringRef.current) return;
      const channel = getChannelById(channelId);
      if (!channel) return;

      // Save current page state before leaving
      saveCurrentState();

      const newView: ActiveView = { kind: "channel", channelId: channel.id };
      const newState: NavState = { view: newView, attachedContext: null, draftText: "" };
      window.history.pushState(newState, "", urlForView(newView));

      setActiveView(newView);
      setRecipientId(channel.recipientId);
      setAttachedContext(null);
      setDraftText("");
      dismiss();
    },
    [dismiss, saveCurrentState, urlForView],
  );

  // ── Navigate to a DM ──────────────────────────────────────
  const selectRecipient = useCallback(
    (nextRecipientId: string) => {
      if (restoringRef.current) return;
      if (!USERS[nextRecipientId]) return;

      // Save current page state before leaving
      saveCurrentState();

      const newView: ActiveView = { kind: "dm", recipientId: nextRecipientId };
      const newState: NavState = { view: newView, attachedContext: null, draftText: "" };
      window.history.pushState(newState, "", urlForView(newView));

      setActiveView(newView);
      setRecipientId(nextRecipientId);
      setAttachedContext(null);
      setDraftText("");
      dismiss();
    },
    [dismiss, saveCurrentState, urlForView],
  );

  // ── Track draft text for state persistence ────────────────
  const handleDraftChange = useCallback(
    (text: string) => {
      setDraftText(text);
      onDraftChange(text);
    },
    [onDraftChange],
  );

  const dmHasAnyAttachedContextMessage = useMemo(() => {
    if (activeView.kind !== "dm") return false;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.senderId !== CURRENT_USER_ID) continue;
      return !!msg.attachedContext;
    }
    return false;
  }, [activeView.kind, messages]);

  const tutorialRequiresAttachToSendDm =
    tutorialIsOpen &&
    activeView.kind === "dm" &&
    (tutorialStepKey === "try-dm" || (tutorialStepKey === "sources" && !dmHasAnyAttachedContextMessage));

  const blockDmSendForTutorial = tutorialRequiresAttachToSendDm && !attachedContext;
  const blockDmSendReason = "Attach the Suggested Context card to send this DM during the tutorial.";

  const handleSend = useCallback(
    (text: string) => {
      if (blockDmSendForTutorial) {
        return;
      }
      const msg: Message = {
        id: `msg-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        recipientId,
        text,
        timestamp: Date.now(),
        attachedContext: attachedContext ?? undefined,
      };
      if (activeView.kind === "channel") {
        setMessagesByChannel((prev) => ({
          ...prev,
          [activeView.channelId]: [...(prev[activeView.channelId] ?? []), msg],
        }));
      } else {
        setMessagesByDm((prev) => ({
          ...prev,
          [activeView.recipientId]: [...(prev[activeView.recipientId] ?? []), msg],
        }));
      }
      setAttachedContext(null);
      setDraftText("");
      dismiss();

      emitTutorialMessageSent();
    },
    [recipientId, attachedContext, dismiss, activeView, blockDmSendForTutorial],
  );

  const handleAttach = useCallback(() => {
    if (!suggestion?.topic || !suggestion.summary) return;
    setAttachedContext({
      topic: suggestion.topic,
      summary: suggestion.summary,
      openQuestions: suggestion.openQuestions,
      sources: suggestion.sources ?? [],
    });
    dismiss();

    emitTutorialContextAttached();
  }, [suggestion, dismiss]);

  const handleInsertLink = useCallback(() => {
    const sources = suggestion?.sources ?? [];
    const best =
      sources.find((s) => s.url && s.type !== "user") ??
      sources.find((s) => s.url);

    const url = best?.url;
    const title = best?.title;
    if (!url) return;

    const separator = draftText.trim().length > 0 ? "\n" : "";
    const line = title ? `Related: ${title} — ${url}` : `Related: ${url}`;
    const next = draftText + separator + line;
    setDraftText(next);
    onDraftChange(next);
  }, [draftText, onDraftChange, suggestion?.sources]);

  const handleRemoveContext = useCallback(() => {
    setAttachedContext(null);
  }, []);

  /** When the user clicks an open question in the ContextCard, append it to the draft */
  const handleQuestionClick = useCallback(
    (question: string) => {
      const separator = draftText.trim().length > 0 ? "\n" : "";
      const newDraft = draftText + separator + question;
      setDraftText(newDraft);
      onDraftChange(newDraft);
    },
    [draftText, onDraftChange],
  );

  const handleTutorialFillComposer = useCallback(
    (text: string) => {
      setDraftText(text);
      onDraftChange(text);
    },
    [onDraftChange],
  );

  const handleTutorialNavigate = useCallback(
    (target: { kind: "channel"; channelId: string } | { kind: "dm"; recipientId: string }) => {
      if (target.kind === "channel") {
        selectChannel(target.channelId);
      } else {
        selectRecipient(target.recipientId);
      }
    },
    [selectChannel, selectRecipient],
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeChannelId={activeChannelId ?? ""}
        activeDmRecipientId={activeDmRecipientId}
        onSelectChannel={selectChannel}
        recipientId={recipientId}
        onSelectRecipient={selectRecipient}
        onOpenTutorial={() => {
          emitTutorialOpen();
        }}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Channel header */}
        <header
          className="flex items-center gap-3 px-5 py-2.5 border-b shrink-0"
          style={{ borderColor: "var(--main-border)" }}
        >
          <Avatar user={recipient} size="md" showStatus />
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--main-text)" }}>
              {activeView.kind === "channel" ? `#${activeChannel.name}` : recipient.name}
            </h2>
            <p className="text-[12px]" style={{ color: "var(--main-text-muted)" }}>
              {activeView.kind === "channel"
                ? `${activeChannel.purpose} · working with ${recipient.name}`
                : `Direct message with ${recipient.name}`}
            </p>
          </div>
        </header>

        {/* Messages (scrollable, fills remaining space) */}
        <div className="flex-1 overflow-y-auto py-4">
          <MessageList
            messages={messages}
            currentUserId={CURRENT_USER_ID}
            channelId={activeView.kind === "channel" ? activeView.channelId : `dm-${activeView.recipientId}`}
          />
        </div>

        {/* Context card (above composer) */}
        <AnimatePresence>
          {(suggestion || loading || error) && (
            <ContextCard
              suggestion={suggestion}
              loading={loading}
              error={error}
              onAttach={handleAttach}
              onInsertLink={handleInsertLink}
              onDismiss={dismiss}
              onQuestionClick={handleQuestionClick}
            />
          )}
        </AnimatePresence>

        {/* Composer (pinned to bottom) */}
        <Composer
          recipient={recipient}
          attachedContext={attachedContext}
          draftText={draftText}
          onDraftChange={handleDraftChange}
          onSend={handleSend}
          onRemoveContext={handleRemoveContext}
          sendDisabled={blockDmSendForTutorial}
          sendDisabledReason={blockDmSendReason}
        />
      </div>

      <TutorialGate
        onFillComposer={handleTutorialFillComposer}
        onNavigate={handleTutorialNavigate}
        onOpenChange={setTutorialIsOpen}
        onStepKeyChange={setTutorialStepKey}
        autoOpen
      />
    </div>
  );
}
