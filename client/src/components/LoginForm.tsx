"use client";

interface LoginFormProps {
  identifier: string;
  password: string;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
}

export default function LoginForm({
  identifier,
  password,
  onIdentifierChange,
  onPasswordChange,
  onLogin,
}: LoginFormProps) {
  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h1>NodeTalk - Phase 1</h1>
      <div style={{ marginTop: "2rem" }}>
        <input
          type="text"
          placeholder="Bluesky identifier (handle or email)"
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        <input
          type="password"
          placeholder="App Password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onLogin()}
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}

