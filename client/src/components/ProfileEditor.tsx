"use client";

interface ProfileEditorProps {
  profile: any;
  pdsDid: string | null;
  profileDisplayName: string;
  profileDescription: string;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onUpdateProfile: () => void;
}

export default function ProfileEditor({
  profile,
  pdsDid,
  profileDisplayName,
  profileDescription,
  onDisplayNameChange,
  onDescriptionChange,
  onUpdateProfile,
}: ProfileEditorProps) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "1.5rem",
        marginBottom: "2rem",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h2 style={{ marginTop: 0 }}>프로필 편집</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
          표시 이름
        </label>
        <input
          type="text"
          value={profileDisplayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Display Name"
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
          설명
        </label>
        <textarea
          value={profileDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Description"
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            resize: "vertical",
          }}
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
          DID: {pdsDid}
        </p>
        {profile?.handle && (
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
            Handle: @{profile.handle}
          </p>
        )}
      </div>
      <button
        onClick={onUpdateProfile}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        저장
      </button>
    </div>
  );
}

