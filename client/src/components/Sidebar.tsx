"use client";
import ChatList from "./ChatList";
import FriendsList from "./FriendsList";
import type { Friend } from "@/lib/friends";

interface SidebarProps {
  currentView: "chat" | "friends";
  onViewChange: (view: "chat" | "friends") => void;
  friendRequestsCount: number;
  // 채팅 관련 props
  rooms: any[];
  roomNames: Map<string, string>;
  unreadCounts: Map<string, number>;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  showCreateGroup: boolean;
  onShowCreateGroup: (show: boolean) => void;
  friends: Friend[];
  selectedFriendsForGroup: Set<string>;
  onToggleFriendForGroup: (friendDid: string) => void;
  onCreateGroup: () => void;
  onCancelCreateGroup: () => void;
  // 친구 관련 props
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
  onShowProfile: () => void;
  onSelectFriend: (friend: Friend) => void;
  onSelectRequest?: (request: any) => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  friendRequestsCount,
  rooms,
  roomNames,
  unreadCounts,
  selectedRoomId,
  onSelectRoom,
  showCreateGroup,
  onShowCreateGroup,
  friends,
  selectedFriendsForGroup,
  onToggleFriendForGroup,
  onCreateGroup,
  onCancelCreateGroup,
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
  onShowProfile,
  onSelectFriend,
  onSelectRequest,
}: SidebarProps) {
  return (
    <>
      {/* Vibe Sidebar (Navigation) */}
      <aside style={{
        width: "80px",
        background: "rgba(31, 16, 34, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem 0",
        gap: "2rem",
        flexShrink: 0,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* App Logo/Icon */}
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(to bottom right, #d125f4, #00f0ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)",
          cursor: "pointer",
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        >
          <span style={{ color: "white", fontSize: "1.5rem" }}>⚡</span>
        </div>

        {/* Nav Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", padding: "0 0.5rem" }}>
          <button
            onClick={() => onViewChange("chat")}
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto",
              borderRadius: "0.75rem",
              background: currentView === "chat" ? "rgba(209, 37, 244, 0.2)" : "transparent",
              color: currentView === "chat" ? "#d125f4" : "rgba(148, 163, 184, 1)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              transition: "all 0.3s",
              boxShadow: currentView === "chat" ? "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)" : "none"
            }}
            onMouseEnter={(e) => {
              if (currentView !== "chat") {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== "chat") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(148, 163, 184, 1)";
              }
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>💬</span>
            {currentView === "chat" && (
              <span style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: "12px",
                height: "12px",
                background: "#ccff00",
                borderRadius: "50%",
                border: "2px solid #1f1022"
              }}></span>
            )}
          </button>

          <button
            onClick={() => onViewChange("friends")}
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto",
              borderRadius: "0.75rem",
              background: currentView === "friends" ? "rgba(209, 37, 244, 0.2)" : "transparent",
              color: currentView === "friends" ? "#d125f4" : "rgba(148, 163, 184, 1)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              transition: "all 0.3s",
              boxShadow: currentView === "friends" ? "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)" : "none"
            }}
            onMouseEnter={(e) => {
              if (currentView !== "friends") {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== "friends") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(148, 163, 184, 1)";
              }
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>👥</span>
            {friendRequestsCount > 0 && (
              <span style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: "12px",
                height: "12px",
                background: "#ccff00",
                borderRadius: "50%",
                border: "2px solid #1f1022"
              }}></span>
            )}
          </button>
        </nav>

        {/* Bottom Section */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", padding: "0 0.5rem" }}>
          <button 
            onClick={onShowProfile}
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto",
              borderRadius: "0.75rem",
              background: "transparent",
              color: "rgba(148, 163, 184, 1)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(148, 163, 184, 1)";
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>⚙️</span>
          </button>
        </div>
      </aside>

      {/* Active Chats List / Friends List */}
      <section style={{
        width: "320px",
        background: "rgba(31, 16, 34, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "1rem",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {currentView === "chat" && (
          <ChatList
            rooms={rooms}
            roomNames={roomNames}
            unreadCounts={unreadCounts}
            selectedRoomId={selectedRoomId}
            onSelectRoom={onSelectRoom}
            showCreateGroup={showCreateGroup}
            onShowCreateGroup={onShowCreateGroup}
            friends={friends}
            selectedFriendsForGroup={selectedFriendsForGroup}
            onToggleFriendForGroup={onToggleFriendForGroup}
            onCreateGroup={onCreateGroup}
            onCancelCreateGroup={onCancelCreateGroup}
          />
        )}
        
        {currentView === "friends" && (
          <FriendsList
            friends={friends}
            friendRequests={friendRequests}
            sentRequests={sentRequests}
            addFriendInput={addFriendInput}
            onAddFriendInputChange={onAddFriendInputChange}
            onSendFriendRequest={onSendFriendRequest}
            onAcceptFriendRequest={onAcceptFriendRequest}
            onRejectFriendRequest={onRejectFriendRequest}
            onCancelFriendRequest={onCancelFriendRequest}
            onStartChat={onStartChat}
            onRemoveFriend={onRemoveFriend}
            onSelectFriend={onSelectFriend}
            onSelectRequest={onSelectRequest}
          />
        )}
      </section>
    </>
  );
}
