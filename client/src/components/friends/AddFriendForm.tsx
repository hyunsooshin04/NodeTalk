"use client";

interface AddFriendFormProps {
  addFriendInput: string;
  onAddFriendInputChange: (value: string) => void;
  onSendFriendRequest: () => void;
}

export default function AddFriendForm({
  addFriendInput,
  onAddFriendInputChange,
  onSendFriendRequest,
}: AddFriendFormProps) {
  return (
    <div style={{ 
      padding: "1rem", 
      background: "rgba(0, 0, 0, 0.2)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "1rem"
    }}>
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem", color: "white", fontSize: "0.875rem", fontWeight: 600 }}>
        친구 신청 보내기
      </h3>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={addFriendInput}
          onChange={(e) => onAddFriendInputChange(e.target.value)}
          placeholder="DID 또는 Handle 입력"
          onKeyPress={(e) => e.key === "Enter" && onSendFriendRequest()}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.5rem",
            color: "white",
            fontSize: "0.875rem",
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
        <button
          onClick={onSendFriendRequest}
          style={{
            padding: "0.75rem 1.5rem",
            background: "linear-gradient(to right, #d125f4, #00f0ff)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 600,
            transition: "all 0.2s",
            boxShadow: "0 0 10px rgba(209, 37, 244, 0.5)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          신청
        </button>
      </div>
    </div>
  );
}

