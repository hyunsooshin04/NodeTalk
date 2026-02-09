import { useState, useEffect } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import type { Friend } from "@/lib/friends";

export function useFriends(pds: ClientPDSAdapter | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addFriendInput, setAddFriendInput] = useState("");
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  const loadFriends = async (adapter: ClientPDSAdapter) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const myDid = adapter.getDid();

      const response = await fetch(`${API_URL}/api/friends?did=${encodeURIComponent(myDid)}`);
      if (response.ok) {
        const serverFriends = await response.json();
        
        const seenDids = new Set<string>();
        const friendsWithProfile = await Promise.all(
          serverFriends
            .map((serverFriend: any) => {
              const friendDid = serverFriend.did1 === myDid ? serverFriend.did2 : serverFriend.did1;
              return { friendDid, serverFriend };
            })
            .filter(({ friendDid }) => {
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
                return {
                  did: friendDid,
                  addedAt: serverFriend.created_at || new Date().toISOString(),
                } as Friend;
              }
            })
        );
        
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

      const [receivedResponse, sentResponse] = await Promise.all([
        fetch(`${API_URL}/api/friends/requests/received?did=${encodeURIComponent(myDid)}`),
        fetch(`${API_URL}/api/friends/requests/sent?did=${encodeURIComponent(myDid)}`),
      ]);

      if (receivedResponse.ok) {
        const received = await receivedResponse.json();
        setFriendRequests(received);
      }

      if (sentResponse.ok) {
        const sent = await sentResponse.json();
        setSentRequests(sent);
      }
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    }
  };

  useEffect(() => {
    if (showRequests && friendRequests.length > 0 && pds) {
      const requestsWithoutProfile = friendRequests.filter(
        (req) => !req.from_handle && !req.from_displayName
      );
      
      if (requestsWithoutProfile.length > 0) {
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
      const requestsWithoutProfile = sentRequests.filter(
        (req) => !req.to_handle && !req.to_displayName
      );
      
      if (requestsWithoutProfile.length > 0) {
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

  const handleSendFriendRequest = async (adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!currentPds || !addFriendInput.trim()) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDid: currentPds.getDid(),
          toDid: addFriendInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send friend request`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to send friend request");
      }

      alert("친구 신청을 보냈습니다.");
      setAddFriendInput("");
      await loadFriendRequests(currentPds);
    } catch (error) {
      console.error("Send friend request error:", error);
      const errorMessage = (error as Error).message;
      if (errorMessage === "Already friends") {
        await loadFriends(currentPds);
        alert("이미 친구 목록에 있습니다.");
      } else {
        alert("친구 신청 실패: " + errorMessage);
      }
    }
  };

  const handleAcceptFriendRequest = async (requestId: number, fromDid: string, adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!currentPds) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to accept friend request`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to accept friend request");
      }

      alert("친구 신청을 수락했습니다.");
      await loadFriends(currentPds);
      await loadFriendRequests(currentPds);
    } catch (error) {
      console.error("Accept friend request error:", error);
      alert("친구 신청 수락 실패: " + (error as Error).message);
    }
  };

  const handleRejectFriendRequest = async (requestId: number, adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!currentPds) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to reject friend request`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to reject friend request");
      }

      alert("친구 신청을 거절했습니다.");
      await loadFriendRequests(currentPds);
    } catch (error) {
      console.error("Reject friend request error:", error);
      alert("친구 신청 거절 실패: " + (error as Error).message);
    }
  };

  const handleCancelFriendRequest = async (requestId: number, adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!confirm("친구 신청을 취소하시겠습니까?") || !currentPds) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends/request/${requestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to cancel friend request`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel friend request");
      }

      alert("친구 신청을 취소했습니다.");
      await loadFriendRequests(currentPds);
    } catch (error) {
      console.error("Cancel friend request error:", error);
      alert("친구 신청 취소 실패: " + (error as Error).message);
    }
  };

  const handleRemoveFriend = async (did: string, adapter?: ClientPDSAdapter) => {
    const currentPds = adapter || pds;
    if (!confirm("친구를 삭제하시겠습니까?") || !currentPds) {
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/friends`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did1: currentPds.getDid(),
          did2: did,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to remove friend`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to remove friend");
      }

      alert("친구를 삭제했습니다.");
      await loadFriends(currentPds);
    } catch (error) {
      console.error("Remove friend error:", error);
      alert("친구 삭제 실패: " + (error as Error).message);
    }
  };

  return {
    friends,
    addFriendInput,
    friendRequests,
    sentRequests,
    showRequests,
    setFriends,
    setAddFriendInput,
    setFriendRequests,
    setSentRequests,
    setShowRequests,
    loadFriends,
    loadFriendRequests,
    handleSendFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handleCancelFriendRequest,
    handleRemoveFriend,
  };
}

