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
            const profile = await pds.getProfile(msg.senderDid);
            return {
              ...msg,
              plaintext,
              decrypted: true,
              profile,
            };
          } catch (error) {
            const profile = await pds.getProfile(msg.senderDid).catch(() => ({ did: msg.senderDid, handle: msg.senderDid }));
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

      let profile = { did: msg.senderDid, handle: msg.senderDid };
      try {
        profile = await currentPds.getProfile(msg.senderDid);
      } catch (error) {
        console.warn(`Failed to get profile for ${msg.senderDid}:`, error);
      }

      const newMsg = {
        ...msg,
        plaintext,
        decrypted,
        profile,
      };

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

  const handleSendMessage = async () => {
    if (!pds || !roomId || !message.trim()) return;

    try {
      const key = await roomKeyManager.getOrCreateRoomKey(roomId);
      const { ciphertext, nonce } = await encryptMessage(message, key);
      const recordUri = await pds.sendMessage(roomId, ciphertext, nonce);

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
        plaintext: message,
        decrypted: true,
        profile: myProfile,
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
    handleSendMessage,
    handleDeleteMessage,
  };
}

