"use client";

interface SentRequestItemProps {
  request: any;
  onCancel: (requestId: number) => void;
}

export default function SentRequestItem({
  request,
  onCancel,
}: SentRequestItemProps) {
  return (
    <div
      style={{
        padding: "0.75rem",
        borderRadius: "1rem",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "linear-gradient(to bottom right, #d125f4, #00f0ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          opacity: 0.7
        }}>
          <span style={{ fontSize: "1.25rem" }}>👤</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: "0.875rem",
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: "0.25rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {request.to_displayName || request.to_handle || request.to_did}
          </div>
          {request.to_handle && (
            <div style={{ 
              fontSize: "0.75rem", 
              color: "rgba(255, 255, 255, 0.4)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              @{request.to_handle}
            </div>
          )}
          <div style={{ fontSize: "0.625rem", color: "rgba(255, 255, 255, 0.4)", marginTop: "0.25rem" }}>
            대기 중...
          </div>
        </div>
      </div>
      <button
        onClick={() => onCancel(request.id)}
        style={{
          padding: "0.5rem 0.875rem",
          background: "rgba(255, 255, 255, 0.1)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "0.5rem",
          cursor: "pointer",
          fontSize: "0.8125rem",
          fontWeight: 500,
          whiteSpace: "nowrap",
          transition: "all 0.2s"
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
  );
}

