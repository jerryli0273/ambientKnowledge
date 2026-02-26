export const TUTORIAL_EVENTS = {
  open: "tutorial:open",
  messageSent: "tutorial:messageSent",
  contextAttached: "tutorial:contextAttached",
} as const;

export type TutorialEventName = (typeof TUTORIAL_EVENTS)[keyof typeof TUTORIAL_EVENTS];

function emit(name: TutorialEventName): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

export function emitTutorialOpen(): void {
  emit(TUTORIAL_EVENTS.open);
}

export function emitTutorialMessageSent(): void {
  emit(TUTORIAL_EVENTS.messageSent);
}

export function emitTutorialContextAttached(): void {
  emit(TUTORIAL_EVENTS.contextAttached);
}
