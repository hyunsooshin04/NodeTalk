"use client";
import { useState, useEffect } from "react";
import type { Friend } from "@/lib/friends";

interface FriendProfileViewProps {
  friend: Friend | null;
  onStartChat: (friendDid: string) => void;
  onRemoveFriend?: (friendDid: string) => void;
  onClose?: () => void;
}

export default function FriendProfileView({ friend, onStartChat, onRemoveFriend, onClose }: FriendProfileViewProps) {
  const [profileData, setProfileData] = useState<{ displayName?: string; description?: string; avatarUrl?: string } | null>(null);

  useEffect(() => {
    if (!friend) {
      setProfileData(null);
      return;
    }

    // friend가 변경될 때마다 프로필 데이터 초기화
    setProfileData(null);

    // 서버에서 프로필 정보 가져오기
    const loadProfile = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(friend.did)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profile) {
            setProfileData(data.profile);
          } else {
            // 프로필이 없으면 빈 객체로 설정
            setProfileData({});
          }
        } else {
          setProfileData({});
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        setProfileData({});
      }
    };

    loadProfile();
  }, [friend?.did]); // friend.did를 dependency로 사용
  if (!friend) {
    return (
      <div style={{ 
        flex: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: "0.875rem"
      }}>
        <p>친구를 선택하세요</p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }}>
      {/* Header */}
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
              background: (profileData?.avatarUrl || friend.avatarUrl)
                ? `url(${profileData?.avatarUrl || friend.avatarUrl}) center/cover`
                : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #d125f4",
              boxShadow: "0 0 10px rgba(209, 37, 244, 0.5)"
            }}>
              {!(profileData?.avatarUrl || friend.avatarUrl) && (
                <span style={{ fontSize: "1.25rem" }}>👤</span>
              )}
            </div>
          </div>
          <div>
            <h1 style={{
              fontSize: "1.125rem",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "0.025em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: 0
            }}>
              {profileData?.displayName || friend.displayName || friend.handle || friend.did}
            </h1>
            {friend.handle && (
              <p style={{
                fontSize: "0.75rem",
                color: "rgba(255, 255, 255, 0.6)",
                fontFamily: "monospace",
                margin: 0
              }}>
                @{friend.handle}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                fontSize: "1.25rem"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
              }}
              title="닫기"
            >
              ×
            </button>
          )}
          <button
            onClick={() => onStartChat(friend.did)}
            style={{
              padding: "0.375rem 0.75rem",
              backgroundColor: "#464EB8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            채팅 시작
          </button>
          {onRemoveFriend && (
            <button
              onClick={() => onRemoveFriend(friend.did)}
              style={{
                padding: "0.375rem 0.75rem",
                backgroundColor: "transparent",
                color: "#d13438",
                border: "1px solid #d13438",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              친구 삭제
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem"
      }}>
        {/* 프로필 이미지 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: (profileData?.avatarUrl || friend.avatarUrl)
              ? `url(${profileData?.avatarUrl || friend.avatarUrl}) center/cover`
              : "linear-gradient(to bottom right, #d125f4, #00f0ff)",
            border: "4px solid rgba(209, 37, 244, 0.5)",
            boxShadow: "0 0 30px rgba(209, 37, 244, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            {!(profileData?.avatarUrl || friend.avatarUrl) && (
              <span style={{ fontSize: "5rem", color: "white" }}>👤</span>
            )}
          </div>
        </div>

        {/* 표시 이름 */}
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.75rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            표시 이름
          </label>
          <div style={{
            width: "100%",
            padding: "1rem 1.25rem",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.75rem",
            color: "white",
            fontSize: "1rem",
          }}>
            {profileData?.displayName || friend.displayName || friend.handle || friend.did}
          </div>
        </div>

        {/* Handle */}
        {friend.handle && (
          <div>
            <label style={{
              display: "block",
              marginBottom: "0.75rem",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Handle
            </label>
            <div style={{
              width: "100%",
              padding: "1rem 1.25rem",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.75rem",
              color: "white",
              fontSize: "1rem",
            }}>
              @{friend.handle}
            </div>
          </div>
        )}

        {/* DID 정보 */}
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.75rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            DID
          </label>
          <div style={{
            width: "100%",
            padding: "1rem 1.25rem",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.75rem",
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            wordBreak: "break-all"
          }}>
            {friend.did}
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.75rem",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.875rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            설명
          </label>
          <div style={{
            width: "100%",
            padding: "1rem 1.25rem",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "0.75rem",
            color: profileData?.description ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.4)",
            fontSize: "0.875rem",
            wordBreak: "break-word",
            fontStyle: profileData?.description ? "normal" : "italic"
          }}>
            {profileData?.description || "설명이 없습니다."}
          </div>
        </div>

        {/* 친구 추가일 */}
        {friend.addedAt && (
          <div>
            <label style={{
              display: "block",
              marginBottom: "0.75rem",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              친구 추가일
            </label>
            <div style={{
              width: "100%",
              padding: "1rem 1.25rem",
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.75rem",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "0.875rem",
              fontFamily: "monospace"
            }}>
              {new Date(friend.addedAt).toLocaleString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Seoul"
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

