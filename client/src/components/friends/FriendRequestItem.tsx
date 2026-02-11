"use client";
import { useState, useEffect } from "react";

interface FriendRequestItemProps {
  request: any;
  onAccept: (requestId: number, fromDid: string) => void;
  onReject: (requestId: number) => void;
  onSelect?: (request: any) => void;
}

export default function FriendRequestItem({
  request,
  onAccept,
  onReject,
  onSelect,
}: FriendRequestItemProps) {
  const [profileData, setProfileData] = useState<{ displayName?: string; avatarUrl?: string } | null>(null);

  useEffect(() => {
    // 서버에서 프로필 정보 가져오기
    const loadProfile = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(request.from_did)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile) {
            setProfileData(data.profile);
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    loadProfile();
  }, [request.from_did]);
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
        transition: "all 0.2s",
        cursor: onSelect ? "pointer" : "default"
      }}
      onClick={() => onSelect?.(request)}
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
          background: profileData?.avatarUrl
            ? `url(${profileData.avatarUrl}) center/cover`
            : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "2px solid rgba(209, 37, 244, 0.5)"
        }}>
          {!profileData?.avatarUrl && (
            <span style={{ fontSize: "1.25rem" }}>👤</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: "0.875rem",
            color: "white",
            marginBottom: "0.25rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {profileData?.displayName || request.from_displayName || request.from_handle || request.from_did}
          </div>
          {request.from_handle && (
            <div style={{ 
              fontSize: "0.75rem", 
              color: "rgba(255, 255, 255, 0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              @{request.from_handle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onAccept(request.id, request.from_did)}
          style={{
            padding: "0.5rem 0.875rem",
            background: "linear-gradient(to right, #d125f4, #00f0ff)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
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
          수락
        </button>
        <button
          onClick={() => onReject(request.id)}
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
          거절
        </button>
      </div>
    </div>
  );
}

