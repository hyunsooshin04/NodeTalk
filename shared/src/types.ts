/**
 * NodeTalk 공통 타입 정의
 */

export interface MessageRecord {
  $type: string;
  roomId: string;
  ciphertext: string;
  nonce: string;
  createdAt: string;
  fileUrl?: string; // 파일 URL (하위 호환성, 단일 파일)
  fileName?: string; // 원본 파일명 (하위 호환성)
  mimeType?: string; // MIME 타입 (하위 호환성)
  files?: Array<{ // 여러 파일 첨부
    fileUrl: string;
    fileName: string;
    mimeType: string;
  }>;
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
  type: "new_message" | "friend_request" | "friend_accepted" | "friend_removed" | "member_left" | "member_joined" | "profile_updated";
  roomId?: string;
  recordUri?: string;
  fromDid?: string;
  toDid?: string;
  requestId?: number;
  friendDid?: string;
  memberDid?: string; // 나간/들어온 멤버의 DID
  updatedDid?: string; // 프로필이 업데이트된 사용자의 DID
  profileData?: { // 업데이트된 프로필 정보
    displayName?: string;
    description?: string;
    avatarUrl?: string;
  };
  // 메시지 내용 (PDS 조회 없이 바로 사용)
  messageContent?: {
    senderDid: string;
    ciphertext: string;
    nonce: string;
    createdAt: string;
    fileUrl?: string; // 파일 URL (하위 호환성)
    fileName?: string; // 원본 파일명 (하위 호환성)
    mimeType?: string; // MIME 타입 (하위 호환성)
    files?: Array<{ // 여러 파일 첨부
      fileUrl: string;
      fileName: string;
      mimeType: string;
    }>;
  };
}

export interface PDSConfig {
  endpoint: string;
  did: string;
  handle?: string;
}
