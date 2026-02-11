"use client";
import type { Friend } from "@/lib/friends";

interface InviteModalProps {
  friends: Friend[];
  onClose: () => void;
  onInvite: (friendDid: string) => Promise<void>;
  invitingFriend: string | null;
}

export default function InviteModal({
  friends,
  onClose,
  onInvite,
  invitingFriend,
}: InviteModalProps) {
  const handleInvite = async (friendDid: string) => {
    try {
      await onInvite(friendDid);
      alert("친구를 초대했습니다.");
      onClose();
    } catch (error) {
      alert("초대 실패: " + (error as Error).message);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(31, 16, 34, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "white" }}>
            친구 초대
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "rgba(255, 255, 255, 0.7)",
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
            <p style={{ color: "rgba(255, 255, 255, 0.6)", textAlign: "center", padding: "2rem" }}>
              초대할 친구가 없습니다.
            </p>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.did}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "white",
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
                      color: "rgba(255, 255, 255, 0.5)",
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
                    backgroundColor: invitingFriend === friend.did ? "rgba(255, 255, 255, 0.2)" : "#d125f4",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: invitingFriend === friend.did ? "not-allowed" : "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (invitingFriend !== friend.did) {
                      e.currentTarget.style.background = "#00f0ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (invitingFriend !== friend.did) {
                      e.currentTarget.style.background = "#d125f4";
                    }
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
  );
}

