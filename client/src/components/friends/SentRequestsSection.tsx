"use client";
import SentRequestItem from "./SentRequestItem";

interface SentRequestsSectionProps {
  sentRequests: any[];
  onCancelFriendRequest: (requestId: number) => void;
}

export default function SentRequestsSection({
  sentRequests,
  onCancelFriendRequest,
}: SentRequestsSectionProps) {
  if (sentRequests.length === 0) return null;

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
        보낸 친구 신청 ({sentRequests.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sentRequests.map((request) => (
          <SentRequestItem
            key={request.id}
            request={request}
            onCancel={onCancelFriendRequest}
          />
        ))}
      </div>
    </div>
  );
}

