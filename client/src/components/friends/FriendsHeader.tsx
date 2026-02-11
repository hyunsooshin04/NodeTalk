"use client";

export default function FriendsHeader() {
  return (
    <div style={{ padding: "1.5rem", paddingBottom: "0.5rem" }}>
      <h2 style={{ 
        fontSize: "1.5rem", 
        fontWeight: "bold", 
        letterSpacing: "0.05em", 
        marginBottom: "1rem", 
        color: "white" 
      }}>
        FRIENDS <span style={{ color: "#d125f4" }}>.</span>
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
          placeholder="Search friends..."
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
  );
}

