"use client";

interface HeaderProps {
  profile: any;
  pdsDid: string | null;
  onShowProfile: () => void;
  onLogout: () => void;
}

export default function Header({ profile, pdsDid, onShowProfile, onLogout }: HeaderProps) {
  return (
    <div style={{
      backgroundColor: "#464EB8",
      color: "white",
      padding: "0.75rem 1.5rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>NodeTalk</h1>
        {profile && (
          <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>
            {profile.displayName || profile.handle || pdsDid}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onShowProfile}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(255,255,255,0.2)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          프로필
        </button>
        <button
          onClick={onLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(255,255,255,0.2)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

