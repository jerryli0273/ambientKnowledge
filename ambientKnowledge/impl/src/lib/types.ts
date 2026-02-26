// ──────────────────────────────────────────────
// Shared types for Ambient Knowledge
// ──────────────────────────────────────────────

/** A single item in the knowledge base. */
export interface KnowledgeItem {
  id: string;
  type: "project" | "user" | "note";
  title: string;
  tags: string[];
  summary: string;
  body: string;
  links?: string[];
  url?: string;

  /**
   * Glean-like metadata (optional in the demo seed).
   *
   * In a production system these would come from connectors (Slack/Jira/etc)
   * and drive permission filtering, freshness boosts, and ranking.
   */
  sourceSystem?:
    | "slack"
    | "confluence"
    | "jira"
    | "github"
    | "google-drive"
    | "internal-wiki";
  container?: string;
  updatedAtMs?: number;
  acl?: {
    /** List of principals (e.g. user IDs) allowed to see this document. */
    principals: string[];
  };
  entities?: string[];
}

/** A retrieved item with its relevance score. */
export interface ScoredItem {
  item: KnowledgeItem;
  score: number;
  /** Optional retrieval explanation (e.g. top-matching chunks). */
  why?: {
    topChunkIds: string[];
    topChunkScores: number[];
  };
}

/** Confidence level for a context suggestion. */
export type Confidence = "low" | "med" | "high";
export type ContextMode = "compose" | "incoming_lookup";
export type ServingTier = "cache" | "retrieval" | "synthesis";

// ── API types ────────────────────────────────

export interface ContextRequest {
  draftText: string;
  recipientId: string;
  channelId?: string;
  mode?: ContextMode;
}

export interface ContextSource {
  id: string;
  title: string;
  type: string;
  url?: string;
}

export interface ContextResponse {
  topic?: string;
  summary?: string;
  openQuestions?: string[];
  sources?: ContextSource[];
  confidence?: Confidence;
  servingTier?: ServingTier;
  freshnessMs?: number;
  debug?: {
    retrieved: {
      id: string;
      title?: string;
      score: number;
      why?: {
        topChunkIds: string[];
        topChunkScores: number[];
      };
    }[];
    overloaded?: boolean;
    rateLimited?: boolean;
  };
}

// ── App-level types ──────────────────────────

export interface User {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // background color for avatar
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  attachedContext?: AttachedContext;
}

export interface AttachedContext {
  topic: string;
  summary: string;
  openQuestions?: string[];
  sources: ContextSource[];
}
