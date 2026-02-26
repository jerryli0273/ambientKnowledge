"use client";

import type { User } from "@/lib/types";

interface AvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const sizeMap = {
  sm: { container: "w-6 h-6", text: "text-[10px]" },
  md: { container: "w-9 h-9", text: "text-xs" },
  lg: { container: "w-12 h-12", text: "text-sm" },
};

export default function Avatar({ user, size = "md", showStatus = false }: AvatarProps) {
  const s = sizeMap[size];

  return (
    <div className="relative shrink-0">
      <div
        className={`${s.container} rounded-lg flex items-center justify-center font-bold text-white select-none`}
        style={{ backgroundColor: user.color }}
        title={user.name}
      >
        <span className={s.text}>{user.initials}</span>
      </div>
      {showStatus && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: "var(--success)" }}
        />
      )}
    </div>
  );
}
