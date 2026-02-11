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
import FriendProfileView from "@/components/FriendProfileView";
import type { Friend } from "@/lib/friends";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useRooms } from "@/hooks/useRooms";
import { useFriends } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";

export default function Home() {
  const [roomKeyManager] = useState(() => new RoomKeyManager());
  const [currentView, setCurrentView] = useState<"chat" | "friends">("chat");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
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
                const content = (notification as any).messageContent;
                msg = {
                  uri: notification.recordUri,
                  senderDid: content.senderDid,
                  createdAt: content.createdAt,
                  roomId: notification.roomId,
                  ciphertext: content.ciphertext,
                  nonce: content.nonce,
                  ...(content.files && content.files.length > 0 && { files: content.files }),
                  // 하위 호환성
                  ...(content.fileUrl && {
                    fileUrl: content.fileUrl,
                    fileName: content.fileName,
                    mimeType: content.mimeType,
                  }),
                };
          } else {
                const msgRecord = await adapter.getMessage(notification.recordUri);
                if (msgRecord) {
                  const uriMatch = notification.recordUri.match(/at:\/\/([^/]+)\//);
                  const senderDid = uriMatch ? uriMatch[1] : "";
                  const record = msgRecord as any;
                  
                  msg = {
                    uri: notification.recordUri,
                    senderDid: senderDid,
                    createdAt: record.createdAt || new Date().toISOString(),
                    roomId: record.roomId,
                    ciphertext: String(record.ciphertext || ""),
                    nonce: String(record.nonce || ""),
                    ...(record.files && record.files.length > 0 && { files: record.files }),
                    // 하위 호환성
                    ...(record.fileUrl && {
                      fileUrl: record.fileUrl,
                      fileName: record.fileName,
                      mimeType: record.mimeType,
                    }),
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
          if (notification.roomId === roomIdRef.current && (notification as any).memberDid) {
            chatHook.removeMessagesBySender((notification as any).memberDid);
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
      } else if (notification.type === "profile_updated") {
        // 프로필 업데이트 알림을 받으면 친구 목록과 채팅방 목록을 다시 로드
        await friendsHook.loadFriends(adapter);
        
        // 프로필 정보가 포함된 경우 메시지 목록의 프로필 정보 업데이트
        const profileNotification = notification as any;
        if (profileNotification.updatedDid && profileNotification.profileData) {
          await chatHook.updateProfileInMessages(
            profileNotification.updatedDid,
            profileNotification.profileData,
            adapter
          );
        }
        
        // 채팅방 목록과 이름 다시 로드 (프로필 변경으로 인한 이름 변경 반영)
        await roomsHook.loadRooms(adapter);
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
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#1f1022",
              color: "white",
      fontFamily: "'Spline Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Ambient Background Gradients */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}>
        <div style={{
                  position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(circle, rgba(209, 37, 244, 0.2) 0%, transparent 70%)",
                  borderRadius: "50%",
          filter: "blur(120px)"
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(120px)"
        }}></div>
        <div style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: "30%",
          height: "30%",
          background: "radial-gradient(circle, rgba(204, 255, 0, 0.05) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(100px)"
        }}></div>
        </div>

      {/* Main Layout Container */}
      <div style={{ 
        position: "relative", 
        zIndex: 10, 
        flex: 1, 
        display: "flex", 
                  width: "100%",
        height: "100%", 
        padding: "1rem", 
        gap: "1rem",
        overflow: "hidden"
      }}>
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
                       onShowProfile={() => profileHook.setShowProfile(true)}
                       onSelectFriend={setSelectedFriend}
                       onSelectRequest={async (request) => {
                         // 서버에서 최신 프로필 정보 가져오기
                         try {
                           const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                           const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(request.from_did)}`);
                           
                           let displayName = request.from_displayName;
                           if (response.ok) {
                             const data = await response.json();
                             if (data.success && data.profile) {
                               displayName = data.profile.displayName || displayName;
                             }
                           }
                           
                           // 친구 신청을 Friend 타입으로 변환
                           const friendFromRequest: Friend = {
                             did: request.from_did,
                             handle: request.from_handle,
                             displayName: displayName,
                             addedAt: request.created_at || new Date().toISOString(),
                           };
                           setSelectedFriend(friendFromRequest);
                         } catch (error) {
                           console.error("Failed to load profile for friend request:", error);
                           // 프로필 로드 실패 시 기본 정보만 사용
                           const friendFromRequest: Friend = {
                             did: request.from_did,
                             handle: request.from_handle,
                             displayName: request.from_displayName,
                             addedAt: request.created_at || new Date().toISOString(),
                           };
                           setSelectedFriend(friendFromRequest);
                         }
                       }}
        />

        {/* Main Stage (Chat Window) */}
        <div style={{ 
          flex: 1, 
                            display: "flex",
          flexDirection: "column", 
          overflow: "hidden",
          background: "rgba(31, 16, 34, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "1rem",
          position: "relative"
        }}>
          {profileHook.showProfile && (
            <ProfileEditor
              profile={profileHook.profile}
              pdsDid={authHook.pds?.getDid() || null}
              profileDisplayName={profileHook.profileDisplayName}
              profileDescription={profileHook.profileDescription}
              profileAvatarUrl={profileHook.profileAvatarUrl}
              onDisplayNameChange={profileHook.setProfileDisplayName}
              onDescriptionChange={profileHook.setProfileDescription}
              onAvatarUrlChange={profileHook.setProfileAvatarUrl}
              onUpdateProfile={() => profileHook.handleUpdateProfile(authHook.pds)}
              onUploadAvatar={profileHook.uploadAvatar}
              onClose={() => profileHook.setShowProfile(false)}
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
              onUploadFile={chatHook.uploadFile}
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
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.875rem"
            }}>
              <p>채팅방을 선택하세요</p>
                              </div>
          )}

          {currentView === "friends" && (
            <FriendProfileView
              friend={selectedFriend}
              onStartChat={handleStartChat}
              onRemoveFriend={(friendDid) => {
                friendsHook.handleRemoveFriend(friendDid, authHook.pds || undefined);
                if (selectedFriend?.did === friendDid) {
                  setSelectedFriend(null);
                }
              }}
              onClose={() => setSelectedFriend(null)}
            />
          )}
          </div>
      </div>
    </div>
  );
}
