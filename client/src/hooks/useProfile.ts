import { useState, useEffect } from "react";
import { ClientPDSAdapter } from "@/lib/pds";

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const loadProfile = async (adapter: ClientPDSAdapter) => {
    try {
      const myDid = adapter.getDid();
      
      // 서버에서 프로필 정보 가져오기
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(myDid)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          setProfileDisplayName(data.profile.displayName || "");
          setProfileDescription(data.profile.description || "");
          setProfileAvatarUrl(data.profile.avatarUrl || null);
          return;
        }
      }

      // 서버에 프로필이 없으면 PDS에서 가져오기
      const profileData = await adapter.getProfile(myDid);
      setProfile(profileData);
      setProfileDisplayName(profileData.displayName || "");
      setProfileDescription(profileData.description || "");
      setProfileAvatarUrl(profileData.avatar || null);
    } catch (error) {
      console.error("Load profile error:", error);
    }
  };

  const uploadAvatar = async (file: File): Promise<{ fileUrl: string }> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/files/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
    return {
      fileUrl: result.fileUrl,
    };
  };

  const handleUpdateProfile = async (pds: ClientPDSAdapter | null) => {
    if (!pds) return;

    try {
      const myDid = pds.getDid();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      // 서버에 프로필 업데이트
      const formData = new FormData();
      formData.append("did", myDid);
      formData.append("displayName", profileDisplayName);
      formData.append("description", profileDescription);
      if (profileAvatarUrl) {
        formData.append("avatarUrl", profileAvatarUrl);
      }

      const response = await fetch(`${API_URL}/api/profile/update`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Content-Type 확인
        const contentType = response.headers.get("content-type");
        let errorMessage = "Failed to update profile";
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
        } else {
          // HTML 응답인 경우
          const text = await response.text();
          console.error("Server returned non-JSON response:", text.substring(0, 200));
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned invalid response format");
      }

      const data = await response.json();
      
      // PDS에도 업데이트
      try {
        await pds.updateProfile({
          displayName: profileDisplayName,
          description: profileDescription,
          avatar: profileAvatarUrl || undefined,
        });
      } catch (pdsError) {
        console.warn("Failed to update PDS profile:", pdsError);
        // PDS 업데이트 실패해도 서버에는 저장되었으므로 계속 진행
      }

      setProfile(data.profile);
      setShowProfile(false);
      alert("프로필이 업데이트되었습니다!");
    } catch (error) {
      console.error("Update profile error:", error);
      alert("프로필 업데이트 실패: " + (error as Error).message);
    }
  };

  return {
    profile,
    profileDisplayName,
    profileDescription,
    profileAvatarUrl,
    showProfile,
    setProfile,
    setProfileDisplayName,
    setProfileDescription,
    setProfileAvatarUrl,
    setShowProfile,
    loadProfile,
    handleUpdateProfile,
    uploadAvatar,
  };
}
