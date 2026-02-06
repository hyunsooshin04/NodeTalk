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
  type: "new_message";
  roomId: string;
  recordUri: string;
}

export interface PDSConfig {
  endpoint: string;
  did: string;
  handle?: string;
}

