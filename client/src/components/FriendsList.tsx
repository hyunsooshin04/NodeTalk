"use client";
import type { Friend } from "@/lib/friends";
import FriendsHeader from "./friends/FriendsHeader";
import AddFriendForm from "./friends/AddFriendForm";
import ReceivedRequestsSection from "./friends/ReceivedRequestsSection";
import SentRequestsSection from "./friends/SentRequestsSection";
import FriendsSection from "./friends/FriendsSection";

interface FriendsListProps {
  friends: Friend[];
  friendRequests: any[];
  sentRequests: any[];
  addFriendInput: string;
  onAddFriendInputChange: (value: string) => void;
  onSendFriendRequest: () => void;
  onAcceptFriendRequest: (requestId: number, fromDid: string) => void;
  onRejectFriendRequest: (requestId: number) => void;
  onCancelFriendRequest: (requestId: number) => void;
  onStartChat: (friendDid: string) => void;
  onRemoveFriend: (friendDid: string) => void;
  onSelectFriend: (friend: Friend) => void;
  onSelectRequest?: (request: any) => void;
}

export default function FriendsList({
  friends,
  friendRequests,
  sentRequests,
  addFriendInput,
  onAddFriendInputChange,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onCancelFriendRequest,
  onStartChat,
  onRemoveFriend,
  onSelectFriend,
  onSelectRequest,
}: FriendsListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <FriendsHeader />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem 1rem 1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <AddFriendForm
            addFriendInput={addFriendInput}
            onAddFriendInputChange={onAddFriendInputChange}
            onSendFriendRequest={onSendFriendRequest}
          />

          <ReceivedRequestsSection
            friendRequests={friendRequests}
            onAcceptFriendRequest={onAcceptFriendRequest}
            onRejectFriendRequest={onRejectFriendRequest}
            onSelectRequest={onSelectRequest}
          />

          <SentRequestsSection
            sentRequests={sentRequests}
            onCancelFriendRequest={onCancelFriendRequest}
          />

          <FriendsSection
            friends={friends}
            onSelectFriend={onSelectFriend}
            onStartChat={onStartChat}
            onRemoveFriend={onRemoveFriend}
          />
        </div>
      </div>
    </div>
  );
}
