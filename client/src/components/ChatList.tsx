"use client";

interface ChatListProps {
  rooms: any[];
  roomNames: Map<string, string>;
  unreadCounts: Map<string, number>;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  showCreateGroup: boolean;
  onShowCreateGroup: (show: boolean) => void;
  friends: any[];
  selectedFriendsForGroup: Set<string>;
  onToggleFriendForGroup: (friendDid: string) => void;
  onCreateGroup: () => void;
  onCancelCreateGroup: () => void;
}

export default function ChatList({
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
}: ChatListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 채팅방 목록 헤더 */}
      <div style={{ 
        padding: "0.75rem 1rem", 
        borderBottom: "1px solid #e1dfdd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "white",
        flexShrink: 0
      }}>
        <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#323130" }}>채팅방</h3>
        <button
          onClick={() => onShowCreateGroup(true)}
          style={{
            padding: "0.375rem 0.75rem",
            backgroundColor: "#464EB8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
          }}
        >
          + 새 그룹
        </button>
      </div>
      
      {/* 채팅방 목록 */}
      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "white" }}>
        {showCreateGroup && (
          <div style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f9f9f9" }}>
            <h4 style={{ marginTop: 0 }}>그룹 채팅방 만들기</h4>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
              그룹 채팅에 추가할 친구를 선택하세요 (최소 1명)
            </p>
            {friends.length === 0 ? (
              <p style={{ color: "#666" }}>친구가 없습니다. 먼저 친구를 추가하세요.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", maxHeight: "200px", overflowY: "auto" }}>
                {friends.map((friend) => (
                  <label
                    key={friend.did}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriendsForGroup.has(friend.did)}
                      onChange={() => onToggleFriendForGroup(friend.did)}
                    />
                    <span>
                      {friend.displayName || friend.handle || friend.did}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={onCreateGroup}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                만들기 ({selectedFriendsForGroup.size}명)
              </button>
              <button
                onClick={onCancelCreateGroup}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
        
        {rooms.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#605e5c" }}>
            <p style={{ margin: 0 }}>채팅방이 없습니다.</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>친구 목록에서 친구를 선택하여 채팅을 시작하세요.</p>
          </div>
        ) : (
          <>
            {rooms.map((room) => (
              <div
                key={room.room_id}
                onClick={() => onSelectRoom(room.room_id)}
                style={{
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  backgroundColor: selectedRoomId === room.room_id ? "#edebe9" : "transparent",
                  borderLeft: selectedRoomId === room.room_id ? "3px solid #464EB8" : "3px solid transparent",
                  transition: "background-color 0.15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (selectedRoomId !== room.room_id) {
                    e.currentTarget.style.backgroundColor = "#f3f2f1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRoomId !== room.room_id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
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
                      {roomNames.get(room.room_id) || room.room_id}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#605e5c", marginBottom: "0.125rem" }}>
                      {room.member_count}명
                    </div>
                    {room.last_message_at && (
                      <div style={{ fontSize: "0.75rem", color: "#8a8886", marginTop: "0.125rem" }}>
                        {new Date(room.last_message_at).toLocaleString("ko-KR", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Seoul"
                        })}
                      </div>
                    )}
                  </div>
                  {unreadCounts.get(room.room_id) > 0 && (
                    <span
                      style={{
                        backgroundColor: "#d13438",
                        color: "white",
                        borderRadius: "10px",
                        minWidth: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0 0.375rem",
                        flexShrink: 0,
                      }}
                    >
                      {unreadCounts.get(room.room_id)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

