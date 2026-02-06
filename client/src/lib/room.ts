import { generateRoomKey, keyToBase64, base64ToKey } from "./crypto";
import type { RoomKey } from "@nodetalk/shared";

/**
 * Room 키 관리 (Phase 1: 로컬 저장)
 */
export class RoomKeyManager {
  private keys: Map<string, Uint8Array> = new Map();

  /**
   * Room 키 생성 또는 조회
   * Phase 1: roomId를 기반으로 결정론적 키 생성 (같은 roomId = 같은 키)
   */
  getOrCreateRoomKey(roomId: string): Uint8Array {
    if (!this.keys.has(roomId)) {
      // 로컬 스토리지에서 먼저 확인
      const savedKey = this.loadFromLocalStorage(roomId);
      if (savedKey) {
        this.keys.set(roomId, savedKey);
        return savedKey;
      }
      
      // roomId를 기반으로 결정론적 키 생성 (같은 roomId = 같은 키)
      // Phase 1에서는 간단하게 roomId를 해시하여 키 생성
      const key = this.generateDeterministicKey(roomId);
      this.keys.set(roomId, key);
      this.saveToLocalStorage(roomId, key);
    }
    return this.keys.get(roomId)!;
  }

  /**
   * roomId를 기반으로 결정론적 키 생성
   * 같은 roomId를 가진 모든 사용자가 같은 키를 얻을 수 있도록 함
   * Phase 1: 간단한 해시 함수 사용 (동기)
   */
  private generateDeterministicKey(roomId: string): Uint8Array {
    // roomId를 해시하여 32바이트 키 생성
    const encoder = new TextEncoder();
    const data = encoder.encode(roomId);
    
    // 간단한 해시 함수 (Phase 1용, 동기 처리)
    // 같은 roomId는 항상 같은 키를 생성
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < data.length; i++) {
      hash1 = ((hash1 << 5) - hash1) + data[i];
      hash1 = hash1 & hash1; // 32bit 정수로 변환
      hash2 = ((hash2 << 3) - hash2) + data[i] * 7;
      hash2 = hash2 & hash2;
    }
    
    // 32바이트 키 생성 (결정론적)
    const key = new Uint8Array(32);
    const hash1Bytes = new Uint8Array(new Int32Array([Math.abs(hash1)]).buffer);
    const hash2Bytes = new Uint8Array(new Int32Array([Math.abs(hash2)]).buffer);
    
    for (let i = 0; i < 32; i++) {
      const idx = i % 4;
      key[i] = (hash1Bytes[idx] ^ hash2Bytes[idx] ^ data[i % data.length] ^ (i * 11)) & 0xFF;
    }
    
    return key;
  }

  /**
   * Room 키 설정 (다른 사용자와 공유된 키)
   */
  setRoomKey(roomId: string, key: Uint8Array) {
    this.keys.set(roomId, key);
    this.saveToLocalStorage(roomId, key);
  }

  /**
   * 로컬 스토리지에 저장
   */
  private saveToLocalStorage(roomId: string, key: Uint8Array) {
    if (typeof window === "undefined") return;
    const keyStr = keyToBase64(key);
    localStorage.setItem(`room_key_${roomId}`, keyStr);
  }

  /**
   * 로컬 스토리지에서 로드
   */
  loadFromLocalStorage(roomId: string): Uint8Array | null {
    if (typeof window === "undefined") return null;
    const keyStr = localStorage.getItem(`room_key_${roomId}`);
    if (!keyStr) return null;
    return base64ToKey(keyStr);
  }

  /**
   * 초기화 시 로컬 스토리지에서 모든 키 로드
   */
  loadAllKeys() {
    if (typeof window === "undefined") return;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("room_key_")) {
        const roomId = key.replace("room_key_", "");
        const keyData = this.loadFromLocalStorage(roomId);
        if (keyData) {
          this.keys.set(roomId, keyData);
        }
      }
    }
  }
}

