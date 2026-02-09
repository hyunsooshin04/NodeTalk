"use client";

import { useState, useEffect, useRef } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import { GatewayClient } from "@/lib/gateway";
import { RoomKeyManager } from "@/lib/room";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import type { Friend } from "@/lib/friends";
import { generateDMRoomId } from "@/lib/rooms";
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
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addFriendInput, setAddFriendInput] = useState("");
  const [currentView, setCurrentView] = useState<"chat" | "friends">("chat");
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map()); // roomId -> unread count
  const [lastReadMessageUri, setLastReadMessageUri] = useState<Map<string, string>>(new Map()); // roomId -> last read message URI
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef<string>("");

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
        handleAutoLogin(savedIdentifier, savedPassword).finally(() => {
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Failed to restore login:", error);
        localStorage.removeItem("nodetalk_login");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [roomKeyManager]);

  // roomId가 변경되면 메시지 자동 로드 및 읽음 처리
  useEffect(() => {
    roomIdRef.current = roomId; // ref 업데이트
    if (roomId && pds) {
      console.log(`Room ID changed to ${roomId}, loading messages...`);
      setMessages([]); // 먼저 초기화
      loadMessages().then(() => {
        // 메시지 로드 후 스크롤을 맨 아래로
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 200);
        
        // 채팅방을 열었으므로 마지막 읽은 메시지 ID 업데이트
        updateLastReadMessage(roomId);
      });
    }
  }, [roomId, pds]);
  
  // 마지막 읽은 메시지 ID 업데이트 함수
  const updateLastReadMessage = async (targetRoomId: string) => {
    if (!pds || !targetRoomId) return;
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = pds.getDid();
      
      console.log(`[Client] Updating last read message for room ${targetRoomId}`);
      
      // messages 배열에서 가장 최신 메시지의 ID를 찾기
      // 하지만 messages는 msg_index의 id를 가지고 있지 않을 수 있으므로
      // 서버에서 방의 마지막 메시지 ID로 업데이트하도록 함
      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(targetRoomId)}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          did: myDid,
          // messageId는 서버에서 방의 마지막 메시지 ID로 자동 설정됨
        }),
      });
      
      const result = await response.json();
      console.log(`[Client] Updated last read message for room ${targetRoomId}, lastReadMessageId: ${result.lastReadMessageId}`);
      
      // 안 읽은 메시지 개수 초기화
      setUnreadCounts((prev) => {
        const updated = new Map(prev);
        updated.set(targetRoomId, 0);
        return updated;
      });
      
      // 채팅방 목록 새로고침 (서버에서 계산된 안 읽은 메시지 개수 가져오기)
      await loadRooms(pds);
    } catch (error) {
      console.error("[Client] Failed to update last read message:", error);
    }
  };

  // messages가 변경되면 스크롤을 맨 아래로
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length]);

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
        console.log("New notification received:", notification);
        if (notification.type === "new_message") {
          // 현재 선택된 방의 메시지인지 확인 (ref를 통해 최신 값 참조)
          const currentRoomId = roomIdRef.current;
          console.log(`Checking notification: roomId=${notification.roomId}, current roomId=${currentRoomId || 'none'}`);
          if (notification.roomId === currentRoomId && notification.recordUri) {
            console.log(`New message in current room ${currentRoomId}, adding message...`);
            // roomId가 여전히 같은지 확인
            if (roomIdRef.current === notification.roomId && notification.recordUri) {
              try {
                let msg;
                
                // 메시지 내용이 알림에 포함되어 있으면 바로 사용 (더 빠름)
                if (notification.messageContent) {
                  msg = {
                    uri: notification.recordUri,
                    senderDid: notification.messageContent.senderDid,
                    createdAt: notification.messageContent.createdAt,
                    roomId: notification.roomId,
                    ciphertext: notification.messageContent.ciphertext,
                    nonce: notification.messageContent.nonce,
                  };
                  console.log("Using message content from notification (fast path)");
                } else {
                  // 폴백: PDS에서 조회 (이전 방식)
                  console.log("Fetching message from PDS (fallback)");
                  const msgRecord = await adapter.getMessage(notification.recordUri);
                  if (msgRecord) {
                    // URI 파싱하여 senderDid 추출
                    const uriMatch = notification.recordUri.match(/at:\/\/([^/]+)\//);
                    const senderDid = uriMatch ? uriMatch[1] : "";
                    
                    msg = {
                      uri: notification.recordUri,
                      senderDid: senderDid,
                      createdAt: msgRecord.createdAt || new Date().toISOString(),
                      roomId: msgRecord.roomId,
                      ciphertext: String(msgRecord.ciphertext || ""),
                      nonce: String(msgRecord.nonce || ""),
                    };
                  }
                }
                
                if (msg) {
                  console.log("[Client AutoLogin] Calling addMessageToState with message...");
                  // 메시지를 상태에 추가 (adapter를 파라미터로 전달)
                  await addMessageToState(msg, notification.roomId, adapter);
                  console.log("[Client AutoLogin] addMessageToState completed");
                } else {
                  console.warn("[Client AutoLogin] ✗ No message object created");
                }
              } catch (error) {
                console.error("[Client AutoLogin] ✗ Failed to process new message:", error);
                // 실패 시 전체 재로드로 폴백
                if (roomIdRef.current === notification.roomId) {
                  console.log("[Client AutoLogin] Falling back to loadMessages()");
                  await loadMessages();
                }
              }
              await loadRooms(adapter);
            } else {
              console.log(`[Client AutoLogin] ✗ RoomId changed during processing. Was: ${notification.roomId}, Now: ${roomIdRef.current}`);
            }
          } else {
            console.log(`[Client AutoLogin] ✗ RoomId mismatch or missing recordUri`);
            console.log(`[Client AutoLogin]   - notification.roomId: ${notification.roomId}`);
            console.log(`[Client AutoLogin]   - currentRoomId: ${currentRoomId || 'none'}`);
            console.log(`[Client AutoLogin]   - notification.recordUri: ${notification.recordUri || 'missing'}`);
            // 다른 방의 메시지이지만 채팅방 목록은 새로고침
            await loadRooms(adapter);
          }
        } else if (notification.type === "friend_request") {
          // 새 친구 신청 알림 - 자동으로 목록 새로고침 및 신청 목록 표시
          await loadFriendRequests(adapter);
          // 친구 목록 뷰로 전환하고 신청 목록 표시
          setCurrentView("friends");
          setShowRequests(true);
        } else if (notification.type === "friend_accepted") {
          // 친구 신청이 수락됨 - 친구 목록 새로고침
          await loadFriends(adapter);
          await loadFriendRequests(adapter);
        } else if (notification.type === "friend_removed") {
          // 친구가 삭제됨 - 친구 목록 새로고침
          await loadFriends(adapter);
        }
      });
      // 자신의 DID로 구독 (친구 신청 알림 받기)
      gw.subscribeDid(adapter.getDid());
      setGateway(gw);

      // 프로필 정보 로드
      await loadProfile(adapter);
      
      // 친구 목록 로드 (서버에서 동기화)
      await loadFriends(adapter);
      
      // 친구 신청 목록 로드
      await loadFriendRequests(adapter);
      
      // 채팅방 목록 로드
      await loadRooms(adapter);
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
        console.log("Auto-subscribed to AppView");
      } catch (error) {
        console.warn("Failed to auto-subscribe to AppView:", error);
      }

      // Gateway 연결
      const gw = new GatewayClient();
      gw.connect();
      gw.onMessage(async (notification: PushNotification) => {
        console.log("New notification received:", notification);
        if (notification.type === "new_message") {
          // 현재 선택된 방의 메시지인지 확인 (ref를 통해 최신 값 참조)
          const currentRoomId = roomIdRef.current;
          console.log(`Checking notification: roomId=${notification.roomId}, current roomId=${currentRoomId || 'none'}`);
          if (notification.roomId === currentRoomId && notification.recordUri) {
            console.log(`New message in current room ${currentRoomId}, adding message...`);
            // roomId가 여전히 같은지 확인
            if (roomIdRef.current === notification.roomId && notification.recordUri) {
              try {
                let msg;
                
                // 메시지 내용이 알림에 포함되어 있으면 바로 사용 (더 빠름)
                if (notification.messageContent) {
                  msg = {
                    uri: notification.recordUri,
                    senderDid: notification.messageContent.senderDid,
                    createdAt: notification.messageContent.createdAt,
                    roomId: notification.roomId,
                    ciphertext: notification.messageContent.ciphertext,
                    nonce: notification.messageContent.nonce,
                  };
                  console.log("Using message content from notification (fast path)");
                } else {
                  // 폴백: PDS에서 조회 (이전 방식)
                  console.log("Fetching message from PDS (fallback)");
                  const msgRecord = await adapter.getMessage(notification.recordUri);
                  if (msgRecord) {
                    // URI 파싱하여 senderDid 추출
                    const uriMatch = notification.recordUri.match(/at:\/\/([^/]+)\//);
                    const senderDid = uriMatch ? uriMatch[1] : "";
                    
                    msg = {
                      uri: notification.recordUri,
                      senderDid: senderDid,
                      createdAt: msgRecord.createdAt || new Date().toISOString(),
                      roomId: msgRecord.roomId,
                      ciphertext: String(msgRecord.ciphertext || ""),
                      nonce: String(msgRecord.nonce || ""),
                    };
                  }
                }
                
                if (msg) {
                  console.log("[Client] Calling addMessageToState with message...");
                  // 메시지를 상태에 추가 (adapter를 파라미터로 전달)
                  await addMessageToState(msg, notification.roomId, adapter);
                  console.log("[Client] addMessageToState completed");
                } else {
                  console.warn("[Client] ✗ No message object created");
                }
              } catch (error) {
                console.error("[Client] ✗ Failed to process new message:", error);
                // 실패 시 전체 재로드로 폴백
                if (roomIdRef.current === notification.roomId) {
                  console.log("[Client] Falling back to loadMessages()");
                  await loadMessages();
                }
              }
              await loadRooms(adapter);
            } else {
              console.log(`[Client] ✗ RoomId changed during processing. Was: ${notification.roomId}, Now: ${roomIdRef.current}`);
            }
          } else {
            console.log(`[Client] ✗ RoomId mismatch or missing recordUri`);
            console.log(`[Client]   - notification.roomId: ${notification.roomId}`);
            console.log(`[Client]   - currentRoomId: ${currentRoomId || 'none'}`);
            console.log(`[Client]   - notification.recordUri: ${notification.recordUri || 'missing'}`);
            // 다른 방의 메시지이지만 채팅방 목록은 새로고침
            await loadRooms(adapter);
          }
        } else if (notification.type === "friend_request") {
          // 새 친구 신청 알림 - 자동으로 목록 새로고침 및 신청 목록 표시
          await loadFriendRequests(adapter);
          // 친구 목록 뷰로 전환하고 신청 목록 표시
          setCurrentView("friends");
          setShowRequests(true);
        } else if (notification.type === "friend_accepted") {
          // 친구 신청이 수락됨 - 친구 목록 새로고침
          await loadFriends(adapter);
          await loadFriendRequests(adapter);
        } else if (notification.type === "friend_removed") {
          // 친구가 삭제됨 - 친구 목록 새로고침
          await loadFriends(adapter);
        }
      });
      // 자신의 DID로 구독 (친구 신청 알림 받기)
      gw.subscribeDid(adapter.getDid());
      setGateway(gw);

      // 프로필 정보 로드
      await loadProfile(adapter);
      
      // 친구 목록 로드 (서버에서 동기화)
      await loadFriends(adapter);
      
      // 친구 신청 목록 로드
      await loadFriendRequests(adapter);
      
      // 채팅방 목록 로드
      await loadRooms(adapter);
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
      // Room 키 가져오기 (서버에서)
      const key = await roomKeyManager.getOrCreateRoomKey(roomId);

      // 암호화
      const { ciphertext, nonce } = await encryptMessage(message, key);

      // PDS에 저장
      const recordUri = await pds.sendMessage(roomId, ciphertext, nonce);
      console.log("Message sent:", recordUri);

      // Room에 참여 등록 (아직 참여하지 않은 경우)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = "https://bsky.social";
      const myDid = pds.getDid();
      
      try {
        await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: myDid, 
            pdsEndpoint 
          }),
        });
      } catch (error) {
        // 무시 (이미 참여했을 수 있음)
      }

      // 자신의 PDS를 AppView에 구독 (메시지 감지를 위해)
      try {
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: myDid, 
            pdsEndpoint 
          }),
        });
        console.log("Subscribed own PDS to AppView for message detection");
      } catch (error) {
        console.warn("Failed to subscribe own PDS to AppView:", error);
      }

      // 메시지를 로컬 상태에만 추가 (PDS 재조회 없이)
      const now = new Date().toISOString();
      
      // 서버에 즉시 알림 요청 (다른 참여자들에게 즉시 전달)
      console.log("[handleSendMessage] Notifying server about new message...");
      console.log("[handleSendMessage] Message details:", {
        recordUri,
        senderDid: myDid,
        roomId,
        ciphertextLength: ciphertext.length,
        nonceLength: nonce.length,
        createdAt: now,
      });
      try {
        const notifyResponse = await fetch(`${API_URL}/api/messages/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordUri: recordUri,
            senderDid: myDid,
            roomId: roomId,
            ciphertext: ciphertext,
            nonce: nonce,
            createdAt: now,
          }),
        });
        const notifyResult = await notifyResponse.json();
        console.log("[handleSendMessage] ✓ Server notification response:", notifyResult);
      } catch (error) {
        console.warn("[handleSendMessage] ✗ Failed to notify server about new message:", error);
        // 실패해도 계속 진행 (polling으로 나중에 감지됨)
      }
      // 프로필 정보 가져오기 (이미 로드된 profile 상태 사용)
      const myProfile = profile || { did: myDid, handle: myDid };
      const sentMessage = {
        uri: recordUri,
        senderDid: myDid,
        createdAt: now,
        roomId: roomId,
        ciphertext: ciphertext,
        nonce: nonce,
        plaintext: message.trim(), // 이미 평문이므로 그대로 사용
        decrypted: true,
        profile: myProfile,
      };
      
      setMessages((prev) => {
        // 중복 체크
        if (prev.some((m) => m.uri === recordUri)) {
          return prev;
        }
        const updated = [...prev, sentMessage];
        // 시간순으로 정렬
        return updated.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
      });
      
      // 채팅방 목록 새로고침 (last_message_at 업데이트 반영)
      await loadRooms(pds);
      
      setMessage("");
      
      // 메시지 전송 후 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Send error:", error);
      alert("Send failed: " + (error as Error).message);
    }
  };

  // 단일 메시지를 복호화하고 프로필 정보를 가져와서 상태에 추가
  const addMessageToState = async (msg: any, targetRoomId: string, pdsAdapter?: ClientPDSAdapter) => {
    console.log("[addMessageToState] ===== Called =====");
    console.log("[addMessageToState] msg:", { uri: msg.uri, senderDid: msg.senderDid, roomId: msg.roomId });
    console.log("[addMessageToState] targetRoomId:", targetRoomId);
    console.log("[addMessageToState] pds (from state):", !!pds);
    console.log("[addMessageToState] pdsAdapter (parameter):", !!pdsAdapter);
    
    // pdsAdapter 파라미터가 있으면 사용, 없으면 상태의 pds 사용
    const currentPds = pdsAdapter || pds;
    
    if (!currentPds || !targetRoomId) {
      console.warn("[addMessageToState] ✗ Missing pds or targetRoomId, returning");
      console.warn("[addMessageToState]   - currentPds:", !!currentPds);
      console.warn("[addMessageToState]   - targetRoomId:", targetRoomId);
      return;
    }

    try {
      // 복호화 및 프로필 정보 가져오기
      console.log("[addMessageToState] Getting room key...");
      const key = await roomKeyManager.getOrCreateRoomKey(targetRoomId);
      console.log("[addMessageToState] Room key obtained, length:", key.length);
      
      // 필수 필드 검증
      if (!msg.ciphertext || !msg.nonce) {
        console.warn(`[addMessageToState] ✗ Message missing ciphertext or nonce:`, msg);
        const newMsg = {
          ...msg,
          plaintext: "[Invalid message format]",
          decrypted: false,
          profile: { did: msg.senderDid, handle: msg.senderDid },
        };
        setMessages((prev) => {
          // 중복 체크
          if (prev.some((m) => m.uri === msg.uri)) {
            return prev;
          }
          const updated = [...prev, newMsg];
          // 시간순으로 정렬
          return updated.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeA - timeB;
          });
        });
        return;
      }

      let plaintext: string;
      let decrypted: boolean;
      
      try {
        console.log("[addMessageToState] Decrypting message...");
        plaintext = await decryptMessage(msg.ciphertext, msg.nonce, key);
        decrypted = true;
        console.log("[addMessageToState] ✓ Decryption successful, plaintext length:", plaintext.length);
      } catch (error: any) {
        console.error(`[addMessageToState] ✗ Decryption failed for message from ${msg.senderDid}:`, error.message || error);
        plaintext = "[Decryption failed]";
        decrypted = false;
      }
      
      // 프로필 정보 가져오기
      console.log("[addMessageToState] Getting profile for:", msg.senderDid);
      let profile = { did: msg.senderDid, handle: msg.senderDid };
      try {
        profile = await currentPds.getProfile(msg.senderDid);
        console.log("[addMessageToState] ✓ Profile obtained:", profile.handle || profile.did);
      } catch (error) {
        console.warn(`[addMessageToState] Failed to get profile for ${msg.senderDid}:`, error);
      }
      
      const newMsg = {
        ...msg,
        plaintext,
        decrypted,
        profile,
      };
      
      console.log("[addMessageToState] Updating messages state...");
      console.log("[addMessageToState] New message:", { uri: newMsg.uri, plaintext: newMsg.plaintext.substring(0, 50) });
      
      setMessages((prev) => {
        console.log("[addMessageToState] Current messages count:", prev.length);
        // 중복 체크
        if (prev.some((m) => m.uri === msg.uri)) {
          console.log("[addMessageToState] ✗ Message already exists, skipping");
          return prev;
        }
        const updated = [...prev, newMsg];
        // 시간순으로 정렬
        const sorted = updated.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
        console.log("[addMessageToState] ✓ Message added, new count:", sorted.length);
        
        // 안 읽은 메시지 개수 업데이트 (현재 열려있는 채팅방이 아니면)
        const currentRoomId = roomIdRef.current;
        if (targetRoomId !== currentRoomId) {
          console.log("[addMessageToState] Message in different room, updating unread count");
          setUnreadCounts((prevCounts) => {
            const updated = new Map(prevCounts);
            const currentCount = updated.get(targetRoomId) || 0;
            updated.set(targetRoomId, currentCount + 1);
            console.log(`[addMessageToState] Unread count for ${targetRoomId}: ${currentCount + 1}`);
            return updated;
          });
          
          // 브라우저 알림 표시
          showBrowserNotification(newMsg, targetRoomId).catch((error) => {
            console.error("[addMessageToState] Failed to show notification:", error);
          });
          
          // 채팅방 목록 새로고침 (서버에서 안 읽은 메시지 개수 업데이트)
          if (pds) {
            loadRooms(pds).catch((error) => {
              console.error("[addMessageToState] Failed to reload rooms:", error);
            });
          }
        }
        
        return sorted;
      });
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      console.log("[addMessageToState] ===== Completed =====");
    } catch (error) {
      console.error("[addMessageToState] ✗ Failed to add message to state:", error);
    }
  };

  // 브라우저 알림 표시 함수
  const showBrowserNotification = async (message: any, roomId: string) => {
    // 알림 권한 요청
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if ("Notification" in window && Notification.permission === "granted") {
      // 채팅방 이름 가져오기 (rooms에서 찾기)
      const room = rooms.find((r) => r.room_id === roomId);
      const roomName = room ? room.room_id : roomId;
      
      // 발신자 이름
      const senderName = message.profile?.displayName || message.profile?.handle || message.senderDid;
      
      // 메시지 내용 (복호화된 경우만)
      const messageText = message.decrypted && message.plaintext 
        ? message.plaintext.substring(0, 100) 
        : "새 메시지";
      
      new Notification(`${senderName}`, {
        body: messageText,
        icon: message.profile?.avatar || undefined,
        tag: roomId, // 같은 채팅방 알림은 덮어쓰기
        requireInteraction: false,
      });
      
      console.log(`[Notification] Browser notification shown for room ${roomId}`);
    } else {
      console.log("[Notification] Browser notifications not permitted");
    }
  };

  const loadMessages = async () => {
    if (!pds || !roomId) {
      console.log(`Cannot load messages: pds=${!!pds}, roomId=${roomId}`);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    try {
      console.log(`Loading messages for room: ${roomId}`);
      const msgs = await pds.listRoomMessages(roomId);
      console.log(`Loaded ${msgs.length} messages for room ${roomId}`, msgs);
      
      if (msgs.length === 0) {
        console.log("No messages found. This might be a new room or messages haven't been indexed yet.");
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }
      
      // 복호화 및 프로필 정보 가져오기
      const key = await roomKeyManager.getOrCreateRoomKey(roomId);
      console.log(`Using key for room ${roomId}, key length: ${key.length}`);
      
      const decrypted = await Promise.all(
        msgs.map(async (msg) => {
          // 필수 필드 검증
          if (!msg.ciphertext || !msg.nonce) {
            console.warn(`Message missing ciphertext or nonce:`, msg);
            return {
              ...msg,
              plaintext: "[Invalid message format]",
              decrypted: false,
              profile: { did: msg.senderDid, handle: msg.senderDid },
            };
          }

          try {
            console.log(`Decrypting message from ${msg.senderDid}`, {
              ciphertextLength: msg.ciphertext?.length || 0,
              nonceLength: msg.nonce?.length || 0,
              nonce: msg.nonce?.substring(0, 20),
            });
            
            const plaintext = await decryptMessage(
              msg.ciphertext,
              msg.nonce,
              key
            );
            console.log(`Successfully decrypted message: ${plaintext.substring(0, 50)}...`);
            
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
            console.error(`Decryption failed for message from ${msg.senderDid}:`, error.message || error);
            console.error(`Message details:`, {
              ciphertext: msg.ciphertext?.substring(0, 50),
              nonce: msg.nonce?.substring(0, 20),
              keyLength: key.length,
              error: error.message,
            });
            
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

      // 시간순으로 정렬 (오래된 것부터 최신 순서)
      const sorted = decrypted.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
      
      setMessages(sorted);
      
      // 메시지 로드 후 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Load messages error:", error);
      setMessages([]); // 에러 발생 시 빈 배열로 설정
    } finally {
      setIsLoadingMessages(false);
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
        console.log("Joined room and subscribed to AppView");
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
    setRoomId("");
    gateway?.disconnect();
    setGateway(null);
  };


  const handleStartChat = async (friendDid: string) => {
    if (!pds) return;

    // Room ID 자동 생성
    const myDid = pds.getDid();
    const newRoomId = generateDMRoomId(myDid, friendDid);
    
    await handleSelectRoom(newRoomId);
  };

  const handleSelectRoom = async (selectedRoomId: string) => {
    if (!pds) return;

    setRoomId(selectedRoomId);
    roomIdRef.current = selectedRoomId; // ref도 업데이트
    setCurrentView("chat");

    // Room에 참여 등록
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = "https://bsky.social";
      const myDid = pds.getDid();
      
      // Room에 참여 등록
      const joinResponse = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(selectedRoomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          did: myDid, 
          pdsEndpoint 
        }),
      });

      if (!joinResponse.ok) {
        throw new Error("Failed to join room");
      }

      // Room 참여자 목록 가져오기
      const membersResponse = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(selectedRoomId)}/members`);
      if (membersResponse.ok) {
        const members = await membersResponse.json();
        console.log(`Room members:`, members);
        
        // 모든 참여자의 PDS를 AppView에 구독 (상대방 메시지 감지를 위해)
        for (const member of members) {
          if (member.member_did !== myDid && member.pds_endpoint) {
            try {
              await fetch(`${API_URL}/api/subscribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  did: member.member_did, 
                  pdsEndpoint: member.pds_endpoint 
                }),
              });
              console.log(`Subscribed to ${member.member_did}'s PDS for room ${selectedRoomId}`);
            } catch (error) {
              console.warn(`Failed to subscribe to ${member.member_did}'s PDS:`, error);
            }
          }
        }
      }

      // Gateway는 DID로 구독하므로 roomId 구독 불필요
      // (이미 로그인 시 DID로 구독됨)

      // 채팅방 목록 새로고침
      await loadRooms(pds);
      
      // 메시지는 useEffect에서 자동으로 로드됨
    } catch (error) {
      console.error("Failed to join room:", error);
      alert("채팅방 참여 실패: " + (error as Error).message);
    }
  };

  const handleLeaveRoom = async () => {
    if (!pds || !roomId) return;

    if (!confirm("채팅방에서 나가시겠습니까? 나가면 상대방은 더 이상 당신의 메시지를 조회할 수 없습니다.")) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = pds.getDid();

      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/leave`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to leave room");
      }

      // Gateway 구독 해제
      if (gateway) {
        gateway.unsubscribe(roomId);
      }

      // UI 업데이트
      setRoomId("");
      roomIdRef.current = ""; // ref도 업데이트
      setMessages([]);
      await loadRooms(pds);

      alert("채팅방에서 나갔습니다.");
    } catch (error) {
      console.error("Failed to leave room:", error);
      alert("채팅방 나가기 실패: " + (error as Error).message);
    }
  };

  const handleDeleteMessage = async (recordUri: string) => {
    if (!pds || !confirm("이 메시지를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await pds.deleteMessage(recordUri);
      
      // 메시지 목록에서 제거
      setMessages((prev) => prev.filter((msg) => msg.uri !== recordUri));
      
      // 메시지 목록 새로고침
      await loadMessages();
      
      alert("메시지가 삭제되었습니다.");
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("메시지 삭제 실패: " + (error as Error).message);
    }
  };

  const handleRemoveFriend = async (did: string) => {
    if (!confirm("친구를 삭제하시겠습니까?") || !pds) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = pds.getDid();

      // 서버에서 친구 관계 삭제 (양방향 모두 삭제)
      await fetch(`${API_URL}/api/friends`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did1: myDid,
          did2: did,
        }),
      });

      // 친구 목록 새로고침
      await loadFriends(pds);
    } catch (error) {
      console.error("Failed to remove friend:", error);
      alert("친구 삭제 실패: " + (error as Error).message);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!addFriendInput.trim() || !pds) return;

    try {
      // DID 또는 handle로 친구 신청
      let friendDid = addFriendInput.trim();
      
      // handle인 경우 DID로 변환 시도
      if (!friendDid.startsWith("did:")) {
        try {
          const profile = await pds.getProfile(friendDid);
          friendDid = profile.did;
        } catch (error) {
          console.warn("Could not resolve handle, using as DID:", error);
          alert("유효한 DID 또는 Handle을 입력해주세요.");
          return;
        }
      }

      // 서버에서 친구 목록을 먼저 동기화
      await loadFriends(pds);

      // 이미 친구인지 확인 (서버에서 가져온 친구 목록 기준)
      const isAlreadyFriend = friends.some(f => f.did === friendDid);
      if (isAlreadyFriend) {
        alert("이미 친구 목록에 있습니다.");
        return;
      }

      // 친구 신청 보내기
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDid: pds.getDid(),
          toDid: friendDid,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        // "Already friends" 에러인 경우 친구 목록 새로고침
        if (result.error === "Already friends") {
          await loadFriends(pds);
          alert("이미 친구 목록에 있습니다.");
          return;
        }
        throw new Error(result.error || "Failed to send friend request");
      }

      setAddFriendInput("");
      alert("친구 신청을 보냈습니다.");
      await loadFriendRequests(pds);
    } catch (error) {
      console.error("Send friend request error:", error);
      const errorMessage = (error as Error).message;
      if (errorMessage === "Already friends") {
        await loadFriends(pds);
        alert("이미 친구 목록에 있습니다.");
      } else {
        alert("친구 신청 실패: " + errorMessage);
      }
    }
  };

  const loadRooms = async (adapter: ClientPDSAdapter) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = adapter.getDid();

      const response = await fetch(`${API_URL}/api/rooms?did=${encodeURIComponent(myDid)}`);
      if (response.ok) {
        const serverRooms = await response.json();
        console.log("Loaded rooms:", serverRooms);
        setRooms(serverRooms);
        
        // 서버에서 받은 안 읽은 메시지 개수를 상태에 업데이트
        const unreadMap = new Map<string, number>();
        serverRooms.forEach((room: any) => {
          if (room.unread_count > 0) {
            unreadMap.set(room.room_id, room.unread_count);
          }
        });
        setUnreadCounts(unreadMap);
      } else {
        const errorText = await response.text();
        console.error("Failed to load rooms:", response.status, errorText);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
    }
  };

  const loadFriends = async (adapter: ClientPDSAdapter) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = adapter.getDid();

      // 서버에서 친구 목록 가져오기
      const response = await fetch(`${API_URL}/api/friends?did=${encodeURIComponent(myDid)}`);
      if (response.ok) {
        const serverFriends = await response.json();
        
        // 서버 친구 목록을 프로필 정보와 함께 가져오기
        // 중복 제거를 위해 Set 사용 (같은 DID는 한 번만)
        const seenDids = new Set<string>();
        const friendsWithProfile = await Promise.all(
          serverFriends
            .map((serverFriend: any) => {
              const friendDid = serverFriend.did1 === myDid ? serverFriend.did2 : serverFriend.did1;
              return { friendDid, serverFriend };
            })
            .filter(({ friendDid }) => {
              // 중복 제거
              if (seenDids.has(friendDid)) {
                return false;
              }
              seenDids.add(friendDid);
              return true;
            })
            .map(async ({ friendDid, serverFriend }) => {
              try {
                const profile = await adapter.getProfile(friendDid);
                return {
                  did: profile.did,
                  handle: profile.handle,
                  displayName: profile.displayName,
                  avatar: profile.avatar,
                  addedAt: serverFriend.created_at || new Date().toISOString(),
                } as Friend;
              } catch (error) {
                // 프로필을 가져올 수 없어도 친구로 추가
                return {
                  did: friendDid,
                  addedAt: serverFriend.created_at || new Date().toISOString(),
                } as Friend;
              }
            })
        );
        
        // 친구 목록 업데이트 (서버에서 가져온 데이터만 사용)
        setFriends(friendsWithProfile);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    }
  };

  const loadFriendRequests = async (adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!currentPds) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = currentPds.getDid();

      // 받은 신청과 보낸 신청을 병렬로 가져오기
      const [receivedResponse, sentResponse] = await Promise.all([
        fetch(`${API_URL}/api/friends/requests/received?did=${encodeURIComponent(myDid)}`),
        fetch(`${API_URL}/api/friends/requests/sent?did=${encodeURIComponent(myDid)}`),
      ]);

      // 받은 신청 처리 (프로필 정보는 나중에 필요할 때만 가져오기)
      if (receivedResponse.ok) {
        const received = await receivedResponse.json();
        // 프로필 정보는 나중에 lazy loading (성능 개선)
        setFriendRequests(received);
      }

      // 보낸 신청 처리 (프로필 정보는 나중에 필요할 때만 가져오기)
      if (sentResponse.ok) {
        const sent = await sentResponse.json();
        // 프로필 정보는 나중에 lazy loading (성능 개선)
        setSentRequests(sent);
      }
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    }
  };

  // 프로필 정보를 배치로 가져오기 (성능 개선)
  useEffect(() => {
    if (showRequests && friendRequests.length > 0 && pds) {
      // 프로필 정보가 없는 항목들만 가져오기
      const requestsWithoutProfile = friendRequests.filter(
        (req) => !req.from_handle && !req.from_displayName
      );
      
      if (requestsWithoutProfile.length > 0) {
        // 병렬로 프로필 정보 가져오기
        Promise.all(
          requestsWithoutProfile.map(async (req) => {
            try {
              const profile = await pds.getProfile(req.from_did);
              return {
                id: req.id,
                from_handle: profile.handle,
                from_displayName: profile.displayName,
              };
            } catch (error) {
              return { id: req.id, from_handle: null, from_displayName: null };
            }
          })
        ).then((profiles) => {
          // 상태 업데이트
          setFriendRequests((prev) =>
            prev.map((req) => {
              const profile = profiles.find((p) => p.id === req.id);
              if (profile) {
                return {
                  ...req,
                  from_handle: profile.from_handle || req.from_handle,
                  from_displayName: profile.from_displayName || req.from_displayName,
                };
              }
              return req;
            })
          );
        });
      }
    }
  }, [showRequests, friendRequests.length, pds]);

  useEffect(() => {
    if (showRequests && sentRequests.length > 0 && pds) {
      // 프로필 정보가 없는 항목들만 가져오기
      const requestsWithoutProfile = sentRequests.filter(
        (req) => !req.to_handle && !req.to_displayName
      );
      
      if (requestsWithoutProfile.length > 0) {
        // 병렬로 프로필 정보 가져오기
        Promise.all(
          requestsWithoutProfile.map(async (req) => {
            try {
              const profile = await pds.getProfile(req.to_did);
              return {
                id: req.id,
                to_handle: profile.handle,
                to_displayName: profile.displayName,
              };
            } catch (error) {
              return { id: req.id, to_handle: null, to_displayName: null };
            }
          })
        ).then((profiles) => {
          // 상태 업데이트
          setSentRequests((prev) =>
            prev.map((req) => {
              const profile = profiles.find((p) => p.id === req.id);
              if (profile) {
                return {
                  ...req,
                  to_handle: profile.to_handle || req.to_handle,
                  to_displayName: profile.to_displayName || req.to_displayName,
                };
              }
              return req;
            })
          );
        });
      }
    }
  }, [showRequests, sentRequests.length, pds]);

  const handleAcceptFriendRequest = async (requestId: number, fromDid: string) => {
    if (!pds) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to accept friend request");
      }

      alert("친구 신청을 수락했습니다.");
      // 친구 목록 새로고침 (서버에서 가져오기)
      await loadFriends(pds);
      await loadFriendRequests(pds);
    } catch (error) {
      console.error("Accept friend request error:", error);
      alert("친구 신청 수락 실패: " + (error as Error).message);
    }
  };

  const handleRejectFriendRequest = async (requestId: number) => {
    if (!pds) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to reject friend request");
      }

      alert("친구 신청을 거절했습니다.");
      await loadFriendRequests(pds);
    } catch (error) {
      console.error("Reject friend request error:", error);
      alert("친구 신청 거절 실패: " + (error as Error).message);
    }
  };

  const handleCancelFriendRequest = async (requestId: number) => {
    if (!confirm("친구 신청을 취소하시겠습니까?") || !pds) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel friend request");
      }

      alert("친구 신청을 취소했습니다.");
      await loadFriendRequests(pds);
    } catch (error) {
      console.error("Cancel friend request error:", error);
      alert("친구 신청 취소 실패: " + (error as Error).message);
    }
  };

  // 로딩 중일 때는 아무것도 표시하지 않음 (로그인 페이지 깜빡임 방지)
  if (isLoading) {
    return (
      <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto", textAlign: "center" }}>
        <p>로딩 중...</p>
      </div>
    );
  }

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
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "2rem" }}>
      {/* 사이드바 */}
      <div style={{ width: "250px", borderRight: "1px solid #ccc", paddingRight: "1rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>NodeTalk</h2>
          <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
            {profile?.displayName || profile?.handle || pds?.getDid()}
            {profile?.handle && ` (@${profile.handle})`}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setCurrentView("friends")}
            style={{
              padding: "0.75rem",
              backgroundColor: currentView === "friends" ? "#0070f3" : "#f5f5f5",
              color: currentView === "friends" ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
            }}
          >
            친구 목록
            {friendRequests.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "0.25rem",
                  right: "0.5rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {friendRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView("chat")}
            style={{
              padding: "0.75rem",
              backgroundColor: currentView === "chat" ? "#0070f3" : "#f5f5f5",
              color: currentView === "chat" ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            채팅
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            style={{
              padding: "0.5rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {showProfile ? "프로필 닫기" : "프로필 편집"}
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ flex: 1 }}>

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
            <h2 style={{ marginTop: 0 }}>프로필 편집</h2>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                표시 이름
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
                설명
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
              저장
            </button>
          </div>
        )}

        {currentView === "friends" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0 }}>친구 목록</h2>
              <button
                onClick={() => {
                  setShowRequests(!showRequests);
                  if (!showRequests && pds) {
                    loadFriendRequests(pds);
                  }
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: showRequests ? "#0070f3" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {showRequests ? "친구 목록 보기" : "신청 목록 보기"}
              </button>
            </div>

            {showRequests ? (
              <div>
                {/* 받은 친구 신청 */}
                <div style={{ marginBottom: "2rem" }}>
                  <h3>받은 친구 신청 ({friendRequests.length})</h3>
                  {friendRequests.length === 0 ? (
                    <p style={{ color: "#666" }}>받은 친구 신청이 없습니다.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {friendRequests.map((request) => (
                        <div
                          key={request.id}
                          style={{
                            padding: "1rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {request.from_displayName || request.from_handle || request.from_did}
                            </div>
                            {request.from_handle && (
                              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                @{request.from_handle}
                              </div>
                            )}
                            <div style={{ fontSize: "0.8rem", color: "#999" }}>
                              {request.from_did}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleAcceptFriendRequest(request.id, request.from_did)}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              수락
                            </button>
                            <button
                              onClick={() => handleRejectFriendRequest(request.id)}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              거절
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 보낸 친구 신청 */}
                <div>
                  <h3>보낸 친구 신청 ({sentRequests.length})</h3>
                  {sentRequests.length === 0 ? (
                    <p style={{ color: "#666" }}>보낸 친구 신청이 없습니다.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          style={{
                            padding: "1rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {request.to_displayName || request.to_handle || request.to_did}
                            </div>
                            {request.to_handle && (
                              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                                @{request.to_handle}
                              </div>
                            )}
                            <div style={{ fontSize: "0.8rem", color: "#999" }}>
                              {request.to_did}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.25rem" }}>
                              대기 중...
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => handleCancelFriendRequest(request.id)}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* 친구 신청 보내기 */}
                <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <h3 style={{ marginTop: 0 }}>친구 신청 보내기</h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      value={addFriendInput}
                      onChange={(e) => setAddFriendInput(e.target.value)}
                      placeholder="DID 또는 Handle 입력"
                      onKeyPress={(e) => e.key === "Enter" && handleSendFriendRequest()}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                      }}
                    />
                    <button
                      onClick={handleSendFriendRequest}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      신청
                    </button>
                  </div>
                </div>

            {/* 친구 목록 */}
            <div>
              <h3>친구 ({friends.length})</h3>
              {friends.length === 0 ? (
                <p style={{ color: "#666" }}>친구가 없습니다. 위에서 친구를 추가하세요.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {friends.map((friend) => (
                    <div
                      key={friend.did}
                      style={{
                        padding: "1rem",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold" }}>
                          {friend.displayName || friend.handle || friend.did}
                        </div>
                        {friend.handle && (
                          <div style={{ fontSize: "0.9rem", color: "#666" }}>
                            @{friend.handle}
                          </div>
                        )}
                        <div style={{ fontSize: "0.8rem", color: "#999" }}>
                          {friend.did}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleStartChat(friend.did)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#0070f3",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          채팅
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.did)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        {currentView === "chat" && (
          <div>
            <h2 style={{ marginTop: 0 }}>채팅</h2>
            
            {!roomId && (
              <div style={{ marginBottom: "2rem" }}>
                <h3>채팅방 목록</h3>
                {rooms.length === 0 ? (
                  <p style={{ color: "#666" }}>채팅방이 없습니다. 친구 목록에서 친구를 선택하여 채팅을 시작하세요.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {rooms.map((room) => (
                      <div
                        key={room.room_id}
                        onClick={() => handleSelectRoom(room.room_id)}
                        style={{
                          padding: "1rem",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          cursor: "pointer",
                          backgroundColor: roomId === room.room_id ? "#e3f2fd" : "#fff",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                              {room.room_id}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "#666" }}>
                              참여자: {room.member_count}명
                            </div>
                            {room.last_message_at && (
                              <div style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.25rem" }}>
                                마지막 메시지: {new Date(room.last_message_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                          {unreadCounts.get(room.room_id) > 0 && (
                            <span
                              style={{
                                backgroundColor: "#dc3545",
                                color: "white",
                                borderRadius: "50%",
                                minWidth: "24px",
                                height: "24px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                padding: "0 0.5rem",
                              }}
                            >
                              {unreadCounts.get(room.room_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {roomId && (
              <div style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#e3f2fd", borderRadius: "4px" }}>
                <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.5rem" }}>
                  현재 채팅방: {roomId}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setRoomId("");
                      roomIdRef.current = ""; // ref도 업데이트
                      setMessages([]);
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    채팅방 목록으로
                  </button>
                  <button
                    onClick={handleLeaveRoom}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    채팅방 나가기
                  </button>
                </div>
              </div>
            )}

            {roomId && (
              <>
                <div
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "1rem",
                    minHeight: "400px",
                    maxHeight: "500px",
                    overflowY: "auto",
                    marginBottom: "1rem",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {isLoadingMessages ? (
                    <p style={{ color: "#666", margin: "auto" }}>메시지 내용 불러오는 중...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: "#666", margin: "auto" }}>메시지가 없습니다.</p>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const isMyMessage = msg.senderDid === pds?.getDid();
                        return (
                          <div
                            key={msg.uri || idx}
                            style={{
                              padding: "0.75rem",
                              marginBottom: "0.5rem",
                              borderRadius: "12px",
                              maxWidth: "70%",
                              alignSelf: isMyMessage ? "flex-end" : "flex-start",
                              backgroundColor: isMyMessage ? "#0070f3" : "#f0f0f0",
                              color: isMyMessage ? "white" : "#333",
                              marginLeft: isMyMessage ? "auto" : "0",
                              marginRight: isMyMessage ? "0" : "auto",
                            }}
                          >
                            {!isMyMessage && (
                              <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "0.25rem", opacity: 0.8 }}>
                                {msg.profile?.displayName || msg.profile?.handle || msg.senderDid || "Unknown"}
                              </div>
                            )}
                            <div style={{ 
                              fontSize: "0.9rem",
                              wordBreak: "break-word",
                              color: isMyMessage ? "white" : (msg.decrypted ? "#000" : "#f44336"),
                              fontStyle: msg.decrypted ? "normal" : "italic"
                            }}>
                              {msg.plaintext}
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              marginTop: "0.25rem",
                              fontSize: "0.7rem",
                              opacity: 0.7
                            }}>
                              <div>
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </div>
                              {isMyMessage && msg.uri && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.uri)}
                                  style={{
                                    padding: "0.15rem 0.4rem",
                                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.7rem",
                                    marginLeft: "0.5rem",
                                  }}
                                  title="메시지 삭제"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="메시지를 입력하세요..."
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
                    전송
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

