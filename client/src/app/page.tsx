"use client";

import { useState, useEffect, useRef } from "react";
import { RoomKeyManager } from "@/lib/room";
import { generateGroupRoomId } from "@/lib/rooms";
import type { PushNotification } from "@nodetalk/shared";
import LoginForm from "@/components/LoginForm";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChatList from "@/components/ChatList";
import ChatRoom from "@/components/ChatRoom";
import FriendsList from "@/components/FriendsList";
import ProfileEditor from "@/components/ProfileEditor";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useRooms } from "@/hooks/useRooms";
import { useFriends } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";

export default function Home() {
  const [roomKeyManager] = useState(() => new RoomKeyManager());
  const [currentView, setCurrentView] = useState<"chat" | "friends">("chat");
  const roomIdRef = useRef<string>("");

  // 커스텀 훅들
  const profileHook = useProfile();
  const roomsHook = useRooms();
  const friendsHook = useFriends(null);

  // 인증 훅
  const authHook = useAuth({
    onLoginSuccess: async (adapter, gateway) => {
      // 프로필 로드
      await profileHook.loadProfile(adapter);
      
      // 친구 목록 로드
      await friendsHook.loadFriends(adapter);
      await friendsHook.loadFriendRequests(adapter);
      
      // 채팅방 목록 로드
      await roomsHook.loadRooms(adapter);
    },
    onMessage: async (notification: PushNotification, adapter) => {
      console.log("New notification received:", notification);
      
      if (notification.type === "new_message") {
        const currentRoomId = roomIdRef.current;
        
        if (notification.roomId === currentRoomId && notification.recordUri) {
          if (roomIdRef.current === notification.roomId && notification.recordUri) {
            try {
              let msg;
              
              if ((notification as any).messageContent) {
                msg = {
                  uri: notification.recordUri,
                  senderDid: (notification as any).messageContent.senderDid,
                  createdAt: (notification as any).messageContent.createdAt,
                  roomId: notification.roomId,
                  ciphertext: (notification as any).messageContent.ciphertext,
                  nonce: (notification as any).messageContent.nonce,
                };
          } else {
                const msgRecord = await adapter.getMessage(notification.recordUri);
                if (msgRecord) {
                  const uriMatch = notification.recordUri.match(/at:\/\/([^/]+)\//);
                  const senderDid = uriMatch ? uriMatch[1] : "";
                  
                  msg = {
                    uri: notification.recordUri,
                    senderDid: senderDid,
                    createdAt: msgRecord.createdAt || new Date().toISOString(),
                    roomId: msgRecord.roomId,
                    ciphertext: String(msgRecord.ciphertext || ""),
                    nonce: String(msgRecord.nonce || ""),
                  };
                }
              }
              
              if (msg) {
                await chatHook.addMessageToState(msg, notification.roomId, adapter);
              }
    } catch (error) {
              console.error("Failed to process new message:", error);
              if (roomIdRef.current === notification.roomId) {
                await chatHook.loadMessages();
              }
            }
            await roomsHook.loadRooms(adapter);
          }
          } else {
          await roomsHook.loadRooms(adapter);
          }
        } else if (notification.type === "member_left") {
          // 채팅방에서 나간 멤버의 메시지 제거
          if (notification.roomId === roomIdRef.current && notification.memberDid) {
            chatHook.removeMessagesBySender(notification.memberDid);
          }
          // 채팅방 목록 업데이트
          await roomsHook.loadRooms(adapter);
        } else if (notification.type === "member_joined") {
          // 채팅방 목록 업데이트
          await roomsHook.loadRooms(adapter);
        } else if (notification.type === "friend_request") {
        await friendsHook.loadFriendRequests(adapter);
          setCurrentView("friends");
        friendsHook.setShowRequests(true);
        } else if (notification.type === "friend_accepted") {
        await friendsHook.loadFriends(adapter);
        await friendsHook.loadFriendRequests(adapter);
        } else if (notification.type === "friend_removed") {
        await friendsHook.loadFriends(adapter);
      }
    },
  });

  // 마지막 읽은 메시지 업데이트 함수
  const updateLastReadMessage = async (targetRoomId: string) => {
    if (!authHook.pds || !targetRoomId) return;
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = authHook.pds.getDid();
      
      await fetch(`${API_URL}/api/rooms/${encodeURIComponent(targetRoomId)}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid }),
      });
      
      roomsHook.setUnreadCounts((prev) => {
        const updated = new Map(prev);
        updated.set(targetRoomId, 0);
        return updated;
      });
      
      await roomsHook.loadRooms(authHook.pds);
    } catch (error) {
      console.error("Failed to update last read message:", error);
    }
  };

  // 채팅 훅 (pds가 필요하므로 authHook 이후에 초기화)
  const chatHook = useChat({
    pds: authHook.pds,
    roomKeyManager,
    roomId: roomsHook.roomId,
    roomIdRef,
    profile: profileHook.profile,
    rooms: roomsHook.rooms,
    roomNames: roomsHook.roomNames,
    unreadCounts: roomsHook.unreadCounts,
    setUnreadCounts: roomsHook.setUnreadCounts,
    loadRooms: roomsHook.loadRooms,
    updateLastReadMessage,
  });

  // roomKeyManager 초기화
  useEffect(() => {
    roomKeyManager.loadAllKeys();
  }, [roomKeyManager]);

  // 로딩 중
  if (authHook.isLoading) {
    return (
      <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto", textAlign: "center" }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  // 로그인 안 됨
  if (!authHook.loggedIn) {
    return (
      <LoginForm
        identifier={authHook.identifier}
        password={authHook.password}
        onIdentifierChange={authHook.setIdentifier}
        onPasswordChange={authHook.setPassword}
        onLogin={authHook.handleLogin}
      />
    );
  }

  // 채팅방 선택 핸들러
  const handleSelectRoom = async (selectedRoomId: string) => {
    await roomsHook.handleSelectRoom(selectedRoomId, authHook.pds);
    setCurrentView("chat");
  };

  // 채팅 시작 핸들러
  const handleStartChat = async (friendDid: string) => {
    await roomsHook.handleStartChat(friendDid, authHook.pds);
    setCurrentView("chat");
  };

  // 그룹 채팅 생성 핸들러
  const handleCreateGroup = async () => {
    if (!authHook.pds || roomsHook.selectedFriendsForGroup.size === 0) {
      alert("최소 1명의 친구를 선택해주세요.");
      return;
    }

    try {
      const newRoomId = generateGroupRoomId();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = authHook.pds.getDid();
      const pdsEndpoint = "https://bsky.social";
      
      await fetch(`${API_URL}/api/rooms/${encodeURIComponent(newRoomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid, pdsEndpoint }),
      });
      
      for (const friendDid of roomsHook.selectedFriendsForGroup) {
        try {
          await fetch(`${API_URL}/api/rooms/${encodeURIComponent(newRoomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ did: friendDid, pdsEndpoint: "https://bsky.social" }),
          });
    } catch (error) {
          console.warn(`Failed to add ${friendDid} to group:`, error);
        }
      }
      
      roomsHook.setShowCreateGroup(false);
      roomsHook.setSelectedFriendsForGroup(new Set());
      await handleSelectRoom(newRoomId);
      await roomsHook.loadRooms(authHook.pds);
    } catch (error) {
      console.error("Failed to create group chat:", error);
      alert("그룹 채팅방 생성 실패: " + (error as Error).message);
    }
  };

    return (
    <div style={{ 
      height: "100vh", 
                  display: "flex",
      flexDirection: "column",
      backgroundColor: "#f3f2f1",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }}>
      <Header
        profile={profileHook.profile}
        pdsDid={authHook.pds?.getDid() || null}
        onShowProfile={() => profileHook.setShowProfile(!profileHook.showProfile)}
        onLogout={authHook.handleLogout}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          friendRequestsCount={friendsHook.friendRequests.length}
          rooms={roomsHook.rooms}
          roomNames={roomsHook.roomNames}
          unreadCounts={roomsHook.unreadCounts}
          selectedRoomId={roomsHook.roomId}
          onSelectRoom={handleSelectRoom}
          showCreateGroup={roomsHook.showCreateGroup}
          onShowCreateGroup={roomsHook.setShowCreateGroup}
          friends={friendsHook.friends}
          selectedFriendsForGroup={roomsHook.selectedFriendsForGroup}
          onToggleFriendForGroup={(friendDid) => {
            const newSet = new Set(roomsHook.selectedFriendsForGroup);
            if (newSet.has(friendDid)) {
              newSet.delete(friendDid);
            } else {
              newSet.add(friendDid);
            }
            roomsHook.setSelectedFriendsForGroup(newSet);
          }}
          onCreateGroup={handleCreateGroup}
          onCancelCreateGroup={() => {
            roomsHook.setShowCreateGroup(false);
            roomsHook.setSelectedFriendsForGroup(new Set());
          }}
          showRequests={friendsHook.showRequests}
          friendRequests={friendsHook.friendRequests}
          sentRequests={friendsHook.sentRequests}
          addFriendInput={friendsHook.addFriendInput}
          onAddFriendInputChange={friendsHook.setAddFriendInput}
          onSendFriendRequest={() => friendsHook.handleSendFriendRequest(authHook.pds || undefined)}
          onAcceptFriendRequest={(requestId, fromDid) => friendsHook.handleAcceptFriendRequest(requestId, fromDid, authHook.pds || undefined)}
          onRejectFriendRequest={(requestId) => friendsHook.handleRejectFriendRequest(requestId, authHook.pds || undefined)}
          onCancelFriendRequest={(requestId) => friendsHook.handleCancelFriendRequest(requestId, authHook.pds || undefined)}
                       onStartChat={handleStartChat}
                       onRemoveFriend={(friendDid) => friendsHook.handleRemoveFriend(friendDid, authHook.pds || undefined)}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "white" }}>
          {profileHook.showProfile && (
            <ProfileEditor
              profile={profileHook.profile}
              pdsDid={authHook.pds?.getDid() || null}
              profileDisplayName={profileHook.profileDisplayName}
              profileDescription={profileHook.profileDescription}
              onDisplayNameChange={profileHook.setProfileDisplayName}
              onDescriptionChange={profileHook.setProfileDescription}
              onUpdateProfile={() => profileHook.handleUpdateProfile(authHook.pds)}
            />
          )}

          {currentView === "chat" && roomsHook.roomId && (
            <ChatRoom
              roomId={roomsHook.roomId}
              roomName={roomsHook.roomNames.get(roomsHook.roomId) || roomsHook.roomId}
              memberCount={roomsHook.rooms.find(r => r.room_id === roomsHook.roomId)?.member_count || 0}
              messages={chatHook.messages}
              isLoadingMessages={chatHook.isLoadingMessages}
              message={chatHook.message}
              onMessageChange={chatHook.setMessage}
              onSendMessage={chatHook.handleSendMessage}
              onDeleteMessage={chatHook.handleDeleteMessage}
              onLeaveRoom={() => roomsHook.handleLeaveRoom(authHook.pds, roomsHook.roomId, authHook.gateway)}
              onInviteToRoom={async (friendDid) => {
                if (!authHook.pds) return;
                await roomsHook.handleInviteToRoom(roomsHook.roomId, friendDid, authHook.pds);
              }}
              friends={friendsHook.friends}
              myDid={authHook.pds?.getDid() || null}
            />
          )}

          {currentView === "chat" && !roomsHook.roomId && (
                            <div style={{ 
              flex: 1, 
                              display: "flex", 
                              alignItems: "center", 
              justifyContent: "center",
              color: "#605e5c",
              fontSize: "0.875rem"
            }}>
              <p>채팅방을 선택하세요</p>
                              </div>
                              )}
                            </div>
      </div>
    </div>
  );
}
