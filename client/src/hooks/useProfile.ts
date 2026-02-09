import { useState } from "react";
import { ClientPDSAdapter } from "@/lib/pds";

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  const loadProfile = async (adapter: ClientPDSAdapter) => {
    try {
      const profileData = await adapter.getProfile(adapter.getDid());
      setProfile(profileData);
      setProfileDisplayName(profileData.displayName || "");
      setProfileDescription(profileData.description || "");
    } catch (error) {
      console.error("Load profile error:", error);
    }
  };

  const handleUpdateProfile = async (pds: ClientPDSAdapter | null) => {
    if (!pds) return;

    try {
      const updated = await pds.updateProfile({
        displayName: profileDisplayName,
        description: profileDescription,
      });
      setProfile(updated);
      setShowProfile(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Update profile error:", error);
      alert("Failed to update profile: " + (error as Error).message);
    }
  };

  return {
    profile,
    profileDisplayName,
    profileDescription,
    showProfile,
    setProfile,
    setProfileDisplayName,
    setProfileDescription,
    setShowProfile,
    loadProfile,
    handleUpdateProfile,
  };
}

