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
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1f1022",
      color: "white",
      fontFamily: "'Spline Sans', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Ambient Background Gradients */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(circle, rgba(209, 37, 244, 0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(120px)"
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(120px)"
        }}></div>
      </div>

      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "400px",
        padding: "2rem"
      }}>
        <div style={{
          background: "rgba(31, 16, 34, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
            background: "linear-gradient(to right, #d125f4, #00f0ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center"
          }}>
            NodeTalk
          </h1>
          <p style={{
            fontSize: "0.875rem",
            color: "rgba(255, 255, 255, 0.6)",
            textAlign: "center",
            marginBottom: "2rem"
          }}>
            Phase 1
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Bluesky identifier (handle or email)"
                value={identifier}
                onChange={(e) => onIdentifierChange(e.target.value)}
                style={{
                  width: "100%",
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
            </div>
            
            <div style={{ position: "relative" }}>
              <input
                type="password"
                placeholder="App Password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && onLogin()}
                style={{
                  width: "100%",
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
            </div>
            
            <button
              onClick={onLogin}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "linear-gradient(to right, #d125f4, #00f0ff)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                transition: "all 0.2s",
                boxShadow: "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(209, 37, 244, 0.7), 0 0 30px rgba(209, 37, 244, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)";
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
