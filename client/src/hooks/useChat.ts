import { useState, useRef, useEffect } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import { RoomKeyManager } from "@/lib/room";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

interface UseChatProps {
  pds: ClientPDSAdapter | null;
  roomKeyManager: RoomKeyManager;
  roomId: string;
  roomIdRef: React.MutableRefObject<string>;
  profile: any;
  rooms: any[];
  roomNames: Map<string, string>;
  unreadCounts: Map<string, number>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  loadRooms: (adapter: ClientPDSAdapter) => Promise<void>;
  updateLastReadMessage: (targetRoomId: string) => Promise<void>;
}

export function useChat({ 
  pds, 
  roomKeyManager, 
  roomId, 
  roomIdRef,
  profile,
  rooms,
  roomNames,
  unreadCounts,
  setUnreadCounts,
  loadRooms,
  updateLastReadMessage,
}: UseChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // roomId가 변경되면 메시지 자동 로드
  useEffect(() => {
    roomIdRef.current = roomId;
    if (roomId && pds) {
      console.log(`Room ID changed to ${roomId}, loading messages...`);
      setMessages([]);
      loadMessages().then(() => {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 200);
        if (updateLastReadMessage) {
          updateLastReadMessage(roomId);
        }
      });
    }
  }, [roomId, pds]);

  const loadMessages = async () => {
    if (!pds || !roomId) return;
    
    setIsLoadingMessages(true);
    try {
      const allMessages = await pds.listRoomMessages(roomId, 100);
      
      if (allMessages.length === 0) {
        setMessages([]);
        return;
      }

      const key = await roomKeyManager.getOrCreateRoomKey(roomId);
      
      const decrypted = await Promise.all(
        allMessages.map(async (msg) => {
          try {
            const plaintext = await decryptMessage(msg.ciphertext, msg.nonce, key);
            
            // 서버에서 프로필 정보 가져오기
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            let profile: any = { did: msg.senderDid, handle: msg.senderDid };
            
            try {
              const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(msg.senderDid)}`);
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.success && profileData.profile) {
                  profile = {
                    did: msg.senderDid,
                    displayName: profileData.profile.displayName || null,
                    description: profileData.profile.description || null,
                    avatarUrl: profileData.profile.avatarUrl || null,
                    handle: null,
                  };
                }
              }
            } catch (error) {
              console.warn("Failed to load profile from server:", error);
            }
            
            // PDS에서 프로필 정보 가져오기 (handle 등 추가 정보)
            try {
              const pdsProfile = await pds.getProfile(msg.senderDid);
              profile = {
                ...profile,
                did: msg.senderDid,
                handle: pdsProfile.handle || profile.handle || null,
                displayName: profile.displayName || pdsProfile.displayName || null,
                description: profile.description || pdsProfile.description || null,
                avatarUrl: profile.avatarUrl || pdsProfile.avatar || null,
              };
            } catch (error) {
              console.warn("Failed to get profile from PDS:", error);
            }
            
            const result = {
              ...msg,
              plaintext,
              decrypted: true,
              profile,
            };
            // 디버깅: files 배열 확인
            if (msg.files && msg.files.length > 0) {
              console.log(`[useChat] Loaded message with ${msg.files.length} files:`, msg.uri, msg.files);
            }
            return result;
          } catch (error) {
            // 서버에서 프로필 정보 가져오기
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            let profile: any = { did: msg.senderDid, handle: msg.senderDid };
            
            try {
              const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(msg.senderDid)}`);
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.success && profileData.profile) {
                  profile = {
                    did: msg.senderDid,
                    displayName: profileData.profile.displayName || null,
                    description: profileData.profile.description || null,
                    avatarUrl: profileData.profile.avatarUrl || null,
                    handle: null,
                  };
                }
              }
            } catch (error) {
              console.warn("Failed to load profile from server:", error);
            }
            
            // PDS에서 프로필 정보 가져오기
            try {
              const pdsProfile = await pds.getProfile(msg.senderDid);
              profile = {
                ...profile,
                did: msg.senderDid,
                handle: pdsProfile.handle || profile.handle || null,
                displayName: profile.displayName || pdsProfile.displayName || null,
                description: profile.description || pdsProfile.description || null,
                avatarUrl: profile.avatarUrl || pdsProfile.avatar || null,
              };
            } catch (error) {
              console.warn("Failed to get profile from PDS:", error);
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

      const sorted = decrypted.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
      
      setMessages(sorted);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Load messages error:", error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const removeMessagesBySender = (senderDid: string) => {
    setMessages((prev) => prev.filter((msg) => msg.senderDid !== senderDid));
  };

  const updateProfileInMessages = async (updatedDid: string, profileData: { displayName?: string; description?: string; avatarUrl?: string }, pdsAdapter?: ClientPDSAdapter) => {
    const currentPds = pdsAdapter || pds;
    if (!currentPds) return;

    try {
      // 서버에서 최신 프로필 정보 가져오기
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/profile/${encodeURIComponent(updatedDid)}`);
      
      let updatedProfile: any = null;
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          updatedProfile = {
            did: updatedDid,
            displayName: data.profile.displayName || null,
            description: data.profile.description || null,
            avatarUrl: data.profile.avatarUrl || null,
            handle: null, // 서버 프로필에는 handle이 없을 수 있음
          };
        }
      }

      // PDS에서도 프로필 정보 가져오기 (handle 등 추가 정보)
      try {
        const pdsProfile = await currentPds.getProfile(updatedDid);
        updatedProfile = {
          ...updatedProfile,
          did: updatedDid,
          handle: pdsProfile.handle || updatedProfile?.handle || null,
          displayName: updatedProfile?.displayName || pdsProfile.displayName || null,
          description: updatedProfile?.description || pdsProfile.description || null,
          avatarUrl: updatedProfile?.avatarUrl || pdsProfile.avatar || null,
        };
      } catch (error) {
        console.warn("Failed to get profile from PDS:", error);
        // PDS 실패 시 서버 프로필만 사용
        if (!updatedProfile) {
          updatedProfile = {
            did: updatedDid,
            displayName: profileData.displayName || null,
            description: profileData.description || null,
            avatarUrl: profileData.avatarUrl || null,
            handle: null,
          };
        }
      }

      // 메시지 목록에서 해당 사용자의 프로필 정보 업데이트
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.senderDid === updatedDid) {
            return {
              ...msg,
              profile: updatedProfile || msg.profile,
            };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error("Failed to update profile in messages:", error);
    }
  };

  const addMessageToState = async (msg: any, targetRoomId: string, pdsAdapter?: ClientPDSAdapter) => {
    const currentPds = pdsAdapter || pds;
    if (!currentPds || !targetRoomId) return;

    try {
      const key = await roomKeyManager.getOrCreateRoomKey(targetRoomId);

      if (!msg.ciphertext || !msg.nonce) {
        const newMsg = {
          ...msg,
          plaintext: "[Invalid message format]",
          decrypted: false,
          profile: { did: msg.senderDid, handle: msg.senderDid },
        };
        setMessages((prev) => {
          if (prev.some((m) => m.uri === msg.uri)) return prev;
          const updated = [...prev, newMsg];
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
        plaintext = await decryptMessage(msg.ciphertext, msg.nonce, key);
        decrypted = true;
      } catch (error: any) {
        console.error(`Decryption failed for message from ${msg.senderDid}:`, error.message || error);
        plaintext = "[Decryption failed]";
        decrypted = false;
      }

      // 서버에서 프로필 정보 가져오기
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      let profile: any = { did: msg.senderDid, handle: msg.senderDid };
      
      try {
        const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(msg.senderDid)}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.profile) {
            profile = {
              did: msg.senderDid,
              displayName: profileData.profile.displayName || null,
              description: profileData.profile.description || null,
              avatarUrl: profileData.profile.avatarUrl || null,
              handle: null,
            };
          }
        }
      } catch (error) {
        console.warn("Failed to load profile from server:", error);
      }
      
      // PDS에서 프로필 정보 가져오기 (handle 등 추가 정보)
      try {
        const pdsProfile = await currentPds.getProfile(msg.senderDid);
        profile = {
          ...profile,
          did: msg.senderDid,
          handle: pdsProfile.handle || profile.handle || null,
          displayName: profile.displayName || pdsProfile.displayName || null,
          description: profile.description || pdsProfile.description || null,
          avatarUrl: profile.avatarUrl || pdsProfile.avatar || null,
        };
      } catch (error) {
        console.warn(`Failed to get profile for ${msg.senderDid}:`, error);
      }

      const newMsg = {
        ...msg,
        plaintext,
        decrypted,
        profile,
      };
      
      // 디버깅: files 배열 확인
      if (msg.files && msg.files.length > 0) {
        console.log(`[useChat] Adding message to state with ${msg.files.length} files:`, msg.uri, msg.files);
      }

      setMessages((prev) => {
        if (prev.some((m) => m.uri === msg.uri)) return prev;
        const updated = [...prev, newMsg];
        const sorted = updated.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
        
        const currentRoomId = roomIdRef.current;
        if (targetRoomId !== currentRoomId) {
          setUnreadCounts((prevCounts) => {
            const updated = new Map(prevCounts);
            const currentCount = updated.get(targetRoomId) || 0;
            updated.set(targetRoomId, currentCount + 1);
            return updated;
          });
          
          showBrowserNotification(newMsg, targetRoomId).catch(() => {});
          
          if (pds) {
            loadRooms(pds).catch(() => {});
          }
        }
        
        return sorted;
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Failed to add message to state:", error);
    }
  };

  const uploadFile = async (file: File): Promise<{ fileUrl: string; fileName: string; mimeType: string }> => {
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
      fileName: result.fileName,
      mimeType: result.mimeType,
    };
  };

  const handleSendMessage = async (files?: Array<{ fileUrl: string; fileName: string; mimeType: string }>) => {
    if (!pds || !roomId || (!message.trim() && (!files || files.length === 0))) return;

    try {
      const key = await roomKeyManager.getOrCreateRoomKey(roomId);
      // 메시지가 있으면 그대로 사용, 없으면 파일만 전송 (빈 메시지)
      const messageText = message.trim() || "";
      const { ciphertext, nonce } = await encryptMessage(messageText, key);
      const recordUri = await pds.sendMessage(roomId, ciphertext, nonce, files);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = "https://bsky.social";
      const myDid = pds.getDid();
      
      await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid, pdsEndpoint }),
      }).catch(() => {});

      await fetch(`${API_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid, pdsEndpoint }),
      }).catch(() => {});

      const now = new Date().toISOString();
      
      await fetch(`${API_URL}/api/messages/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordUri,
          senderDid: myDid,
          roomId,
          ciphertext,
          nonce,
          createdAt: now,
          ...(files && files.length > 0 && { files }),
          // 하위 호환성
          ...(files && files.length === 1 && {
            fileUrl: files[0].fileUrl,
            fileName: files[0].fileName,
            mimeType: files[0].mimeType,
          }),
        }),
      });

      const myProfile = profile || await pds.getProfile(myDid).catch(() => ({ did: myDid, handle: myDid }));
      const newMsg = {
        uri: recordUri,
        senderDid: myDid,
        roomId,
        createdAt: now,
        ciphertext,
        nonce,
        plaintext: messageText,
        decrypted: true,
        profile: myProfile,
        ...(files && files.length > 0 && { files }),
        // 하위 호환성
        ...(files && files.length === 1 && {
          fileUrl: files[0].fileUrl,
          fileName: files[0].fileName,
          mimeType: files[0].mimeType,
        }),
      };

      setMessages((prev) => {
        const updated = [...prev, newMsg];
        return updated.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
      });

      await loadRooms(pds);
      setMessage("");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Send message error:", error);
      alert("메시지 전송 실패: " + (error as Error).message);
    }
  };

  const showBrowserNotification = async (message: any, targetRoomId: string) => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if ("Notification" in window && Notification.permission === "granted") {
      const room = rooms.find((r) => r.room_id === targetRoomId);
      const roomName = room ? (roomNames.get(room.room_id) || room.room_id) : (roomNames.get(targetRoomId) || targetRoomId);
      const senderName = message.profile?.displayName || message.profile?.handle || message.senderDid;
      const messageText = message.decrypted && message.plaintext 
        ? message.plaintext.substring(0, 100) 
        : "새 메시지";
      
      new Notification(`${senderName}`, {
        body: messageText,
        icon: message.profile?.avatar || undefined,
        tag: targetRoomId,
        requireInteraction: false,
      });
    }
  };

  const handleDeleteMessage = async (recordUri: string) => {
    if (!pds || !confirm("메시지를 삭제하시겠습니까?")) return;

    try {
      await pds.deleteMessage(recordUri);
      setMessages((prev) => prev.filter((msg) => msg.uri !== recordUri));
    } catch (error) {
      console.error("Delete message error:", error);
      alert("메시지 삭제 실패: " + (error as Error).message);
    }
  };

  return {
    message,
    messages,
    isLoadingMessages,
    messagesEndRef,
    setMessage,
    setMessages,
    loadMessages,
    addMessageToState,
    removeMessagesBySender,
    updateProfileInMessages,
    uploadFile,
    handleSendMessage,
    handleDeleteMessage,
  };
}

