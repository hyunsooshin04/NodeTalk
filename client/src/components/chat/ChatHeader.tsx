"use client";

interface ChatHeaderProps {
  roomName: string;
  memberCount: number;
  onShowInviteModal: () => void;
}

export default function ChatHeader({ roomName, memberCount, onShowInviteModal }: ChatHeaderProps) {
  return (
    <header style={{
      height: "80px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      padding: "0 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
      background: "rgba(255, 255, 255, 0.02)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ position: "relative" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(to bottom right, #d125f4, #00f0ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #d125f4",
            boxShadow: "0 0 10px rgba(209, 37, 244, 0.5)"
          }}>
            <span style={{ fontSize: "1.25rem" }}>💬</span>
          </div>
          <span style={{
            position: "absolute",
            bottom: "-4px",
            right: "-4px",
            display: "flex",
            height: "12px",
            width: "12px"
          }}>
            <span style={{
              animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
              position: "absolute",
              inlineSize: "100%",
              blockSize: "100%",
              borderRadius: "50%",
              background: "#ccff00",
              opacity: 0.75
            }}></span>
            <span style={{
              position: "relative",
              inlineSize: "100%",
              blockSize: "100%",
              borderRadius: "50%",
              background: "#ccff00"
            }}></span>
          </span>
        </div>
        <div>
          <h1 style={{
            fontSize: "1.125rem",
            fontWeight: "bold",
            color: "white",
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: 0,
            marginBottom: "0.25rem"
          }}>
            {roomName.toUpperCase()}
            <span style={{
              padding: "0.125rem 0.5rem",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.1)",
              fontSize: "0.625rem",
              fontWeight: "normal",
              color: "rgba(255, 255, 255, 0.7)"
            }}>Group</span>
          </h1>
          <p style={{
            fontSize: "0.75rem",
            color: "rgba(255, 255, 255, 0.5)",
            fontFamily: "monospace",
            margin: 0
          }}>
            {memberCount} Online • Vibe Check: <span style={{ color: "#ccff00" }}>Active</span>
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "transparent",
          border: "none",
          color: "rgba(148, 163, 184, 1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s"
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
          <span style={{ fontSize: "1.25rem" }}>🔍</span>
        </button>
        <button style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "transparent",
          border: "none",
          color: "rgba(148, 163, 184, 1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s"
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
          <span style={{ fontSize: "1.25rem" }}>📞</span>
        </button>
        <div style={{
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
          marginLeft: "0.5rem",
          paddingLeft: "0.5rem"
        }}>
          <button
            onClick={onShowInviteModal}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "rgba(148, 163, 184, 1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
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
            <span style={{ fontSize: "1.25rem" }}>⋮</span>
          </button>
        </div>
      </div>
    </header>
  );
}

