export type Placement = "auto" | "top" | "right" | "bottom" | "left" | "center";

export type TutorialStep = {
  key: string;
  title: string;
  body: string;
  targetId?: string;
  placement?: Placement;
  suggestions?: string[];
  waitForSend?: boolean;
  /** If true, a wait-for-send step will only advance after the user attaches context. */
  requireAttachBeforeSend?: boolean;
  allowInteraction?: boolean;
};
