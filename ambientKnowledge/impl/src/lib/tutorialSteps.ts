import type { TutorialStep } from "@/lib/tutorialTypes";

// Data-only tutorial content. Keeping it separate makes the overlay component
// smaller and easier to iterate on without touching layout/behavior logic.
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    key: "welcome",
    title: "Welcome to Ambient Knowledge",
    body: "This demo shows how AI can act as an invisible collaborator. As you type a message, the system finds relevant docs, code links, and context — then suggests a compact card you can attach with one click.\n\nLet’s walk through it together by sending a couple of real messages.",
    placement: "center",
  },
  {
    key: "try-compose-1",
    title: "Try it: ask for next steps on the billing migration",
    body: "You’re in #platform-migration. Instead of asking “what’s the status?”, ask for a decision, owner, or next step — and use the context card as shared background. Type a message below (or click a suggestion) and watch the context card appear. Then hit Enter to send.",
    targetId: "composer",
    placement: "top",
    allowInteraction: true,
    waitForSend: true,
    suggestions: [
      "Hey Marcus — can you confirm who’s signing off rollback validation, and the expected date?",
      "Before cutover, what are the top 2 risks we should monitor (data consistency vs API latency), and who owns each?",
      "Can you sanity-check the cutover checklist (dual-write → backfill → shadow-read → cutover) and flag anything missing?",
    ],
  },
  {
    key: "context-card-explain",
    title: "The context card",
    body: "See how a Suggested Context card appeared as you typed? It automatically retrieved relevant project docs and summarized them. You can click “Attach” to include it with your message, or “Insert link” to drop a source URL into the draft.\n\nThe card is grounded in retrieved sources — not free-form AI guessing.",
    targetId: "context-card",
    placement: "right",
    allowInteraction: true,
  },
  {
    key: "try-dm",
    title: "Try it: DM someone about a code issue",
    body: "Now let’s try a DM. Click a suggestion below — it’ll switch to a DM with Marcus and fill in a message about React Native performance. When the Suggested Context card appears, click “Attach to message”, then send.",
    placement: "center",
    allowInteraction: true,
    waitForSend: true,
    requireAttachBeforeSend: true,
    suggestions: [
      "Hey Marcus, the RN transaction list is stuttering on Android — any ideas?",
      "What was the fix for the FlatList lazy init issue?",
    ],
  },
  {
    key: "sources",
    title: "Sources & auditability",
    body: "Because you attached the context, the message now includes an inline card with the exact sources used for the summary. Click any source link to open the full doc.\n\nThis means “code links” appear naturally whenever they’re relevant.",
    targetId: "attached-context-sources",
    placement: "right",
    allowInteraction: true,
  },
  {
    key: "lookup",
    title: "Incoming context lookup",
    body: "See a message you don’t have context on? Click “What’s this about?” on any message to get an instant recap with sources. Try it now!",
    targetId: "lookup-button",
    placement: "bottom",
    allowInteraction: true,
  },
  {
    key: "more-ideas",
    title: "More things to try",
    body: "You’ve seen the core flow! Here are more things to explore:",
    placement: "center",
    allowInteraction: true,
    suggestions: [
      "Hey Sarah, can you approve the PR for the API gateway rate limiting?",
      "What happened in the Feb 18 incident?",
      "Priya, what’s the latest on the onboarding redesign?",
    ],
  },
  {
    key: "free",
    title: "Free roam — you’re on your own!",
    body: "That’s it. Switch channels, open DMs, click wiki links, and try any message you like. The context engine works across all conversations.\n\nYou can reopen this tutorial anytime from the ✦ button in the sidebar.",
    placement: "center",
  },
];
