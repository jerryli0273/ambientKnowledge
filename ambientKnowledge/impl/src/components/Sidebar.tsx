"use client";

import { USERS, CURRENT_USER_ID } from "@/lib/users";
import { CHANNELS } from "@/lib/channels";
import Avatar from "./Avatar";

interface SidebarProps {
  activeChannelId: string;
  activeDmRecipientId: string | null;
  onSelectChannel: (id: string) => void;
  recipientId: string;
  onSelectRecipient: (id: string) => void;
  onOpenTutorial?: () => void;
}

export default function Sidebar({
  activeChannelId,
  activeDmRecipientId,
  onSelectChannel,
  recipientId,
  onSelectRecipient,
  onOpenTutorial,
}: SidebarProps) {
  const currentUser = USERS[CURRENT_USER_ID];
  const otherUsers = Object.values(USERS).filter((u) => u.id !== CURRENT_USER_ID);

  return (
    <aside
      className="flex flex-col w-[260px] shrink-0 h-screen"
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}
    >
      {/* Workspace header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          A
        </div>
        <div>
          <h1
            className="text-[15px] font-bold leading-tight"
            style={{ color: "var(--sidebar-text-bright)" }}
          >
            Ambient Knowledge
          </h1>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-4 mb-1 mt-1">
          <button className="flex items-center gap-1 text-[13px] font-medium tracking-wide hover:opacity-80 transition-opacity">
            <svg width="10" height="10" viewBox="0 0 10 10" className="mt-0.5">
              <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Channels
          </button>
        </div>

        {CHANNELS.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel.id)}
            className="flex items-center gap-2 w-full px-4 py-1.5 text-left transition-colors"
            style={{
              background: activeChannelId === channel.id ? "var(--sidebar-active)" : "transparent",
              color: activeChannelId === channel.id ? "var(--sidebar-text-bright)" : "var(--sidebar-text)",
            }}
            onMouseEnter={(e) => {
              if (activeChannelId !== channel.id) {
                e.currentTarget.style.background = "var(--sidebar-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeChannelId !== channel.id) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span className="text-[15px] font-bold opacity-70">#</span>
            <div className="min-w-0">
              <p className="text-[14px] truncate">{channel.name}</p>
            </div>
          </button>
        ))}

        {/* Section: Direct Messages */}
        <div className="px-4 mb-1 mt-3">
          <button className="flex items-center gap-1 text-[13px] font-medium tracking-wide hover:opacity-80 transition-opacity">
            <svg width="10" height="10" viewBox="0 0 10 10" className="mt-0.5">
              <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Direct Messages
          </button>
        </div>

        {otherUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectRecipient(user.id)}
            className="flex items-center gap-2.5 w-full px-4 py-1.5 text-left transition-colors"
            style={{
              background: activeDmRecipientId === user.id ? "var(--sidebar-active)" : "transparent",
              color: activeDmRecipientId === user.id ? "var(--sidebar-text-bright)" : "var(--sidebar-text)",
            }}
            onMouseEnter={(e) => {
              if (activeDmRecipientId !== user.id) {
                e.currentTarget.style.background = "var(--sidebar-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeDmRecipientId !== user.id) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Avatar user={user} size="sm" showStatus />
            <span className="text-[15px] truncate">{user.name}</span>
          </button>
        ))}
        {/* Tutorial button */}
        {onOpenTutorial && (
          <div className="px-4 mt-4 mb-2">
            <button
              onClick={onOpenTutorial}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[13px] font-medium transition-all"
              style={{
                background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                color: "var(--sidebar-text-bright)",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 25%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 15%, transparent)";
              }}
            >
              <span className="text-[15px]">✦</span>
              <span>Guided Demo</span>
            </button>
          </div>
        )}
      </nav>

      {/* Current user footer */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <Avatar user={currentUser} size="sm" showStatus />
        <div className="min-w-0">
          <p
            className="text-[13px] font-bold truncate"
            style={{ color: "var(--sidebar-text-bright)" }}
          >
            {currentUser.name}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--sidebar-text)" }}>
            {currentUser.role}
          </p>
        </div>
      </div>
    </aside>
  );
}
