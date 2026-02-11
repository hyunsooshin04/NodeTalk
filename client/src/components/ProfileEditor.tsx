"use client";
import { useState, useRef } from "react";

interface ProfileEditorProps {
  profile: any;
  pdsDid: string | null;
  profileDisplayName: string;
  profileDescription: string;
  profileAvatarUrl: string | null;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAvatarUrlChange: (value: string | null) => void;
  onUpdateProfile: () => void;
  onUploadAvatar: (file: File) => Promise<{ fileUrl: string }>;
  onClose: () => void;
}

export default function ProfileEditor({
  profile,
  pdsDid,
  profileDisplayName,
  profileDescription,
  profileAvatarUrl,
  onDisplayNameChange,
  onDescriptionChange,
  onAvatarUrlChange,
  onUpdateProfile,
  onUploadAvatar,
  onClose,
}: ProfileEditorProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const { fileUrl } = await onUploadAvatar(file);
      onAvatarUrlChange(fileUrl);
    } catch (error) {
      alert("프로필 이미지 업로드 실패: " + (error as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
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
            프로필 설정
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
          <div style={{ position: "relative" }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: profileAvatarUrl
                ? `url(${profileAvatarUrl}) center/cover`
                : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
              border: "3px solid rgba(209, 37, 244, 0.5)",
              boxShadow: "0 0 20px rgba(209, 37, 244, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}>
              {!profileAvatarUrl && (
                <span style={{ fontSize: "3rem", color: "white" }}>👤</span>
              )}
            </div>
            {uploadingAvatar && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                color: "white",
                fontSize: "0.875rem"
              }}>
                업로드 중...
              </div>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "0.5rem",
              color: "white",
              cursor: uploadingAvatar ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s",
              opacity: uploadingAvatar ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!uploadingAvatar) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (!uploadingAvatar) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }
            }}
          >
            {uploadingAvatar ? "업로드 중..." : "이미지 변경"}
          </button>
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarSelect}
            accept="image/*"
            style={{ display: "none" }}
          />
        </div>

        {/* 표시 이름 */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "white",
            fontSize: "0.875rem"
          }}>
            표시 이름
          </label>
          <input
            type="text"
            value={profileDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="Display Name"
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

        {/* 설명 */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "white",
            fontSize: "0.875rem"
          }}>
            설명
          </label>
          <textarea
            value={profileDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Description"
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              color: "white",
              fontSize: "0.875rem",
              resize: "vertical",
              outline: "none",
              transition: "all 0.2s",
              fontFamily: "inherit"
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

        {/* DID 정보 */}
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "rgba(0, 0, 0, 0.2)", borderRadius: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace", wordBreak: "break-all" }}>
            DID: {pdsDid}
          </p>
          {profile?.handle && (
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace" }}>
              Handle: @{profile.handle}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onUpdateProfile}
            style={{
              flex: 1,
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
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
