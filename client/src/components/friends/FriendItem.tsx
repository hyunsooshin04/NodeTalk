"use client";
import type { Friend } from "@/lib/friends";

interface FriendItemProps {
  friend: Friend;
  onSelect: (friend: Friend) => void;
  onStartChat: (friendDid: string) => void;
  onRemoveFriend: (friendDid: string) => void;
}

export default function FriendItem({
  friend,
  onSelect,
  onStartChat,
  onRemoveFriend,
}: FriendItemProps) {
  return (
    <div
      style={{
        padding: "0.75rem",
        borderRadius: "1rem",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        transition: "all 0.2s",
        cursor: "pointer"
      }}
      onClick={() => onSelect(friend)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: friend.avatarUrl
            ? `url(${friend.avatarUrl}) center/cover`
            : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "2px solid rgba(209, 37, 244, 0.5)"
        }}>
          {!friend.avatarUrl && (
            <span style={{ fontSize: "1.25rem" }}>👤</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: "0.875rem",
            color: "white",
            marginBottom: "0.25rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {friend.displayName || friend.handle || friend.did}
          </div>
          {friend.handle && (
            <div style={{ 
              fontSize: "0.75rem", 
              color: "rgba(255, 255, 255, 0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              @{friend.handle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onStartChat(friend.did)}
          style={{
            padding: "0.5rem 0.875rem",
            background: "linear-gradient(to right, #d125f4, #00f0ff)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            transition: "all 0.2s",
            boxShadow: "0 0 10px rgba(209, 37, 244, 0.5)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          채팅
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFriend(friend.did);
          }}
          style={{
            padding: "0.5rem 0.875rem",
            background: "rgba(255, 255, 255, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

