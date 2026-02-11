import { useState } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import { isDMRoom, generateDMRoomId } from "@/lib/rooms";

export function useRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [roomNames, setRoomNames] = useState<Map<string, string>>(new Map());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<Set<string>>(new Set());

  const handleSelectRoom = async (selectedRoomId: string, pds: ClientPDSAdapter | null) => {
    if (!pds) return;

    setRoomId(selectedRoomId);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = "https://bsky.social";
      const myDid = pds.getDid();
      
      await fetch(`${API_URL}/api/rooms/${encodeURIComponent(selectedRoomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid, pdsEndpoint }),
      });

      const membersResponse = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(selectedRoomId)}/members`);
      if (membersResponse.ok) {
        const members = await membersResponse.json();
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
            } catch (error) {
              console.warn(`Failed to subscribe to ${member.member_did}'s PDS:`, error);
            }
          }
        }
      }

      await loadRooms(pds);
    } catch (error) {
      console.error("Failed to join room:", error);
      alert("채팅방 참여 실패: " + (error as Error).message);
    }
  };

  const handleLeaveRoom = async (pds: ClientPDSAdapter | null, currentRoomId: string, gateway: any) => {
    if (!pds || !currentRoomId) return;

    if (!confirm("채팅방에서 나가시겠습니까? 나가면 상대방은 더 이상 당신의 메시지를 조회할 수 없습니다.")) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = pds.getDid();

      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(currentRoomId)}/leave`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: myDid }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to leave room");
      }

      if (gateway) {
        gateway.unsubscribe(currentRoomId);
      }

      setRoomId("");
      await loadRooms(pds);
      alert("채팅방에서 나갔습니다.");
    } catch (error) {
      console.error("Failed to leave room:", error);
      alert("채팅방 나가기 실패: " + (error as Error).message);
    }
  };

  const handleStartChat = async (friendDid: string, pds: ClientPDSAdapter | null) => {
    if (!pds) return;
    const myDid = pds.getDid();
    const newRoomId = generateDMRoomId(myDid, friendDid);
    await handleSelectRoom(newRoomId, pds);
  };

  const handleInviteToRoom = async (roomId: string, friendDid: string, pds: ClientPDSAdapter | null) => {
    if (!pds || !roomId || !friendDid) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = "https://bsky.social";
      
      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: friendDid, pdsEndpoint }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to invite user`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to invite user");
      }

      // PDS 구독
      try {
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: friendDid, 
            pdsEndpoint: pdsEndpoint 
          }),
        });
      } catch (error) {
        console.warn(`Failed to subscribe to ${friendDid}'s PDS:`, error);
      }

      await loadRooms(pds);
      return true;
    } catch (error) {
      console.error("Failed to invite user to room:", error);
      throw error;
    }
  };

  const getRoomDisplayName = async (room: any, adapter: ClientPDSAdapter): Promise<string> => {
    if (!adapter) return room.room_id;
    
    const myDid = adapter.getDid();
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const membersResponse = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(room.room_id)}/members`);
      if (!membersResponse.ok) {
        return room.room_id;
      }
      
      const members = await membersResponse.json();
      const otherMembers = members.filter((m: any) => m.member_did !== myDid);
      
      if (otherMembers.length === 0) {
        return "나만의 채팅방";
      }
      
      if (isDMRoom(room.room_id) && otherMembers.length === 1) {
        try {
          // 서버에서 프로필 정보 가져오기
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          let displayName = null;
          try {
            const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(otherMembers[0].member_did)}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success && profileData.profile) {
                displayName = profileData.profile.displayName;
              }
            }
          } catch (error) {
            console.warn("Failed to load profile from server:", error);
          }
          
          // PDS에서 프로필 정보 가져오기
          const profile = await adapter.getProfile(otherMembers[0].member_did);
          return displayName || profile.displayName || profile.handle || otherMembers[0].member_did;
        } catch (error) {
          return otherMembers[0].member_did;
        }
      }
      
      const memberNames: string[] = [];
      for (const member of otherMembers.slice(0, 3)) {
        try {
          // 서버에서 프로필 정보 가져오기
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          let displayName = null;
          try {
            const profileResponse = await fetch(`${API_URL}/api/profile/${encodeURIComponent(member.member_did)}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success && profileData.profile) {
                displayName = profileData.profile.displayName;
              }
            }
          } catch (error) {
            console.warn("Failed to load profile from server:", error);
          }
          
          // PDS에서 프로필 정보 가져오기
          const profile = await adapter.getProfile(member.member_did);
          memberNames.push(displayName || profile.displayName || profile.handle || member.member_did);
        } catch (error) {
          memberNames.push(member.member_did);
        }
      }
      
      if (otherMembers.length <= 3) {
        return memberNames.join(", ");
      } else {
        return `${memberNames.join(", ")} 외 ${otherMembers.length - 3}명`;
      }
    } catch (error) {
      console.error("Failed to get room display name:", error);
      return room.room_id;
    }
  };

  const loadRooms = async (adapter: ClientPDSAdapter) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = adapter.getDid();

      const response = await fetch(`${API_URL}/api/rooms?did=${encodeURIComponent(myDid)}`);
      if (response.ok) {
        const serverRooms = await response.json();
        setRooms(serverRooms);
        
        const unreadMap = new Map<string, number>();
        serverRooms.forEach((room: any) => {
          if (room.unread_count > 0) {
            unreadMap.set(room.room_id, room.unread_count);
          }
        });
        setUnreadCounts(unreadMap);
        
        const namePromises = serverRooms.map(async (room: any) => {
          const name = await getRoomDisplayName(room, adapter);
          return { roomId: room.room_id, name };
        });
        
        const roomNamesArray = await Promise.all(namePromises);
        const nameMap = new Map<string, string>();
        roomNamesArray.forEach(({ roomId, name }) => {
          nameMap.set(roomId, name);
        });
        setRoomNames(nameMap);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
    }
  };

  return {
    rooms,
    roomId,
    unreadCounts,
    roomNames,
    showCreateGroup,
    selectedFriendsForGroup,
    setRooms,
    setRoomId,
    setUnreadCounts,
    setRoomNames,
    setShowCreateGroup,
    setSelectedFriendsForGroup,
    loadRooms,
    getRoomDisplayName,
    handleSelectRoom,
    handleLeaveRoom,
    handleStartChat,
    handleInviteToRoom,
  };
}

