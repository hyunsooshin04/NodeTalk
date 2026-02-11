"use client";
import FriendRequestItem from "./FriendRequestItem";

interface ReceivedRequestsSectionProps {
  friendRequests: any[];
  onAcceptFriendRequest: (requestId: number, fromDid: string) => void;
  onRejectFriendRequest: (requestId: number) => void;
  onSelectRequest?: (request: any) => void;
}

export default function ReceivedRequestsSection({
  friendRequests,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onSelectRequest,
}: ReceivedRequestsSectionProps) {
  if (friendRequests.length === 0) return null;

  return (
    <div>
      <h3 style={{ 
        fontSize: "0.875rem", 
        fontWeight: 600, 
        color: "rgba(255, 255, 255, 0.7)", 
        marginBottom: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
        받은 친구 신청 ({friendRequests.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {friendRequests.map((request) => (
          <FriendRequestItem
            key={request.id}
            request={request}
            onAccept={onAcceptFriendRequest}
            onReject={onRejectFriendRequest}
            onSelect={onSelectRequest}
          />
        ))}
      </div>
    </div>
  );
}

