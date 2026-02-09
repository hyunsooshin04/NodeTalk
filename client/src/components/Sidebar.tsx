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
  showRequests: boolean;
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
  showRequests,
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
}: SidebarProps) {
  return (
    <div style={{ 
      width: "320px", 
      backgroundColor: "white",
      borderRight: "1px solid #e1dfdd",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* 탭 메뉴 */}
      <div style={{ 
        display: "flex", 
        borderBottom: "1px solid #e1dfdd",
        backgroundColor: "#faf9f8"
      }}>
        <button
          onClick={() => onViewChange("chat")}
          style={{
            flex: 1,
            padding: "0.875rem 1rem",
            backgroundColor: currentView === "chat" ? "white" : "transparent",
            color: currentView === "chat" ? "#464EB8" : "#605e5c",
            border: "none",
            borderBottom: currentView === "chat" ? "2px solid #464EB8" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: currentView === "chat" ? 600 : 400,
            transition: "all 0.2s"
          }}
        >
          채팅
        </button>
        <button
          onClick={() => onViewChange("friends")}
          style={{
            flex: 1,
            padding: "0.875rem 1rem",
            backgroundColor: currentView === "friends" ? "white" : "transparent",
            color: currentView === "friends" ? "#464EB8" : "#605e5c",
            border: "none",
            borderBottom: currentView === "friends" ? "2px solid #464EB8" : "2px solid transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: currentView === "friends" ? 600 : 400,
            position: "relative",
            transition: "all 0.2s"
          }}
        >
          친구
          {friendRequestsCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                backgroundColor: "#d13438",
                color: "white",
                borderRadius: "10px",
                minWidth: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: "bold",
                padding: "0 0.25rem",
              }}
            >
              {friendRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* 사이드바 컨텐츠 */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
            showRequests={showRequests}
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
          />
        )}
      </div>
    </div>
  );
}

