/**
 * NodeTalk 공통 타입 정의
 */

export interface MessageRecord {
  $type: string;
  roomId: string;
  ciphertext: string;
  nonce: string;
  createdAt: string;
}

export interface MessageRef {
  roomId: string;
  recordUri: string;
  senderDid: string;
  createdAt: string;
}

export interface RoomKey {
  roomId: string;
  key: Uint8Array;
  createdAt: string;
}

export interface PushNotification {
  type: "new_message" | "friend_request" | "friend_accepted" | "friend_removed" | "member_left" | "member_joined";
  roomId?: string;
  recordUri?: string;
  fromDid?: string;
  toDid?: string;
  requestId?: number;
  friendDid?: string;
  memberDid?: string; // 나간/들어온 멤버의 DID
  // 메시지 내용 (PDS 조회 없이 바로 사용)
  messageContent?: {
    senderDid: string;
    ciphertext: string;
    nonce: string;
    createdAt: string;
  };
}

export interface PDSConfig {
  endpoint: string;
  did: string;
  handle?: string;
}
