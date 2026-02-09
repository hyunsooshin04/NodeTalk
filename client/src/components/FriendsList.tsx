"use client";
import type { Friend } from "@/lib/friends";

interface FriendsListProps {
  friends: Friend[];
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

export default function FriendsList({
  friends,
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
}: FriendsListProps) {
  return (
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "white", display: "flex", flexDirection: "column" }}>
      {/* 친구 목록 헤더 */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #e1dfdd",
        backgroundColor: "white",
        flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#323130" }}>
          {showRequests ? "친구 신청" : "친구 목록"}
        </h2>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {showRequests ? (
        <div>
          {/* 받은 친구 신청 */}
          <div style={{ marginBottom: "2rem" }}>
            <h3>받은 친구 신청 ({friendRequests.length})</h3>
            {friendRequests.length === 0 ? (
              <p style={{ color: "#666" }}>받은 친구 신청이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {friendRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      padding: "0.75rem 1rem",
                      border: "1px solid #e1dfdd",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      backgroundColor: "white",
                      marginBottom: "0.5rem",
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
                        {request.from_displayName || request.from_handle || request.from_did}
                      </div>
                      {request.from_handle && (
                        <div style={{ 
                          fontSize: "0.8125rem", 
                          color: "#605e5c",
                          marginBottom: "0.125rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          @{request.from_handle}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: "0.75rem", 
                        color: "#8a8886",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {request.from_did.length > 30 ? `${request.from_did.substring(0, 30)}...` : request.from_did}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        onClick={() => onAcceptFriendRequest(request.id, request.from_did)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        수락
                      </button>
                      <button
                        onClick={() => onRejectFriendRequest(request.id)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          backgroundColor: "#d13438",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 보낸 친구 신청 */}
          <div>
            <h3>보낸 친구 신청 ({sentRequests.length})</h3>
            {sentRequests.length === 0 ? (
              <p style={{ color: "#666" }}>보낸 친구 신청이 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sentRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      padding: "0.75rem 1rem",
                      border: "1px solid #e1dfdd",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      backgroundColor: "white",
                      marginBottom: "0.5rem",
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
                        {request.to_displayName || request.to_handle || request.to_did}
                      </div>
                      {request.to_handle && (
                        <div style={{ 
                          fontSize: "0.8125rem", 
                          color: "#605e5c",
                          marginBottom: "0.125rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          @{request.to_handle}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: "0.75rem", 
                        color: "#8a8886",
                        marginBottom: "0.125rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {request.to_did.length > 30 ? `${request.to_did.substring(0, 30)}...` : request.to_did}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#8a8886", marginTop: "0.125rem" }}>
                        대기 중...
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <button
                        onClick={() => onCancelFriendRequest(request.id)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          backgroundColor: "#d13438",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 친구 신청 보내기 */}
          <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "4px" }}>
            <h3 style={{ marginTop: 0 }}>친구 신청 보내기</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={addFriendInput}
                onChange={(e) => onAddFriendInputChange(e.target.value)}
                placeholder="DID 또는 Handle 입력"
                onKeyPress={(e) => e.key === "Enter" && onSendFriendRequest()}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
              <button
                onClick={onSendFriendRequest}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                신청
              </button>
            </div>
          </div>

          {/* 친구 목록 */}
          <div>
            <h3>친구 ({friends.length})</h3>
            {friends.length === 0 ? (
              <p style={{ color: "#666" }}>친구가 없습니다. 위에서 친구를 추가하세요.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {friends.map((friend) => (
                  <div
                    key={friend.did}
                    style={{
                      padding: "0.75rem 1rem",
                      border: "1px solid #e1dfdd",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      backgroundColor: "white",
                      marginBottom: "0.5rem",
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
                          marginBottom: "0.125rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          @{friend.handle}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: "0.75rem", 
                        color: "#8a8886",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {friend.did.length > 30 ? `${friend.did.substring(0, 30)}...` : friend.did}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        onClick={() => onStartChat(friend.did)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          backgroundColor: "#464EB8",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        채팅
                      </button>
                      <button
                        onClick={() => onRemoveFriend(friend.did)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          backgroundColor: "#d13438",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
        )}
      </div>
    </div>
  );
}

