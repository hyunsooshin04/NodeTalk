"use client";
import { useRef, useEffect, useState } from "react";
import type { Friend } from "@/lib/friends";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  memberCount: number;
  messages: any[];
  isLoadingMessages: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onDeleteMessage: (uri: string) => void;
  onLeaveRoom: () => void;
  onInviteToRoom: (friendDid: string) => Promise<void>;
  friends: Friend[];
  myDid: string | null;
}

export default function ChatRoom({
  roomId,
  roomName,
  memberCount,
  messages,
  isLoadingMessages,
  message,
  onMessageChange,
  onSendMessage,
  onDeleteMessage,
  onLeaveRoom,
  onInviteToRoom,
  friends,
  myDid,
}: ChatRoomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInvite = async (friendDid: string) => {
    setInvitingFriend(friendDid);
    try {
      await onInviteToRoom(friendDid);
      alert("친구를 초대했습니다.");
      setShowInviteModal(false);
    } catch (error) {
      alert("초대 실패: " + (error as Error).message);
    } finally {
      setInvitingFriend(null);
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "white",
      overflow: "hidden"
    }}>
      {/* 채팅 헤더 */}
      <div style={{
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #e1dfdd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#faf9f8"
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#323130" }}>
            {roomName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#605e5c", marginTop: "0.125rem" }}>
            {memberCount}명
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              padding: "0.375rem 0.75rem",
              backgroundColor: "#464EB8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            초대
          </button>
          <button
            onClick={onLeaveRoom}
            style={{
              padding: "0.375rem 0.75rem",
              backgroundColor: "transparent",
              color: "#d13438",
              border: "1px solid #d13438",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            나가기
          </button>
        </div>
      </div>

      {/* 초대 모달 */}
      {showInviteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#323130" }}>
                친구 초대
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#605e5c",
                  padding: 0,
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}>
              {friends.length === 0 ? (
                <p style={{ color: "#605e5c", textAlign: "center", padding: "2rem" }}>
                  초대할 친구가 없습니다.
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.did}
                    style={{
                      padding: "0.75rem 1rem",
                      border: "1px solid #e1dfdd",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "white",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "#323130",
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {friend.displayName || friend.handle || friend.did}
                      </div>
                      {friend.handle && (
                        <div style={{
                          fontSize: "0.8125rem",
                          color: "#605e5c",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          @{friend.handle}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleInvite(friend.did)}
                      disabled={invitingFriend === friend.did}
                      style={{
                        padding: "0.5rem 0.875rem",
                        backgroundColor: invitingFriend === friend.did ? "#c8c6c4" : "#464EB8",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: invitingFriend === friend.did ? "not-allowed" : "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {invitingFriend === friend.did ? "초대 중..." : "초대"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#faf9f8",
        }}
      >
        {isLoadingMessages ? (
          <p style={{ color: "#666", margin: "auto" }}>메시지 내용 불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: "#666", margin: "auto" }}>메시지가 없습니다.</p>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMyMessage = msg.senderDid === myDid;
              return (
                <div
                  key={msg.uri || idx}
                  style={{
                    padding: "0.5rem 0.75rem",
                    marginBottom: "0.5rem",
                    borderRadius: "4px",
                    maxWidth: "70%",
                    alignSelf: isMyMessage ? "flex-end" : "flex-start",
                    backgroundColor: isMyMessage ? "#464EB8" : "white",
                    color: isMyMessage ? "white" : "#323130",
                    marginLeft: isMyMessage ? "auto" : "0",
                    marginRight: isMyMessage ? "0" : "auto",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  {!isMyMessage && (
                    <div style={{ 
                      fontSize: "0.75rem", 
                      fontWeight: 600, 
                      marginBottom: "0.25rem", 
                      opacity: 0.9,
                      color: "#605e5c"
                    }}>
                      {msg.profile?.displayName || msg.profile?.handle || msg.senderDid || "Unknown"}
                    </div>
                  )}
                  <div style={{ 
                    fontSize: "0.875rem",
                    wordBreak: "break-word",
                    color: isMyMessage ? "white" : (msg.decrypted ? "#323130" : "#d13438"),
                    fontStyle: msg.decrypted ? "normal" : "italic",
                    lineHeight: "1.4"
                  }}>
                    {msg.plaintext}
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginTop: "0.375rem",
                    fontSize: "0.6875rem",
                    opacity: 0.7
                  }}>
                    <div>
                      {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { 
                        hour: "2-digit", 
                        minute: "2-digit",
                        timeZone: "Asia/Seoul"
                      })}
                    </div>
                    {isMyMessage && msg.uri && (
                      <button
                        onClick={() => onDeleteMessage(msg.uri)}
                        style={{
                          padding: "0.125rem 0.375rem",
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "0.6875rem",
                          marginLeft: "0.5rem",
                        }}
                        title="메시지 삭제"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 메시지 입력 영역 */}
      <div style={{ 
        padding: "0.75rem 1rem",
        borderTop: "1px solid #e1dfdd",
        backgroundColor: "white",
        display: "flex",
        gap: "0.5rem",
        alignItems: "center"
      }}>
        <input
          type="text"
          placeholder="메시지를 입력하세요..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
          style={{
            flex: 1,
            padding: "0.625rem 0.75rem",
            border: "1px solid #e1dfdd",
            borderRadius: "4px",
            fontSize: "0.875rem",
            outline: "none",
          }}
          onFocus={(e) => e.target.style.borderColor = "#464EB8"}
          onBlur={(e) => e.target.style.borderColor = "#e1dfdd"}
        />
        <button
          onClick={onSendMessage}
          disabled={!message.trim()}
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: message.trim() ? "#464EB8" : "#c8c6c4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: message.trim() ? "pointer" : "not-allowed",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}

