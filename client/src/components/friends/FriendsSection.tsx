"use client";
import type { Friend } from "@/lib/friends";
import FriendItem from "./FriendItem";

interface FriendsSectionProps {
  friends: Friend[];
  onSelectFriend: (friend: Friend) => void;
  onStartChat: (friendDid: string) => void;
  onRemoveFriend: (friendDid: string) => void;
}

export default function FriendsSection({
  friends,
  onSelectFriend,
  onStartChat,
  onRemoveFriend,
}: FriendsSectionProps) {
  return (
    <div>
      <h3 style={{ 
        fontSize: "0.875rem", 
        fontWeight: 600, 
        color: "rgba(255, 255, 255, 0.7)", 
        marginBottom: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
        친구 ({friends.length})
      </h3>
      {friends.length === 0 ? (
        <p style={{ color: "rgba(255, 255, 255, 0.5)", textAlign: "center", padding: "2rem" }}>
          친구가 없습니다. 위에서 친구를 추가하세요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {friends.map((friend) => (
            <FriendItem
              key={friend.did}
              friend={friend}
              onSelect={onSelectFriend}
              onStartChat={onStartChat}
              onRemoveFriend={onRemoveFriend}
            />
          ))}
        </div>
      )}
    </div>
  );
}

