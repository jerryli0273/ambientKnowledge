import type { User } from "./types";

/** Mock users for the app. */
export const USERS: Record<string, User> = {
  "user-sarah": {
    id: "user-sarah",
    name: "Sarah Chen",
    role: "Backend Engineer",
    initials: "SC",
    color: "#4A90D9",
  },
  "user-marcus": {
    id: "user-marcus",
    name: "Marcus Rivera",
    role: "Mobile Engineer",
    initials: "MR",
    color: "#D94A7A",
  },
  "user-priya": {
    id: "user-priya",
    name: "Priya Nair",
    role: "Product Manager",
    initials: "PN",
    color: "#3BA55D",
  },
  "user-diego": {
    id: "user-diego",
    name: "Diego Alvarez",
    role: "SRE / On-call Lead",
    initials: "DA",
    color: "#8B5CF6",
  },
  "user-mei": {
    id: "user-mei",
    name: "Mei Tan",
    role: "Data Engineer",
    initials: "MT",
    color: "#F59E0B",
  },
  "user-alex": {
    id: "user-alex",
    name: "Alex Kim",
    role: "Product Designer",
    initials: "AK",
    color: "#06B6D4",
  },
  "user-rina": {
    id: "user-rina",
    name: "Rina Patel",
    role: "Release Manager",
    initials: "RP",
    color: "#EF4444",
  },
  "user-jordan": {
    id: "user-jordan",
    name: "Jordan Blake",
    role: "Legal & Compliance",
    initials: "JB",
    color: "#10B981",
  },
  "user-sam": {
    id: "user-sam",
    name: "Sam Brooks",
    role: "Solutions Engineer",
    initials: "SB",
    color: "#64748B",
  },
  "user-nina": {
    id: "user-nina",
    name: "Nina Shah",
    role: "QA / Release Quality",
    initials: "NS",
    color: "#F97316",
  },
  "user-owen": {
    id: "user-owen",
    name: "Owen Park",
    role: "Engineering Manager",
    initials: "OP",
    color: "#0EA5E9",
  },
  "user-leila": {
    id: "user-leila",
    name: "Leila Hassan",
    role: "Security Engineer",
    initials: "LH",
    color: "#A855F7",
  },
};

/** The "logged-in" user — hardcoded for the MVP. */
export const CURRENT_USER_ID = "user-sarah";

/** Get the other user (for default recipient). */
export function getOtherUsers(currentId: string): User[] {
  return Object.values(USERS).filter((u) => u.id !== currentId);
}
