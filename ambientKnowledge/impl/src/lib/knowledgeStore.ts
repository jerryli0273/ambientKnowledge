import knowledgeBase from "@/data/mockDatabase.json";
import type { KnowledgeItem } from "./types";

// This module intentionally abstracts the backing store. In the demo it is a
// JSON seed, but in production this would be backed by indexed documents
// (search + vector) with permission filtering.

const items = knowledgeBase as KnowledgeItem[];
const itemsById = new Map(items.map((item) => [item.id, item] as const));

export function listKnowledgeItems(): KnowledgeItem[] {
  return items;
}

export function getKnowledgeItemById(id: string): KnowledgeItem | undefined {
  return itemsById.get(id);
}
