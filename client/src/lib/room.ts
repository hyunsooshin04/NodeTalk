import { base64ToKey } from "./crypto";

/**
 * Room 키 관리 (Phase 1: 서버에서 키 관리)
 */
export class RoomKeyManager {
  private keys: Map<string, Uint8Array> = new Map();
  private loadingKeys: Map<string, Promise<Uint8Array>> = new Map();

  /**
   * Room 키 조회 또는 생성 (서버에서)
   */
  async getOrCreateRoomKey(roomId: string): Promise<Uint8Array> {
    // 이미 메모리에 있으면 반환
    if (this.keys.has(roomId)) {
      return this.keys.get(roomId)!;
    }

    // 이미 로딩 중이면 기다림
    if (this.loadingKeys.has(roomId)) {
      return await this.loadingKeys.get(roomId)!;
    }

    // 서버에서 키 가져오기
    const loadPromise = this.loadKeyFromServer(roomId);
    this.loadingKeys.set(roomId, loadPromise);

    try {
      const key = await loadPromise;
      this.keys.set(roomId, key);
      return key;
    } finally {
      this.loadingKeys.delete(roomId);
    }
  }

  /**
   * 서버에서 키 가져오기
   */
  private async loadKeyFromServer(roomId: string): Promise<Uint8Array> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    try {
      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/key`);
      if (!response.ok) {
        throw new Error(`Failed to fetch room key: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.key) {
        throw new Error("Invalid response from server");
      }

      // Base64 문자열을 Uint8Array로 변환
      return base64ToKey(result.key);
    } catch (error) {
      console.error("Failed to load key from server:", error);
      throw error;
    }
  }

  /**
   * Room 키 설정 (서버에 저장)
   */
  async setRoomKey(roomId: string, key: Uint8Array) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const keyBase64 = this.keyToBase64(key);

    try {
      const response = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save room key: ${response.statusText}`);
      }

      // 메모리에 저장
      this.keys.set(roomId, key);
    } catch (error) {
      console.error("Failed to save key to server:", error);
      throw error;
    }
  }

  /**
   * 키를 Base64 문자열로 변환
   */
  private keyToBase64(key: Uint8Array): string {
    const bytes = Array.from(key);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  /**
   * 초기화 시 로컬 스토리지에서 모든 키 로드 (더 이상 사용하지 않음)
   */
  loadAllKeys() {
    // 서버에서 관리하므로 로컬 스토리지 로드 불필요
    // 이전 버전과의 호환성을 위해 빈 함수로 유지
  }
}

