"use client";
import type { Friend } from "@/lib/friends";

interface FriendProfileModalProps {
  friend: Friend | null;
  onClose: () => void;
}

export default function FriendProfileModal({ friend, onClose }: FriendProfileModalProps) {
  if (!friend) return null;

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
        zIndex: 2000,
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
          padding: "2rem",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "white",
            letterSpacing: "0.05em"
          }}>
            프로필
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: 0,
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
            }}
          >
            ×
          </button>
        </div>

        {/* 프로필 이미지 */}
        <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: friend.avatarUrl
              ? `url(${friend.avatarUrl}) center/cover`
              : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
            border: "3px solid rgba(209, 37, 244, 0.5)",
            boxShadow: "0 0 20px rgba(209, 37, 244, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            {!friend.avatarUrl && (
              <span style={{ fontSize: "3rem", color: "white" }}>👤</span>
            )}
          </div>
        </div>

        {/* 표시 이름 */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.875rem"
          }}>
            표시 이름
          </label>
          <div style={{
            width: "100%",
            padding: "0.75rem 1rem",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.5rem",
            color: "white",
            fontSize: "0.875rem",
          }}>
            {friend.displayName || friend.handle || friend.did}
          </div>
        </div>

        {/* Handle */}
        {friend.handle && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.875rem"
            }}>
              Handle
            </label>
            <div style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              color: "white",
              fontSize: "0.875rem",
            }}>
              @{friend.handle}
            </div>
          </div>
        )}

        {/* DID 정보 */}
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(0, 0, 0, 0.2)", borderRadius: "0.5rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.875rem"
          }}>
            DID
          </label>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace", wordBreak: "break-all" }}>
            {friend.did}
          </p>
        </div>

        {/* 추가 정보 (친구 추가 날짜 등) */}
        {friend.addedAt && (
          <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(0, 0, 0, 0.2)", borderRadius: "0.5rem" }}>
            <label style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.875rem"
            }}>
              친구 추가일
            </label>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
              {new Date(friend.addedAt).toLocaleString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Seoul"
              })}
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

