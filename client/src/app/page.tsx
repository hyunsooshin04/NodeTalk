"use client";

import { useState, useEffect } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import { GatewayClient } from "@/lib/gateway";
import { RoomKeyManager } from "@/lib/room";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import type { PushNotification } from "@nodetalk/shared";

export default function Home() {
  const [pds, setPds] = useState<ClientPDSAdapter | null>(null);
  const [gateway, setGateway] = useState<GatewayClient | null>(null);
  const [roomKeyManager] = useState(() => new RoomKeyManager());
  const [loggedIn, setLoggedIn] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");

  useEffect(() => {
    roomKeyManager.loadAllKeys();
    
    // 로그인 상태 복원
    const savedLogin = localStorage.getItem("nodetalk_login");
    if (savedLogin) {
      try {
        const { identifier: savedIdentifier, password: savedPassword } = JSON.parse(savedLogin);
        setIdentifier(savedIdentifier);
        setPassword(savedPassword);
        // 자동 로그인
        handleAutoLogin(savedIdentifier, savedPassword);
      } catch (error) {
        console.error("Failed to restore login:", error);
        localStorage.removeItem("nodetalk_login");
      }
    }
  }, [roomKeyManager]);

  const handleAutoLogin = async (savedIdentifier: string, savedPassword: string) => {
    try {
      const adapter = new ClientPDSAdapter();
      await adapter.login(savedIdentifier, savedPassword);
      setPds(adapter);
      setLoggedIn(true);

      // Gateway 연결
      const gw = new GatewayClient();
      gw.connect();
      gw.onMessage(async (notification: PushNotification) => {
        console.log("📨 New message notification:", notification);
        // 새 메시지 fetch 및 복호화
        await loadMessages();
      });
      setGateway(gw);

      // 프로필 정보 로드
      await loadProfile(adapter);
    } catch (error) {
      console.error("Auto login error:", error);
      localStorage.removeItem("nodetalk_login");
    }
  };

  const loadProfile = async (adapter: ClientPDSAdapter) => {
    try {
      const myProfile = await adapter.getMyProfile();
      setProfile(myProfile);
      setProfileDisplayName(myProfile.displayName || "");
      setProfileDescription(myProfile.description || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const handleLogin = async () => {
    try {
      const adapter = new ClientPDSAdapter();
      await adapter.login(identifier, password);
      setPds(adapter);
      setLoggedIn(true);

      // 로그인 정보 저장
      localStorage.setItem("nodetalk_login", JSON.stringify({ identifier, password }));

      // AppView에 자신의 PDS 구독 등록
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const pdsEndpoint = "https://bsky.social";
        
        // AppView에 자신의 PDS 구독 등록
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: adapter.getDid(), 
            pdsEndpoint 
          }),
        });
        console.log("✅ Auto-subscribed to AppView");
      } catch (error) {
        console.warn("Failed to auto-subscribe to AppView:", error);
      }

      // Gateway 연결
      const gw = new GatewayClient();
      gw.connect();
      gw.onMessage(async (notification: PushNotification) => {
        console.log("📨 New message notification:", notification);
        // 새 메시지 fetch 및 복호화
        await loadMessages();
      });
      setGateway(gw);

      // 프로필 정보 로드
      await loadProfile(adapter);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: " + (error as Error).message);
    }
  };

  const handleUpdateProfile = async () => {
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

  const handleSendMessage = async () => {
    if (!pds || !roomId || !message.trim()) return;

    try {
      // Room 키 가져오기
      const key = roomKeyManager.getOrCreateRoomKey(roomId);

      // 암호화
      const { ciphertext, nonce } = await encryptMessage(message, key);

      // PDS에 저장
      const recordUri = await pds.sendMessage(roomId, ciphertext, nonce);
      console.log("✅ Message sent:", recordUri);

      // Room에 참여 등록 (아직 참여하지 않은 경우)
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const pdsEndpoint = "https://bsky.social";
        await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: pds.getDid(), 
            pdsEndpoint 
          }),
        });
      } catch (error) {
        // 무시 (이미 참여했을 수 있음)
      }

      // 메시지 목록 새로고침
      await loadMessages();
      setMessage("");
    } catch (error) {
      console.error("Send error:", error);
      alert("Send failed: " + (error as Error).message);
    }
  };

  const loadMessages = async () => {
    if (!pds || !roomId) return;

    try {
      const msgs = await pds.listRoomMessages(roomId);
      
      // 복호화 및 프로필 정보 가져오기
      const key = roomKeyManager.getOrCreateRoomKey(roomId);
      const decrypted = await Promise.all(
        msgs.map(async (msg) => {
          try {
            const plaintext = await decryptMessage(
              msg.ciphertext,
              msg.nonce,
              key
            );
            
            // 프로필 정보 가져오기
            let profile = { did: msg.senderDid, handle: msg.senderDid };
            try {
              profile = await pds.getProfile(msg.senderDid);
            } catch (error) {
              console.warn(`Failed to get profile for ${msg.senderDid}:`, error);
            }
            
            return {
              ...msg,
              plaintext,
              decrypted: true,
              profile,
            };
          } catch (error: any) {
            // 복호화 실패는 정상적인 경우일 수 있음 (다른 키로 암호화된 메시지)
            // 개발 환경에서만 상세 에러 로그 출력
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Decryption failed for message from ${msg.senderDid}:`, error.message || error);
            }
            
            // 프로필 정보는 가져오기
            let profile = { did: msg.senderDid, handle: msg.senderDid };
            try {
              profile = await pds.getProfile(msg.senderDid);
            } catch (profileError) {
              // 무시
            }
            
            return {
              ...msg,
              plaintext: "[Decryption failed]",
              decrypted: false,
              profile,
            };
          }
        })
      );

      setMessages(decrypted.reverse()); // 최신순
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  const handleSubscribe = async () => {
    if (gateway && roomId && pds) {
      gateway.subscribe(roomId);
      
      // Room에 참여 등록
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const pdsEndpoint = "https://bsky.social";
        
        // Room 참여 등록
        await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: pds.getDid(), 
            pdsEndpoint 
          }),
        });
        
        // AppView에 자신의 PDS 구독 등록
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: pds.getDid(), 
            pdsEndpoint 
          }),
        });
        console.log("✅ Joined room and subscribed to AppView");
      } catch (error) {
        console.warn("Failed to join room or subscribe to AppView:", error);
      }
      
      await loadMessages();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nodetalk_login");
    setPds(null);
    setLoggedIn(false);
    setIdentifier("");
    setPassword("");
    setMessages([]);
    gateway?.disconnect();
    setGateway(null);
  };

  if (!loggedIn) {
    return (
      <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
        <h1>NodeTalk - Phase 1</h1>
        <div style={{ marginTop: "2rem" }}>
          <input
            type="text"
            placeholder="Bluesky identifier (handle or email)"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
          />
          <input
            type="password"
            placeholder="App Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
          />
          <button
            onClick={handleLogin}
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

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1>NodeTalk - Phase 1 Demo</h1>
          <p>
            Logged in as: {profile?.displayName || profile?.handle || pds?.getDid()}
            {profile?.handle && ` (@${profile.handle})`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showProfile ? "Close Profile" : "Edit Profile"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {showProfile && (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Edit Profile</h2>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Display Name
            </label>
            <input
              type="text"
              value={profileDisplayName}
              onChange={(e) => setProfileDisplayName(e.target.value)}
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
              Description
            </label>
            <textarea
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
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
              DID: {pds?.getDid()}
            </p>
            {profile?.handle && (
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
                Handle: @{profile.handle}
              </p>
            )}
          </div>
          <button
            onClick={handleUpdateProfile}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Save Profile
          </button>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <input
          type="text"
          placeholder="Room ID (e.g., dm-user1-user2)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        <button
          onClick={handleSubscribe}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          Subscribe to Room
        </button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "1rem",
            minHeight: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            marginBottom: "1rem",
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: "#666" }}>No messages yet</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                  backgroundColor: msg.senderDid === pds?.getDid() ? "#e3f2fd" : "#f5f5f5",
                  borderRadius: "4px",
                  borderLeft: msg.senderDid === pds?.getDid() ? "3px solid #2196f3" : "3px solid #ccc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#333" }}>
                    {msg.profile?.displayName || msg.profile?.handle || msg.senderDid || "Unknown"}
                    {msg.senderDid === pds?.getDid() && " (You)"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ 
                  color: msg.decrypted ? "#000" : "#f44336",
                  fontStyle: msg.decrypted ? "normal" : "italic"
                }}>
                  {msg.plaintext}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

