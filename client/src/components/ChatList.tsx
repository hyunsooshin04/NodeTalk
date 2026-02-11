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
      {/* Search Header */}
      <div style={{ padding: "1.5rem", paddingBottom: "0.5rem" }}>
        <h2 style={{ 
          fontSize: "1.5rem", 
          fontWeight: "bold", 
          letterSpacing: "0.05em", 
          marginBottom: "1rem", 
          color: "white" 
        }}>
          CHATS <span style={{ color: "#d125f4" }}>.</span>
        </h2>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(148, 163, 184, 1)",
            fontSize: "1.25rem"
          }}>🔍</div>
          <input
            type="text"
            placeholder="Search vibes..."
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "9999px",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              fontSize: "0.875rem",
              color: "white",
              outline: "none",
              transition: "all 0.2s"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(209, 37, 244, 0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 1px rgba(209, 37, 244, 0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Chat List */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "0 1rem 1rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
        {showCreateGroup && (
          <div style={{ 
            marginBottom: "1rem", 
            padding: "1rem", 
            border: "1px solid rgba(255, 255, 255, 0.1)", 
            borderRadius: "1rem", 
            background: "rgba(0, 0, 0, 0.2)" 
          }}>
            <h4 style={{ marginTop: 0, color: "white", marginBottom: "0.5rem" }}>그룹 채팅방 만들기</h4>
            <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.6)", marginBottom: "1rem" }}>
              그룹 채팅에 추가할 친구를 선택하세요 (최소 1명)
            </p>
            {friends.length === 0 ? (
              <p style={{ color: "rgba(255, 255, 255, 0.6)" }}>친구가 없습니다. 먼저 친구를 추가하세요.</p>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.5rem", 
                marginBottom: "1rem", 
                maxHeight: "200px", 
                overflowY: "auto" 
              }}>
                {friends.map((friend) => (
                  <label
                    key={friend.did}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      cursor: "pointer",
                      borderRadius: "0.5rem",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriendsForGroup.has(friend.did)}
                      onChange={() => onToggleFriendForGroup(friend.did)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ color: "white" }}>
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
                  background: "linear-gradient(to right, #d125f4, #00f0ff)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "transform 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                만들기 ({selectedFriendsForGroup.size}명)
              </button>
              <button
                onClick={onCancelCreateGroup}
                style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
        
        {rooms.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
            <p style={{ margin: 0 }}>채팅방이 없습니다.</p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>친구 목록에서 친구를 선택하여 채팅을 시작하세요.</p>
          </div>
        ) : (
          <>
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.room_id;
              return (
                <div
                  key={room.room_id}
                  onClick={() => onSelectRoom(room.room_id)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "1rem",
                    background: isSelected ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    border: isSelected ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to right, rgba(209, 37, 244, 0.1), transparent)",
                      opacity: 1,
                      transition: "opacity 0.2s"
                    }}></div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", position: "relative", zIndex: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: isSelected ? 700 : 600, 
                        fontSize: "0.875rem",
                        color: "white",
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {roomNames.get(room.room_id) || room.room_id}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "0.125rem" }}>
                        {room.member_count}명
                      </div>
                      {room.last_message_at && (
                        <div style={{ fontSize: "0.625rem", color: "rgba(255, 255, 255, 0.4)", marginTop: "0.125rem" }}>
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
                          background: "#ccff00",
                          color: "#1f1022",
                          borderRadius: "10px",
                          minWidth: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0 0.375rem",
                          flexShrink: 0,
                          boxShadow: "0 0 10px rgba(204, 255, 0, 0.5)"
                        }}
                      >
                        {unreadCounts.get(room.room_id)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
