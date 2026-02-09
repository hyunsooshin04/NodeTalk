/**
 * 친구 목록 관리 (Phase 1: 로컬 스토리지)
 */

export interface Friend {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  addedAt: string;
}

/**
 * 친구 목록 관리자
 */
export class FriendsManager {
  private friends: Map<string, Friend> = new Map();

  /**
   * 로컬 스토리지에서 친구 목록 로드
   */
  loadFriends() {
    if (typeof window === "undefined") return;
    
    const friendsJson = localStorage.getItem("nodetalk_friends");
    if (friendsJson) {
      try {
        const friendsArray = JSON.parse(friendsJson) as Friend[];
        this.friends.clear();
        friendsArray.forEach((friend) => {
          this.friends.set(friend.did, friend);
        });
      } catch (error) {
        console.error("Failed to load friends:", error);
      }
    }
  }

  /**
   * 친구 추가
   */
  addFriend(friend: Friend) {
    this.friends.set(friend.did, friend);
    this.saveFriends();
  }

  /**
   * 친구 제거
   */
  removeFriend(did: string) {
    this.friends.delete(did);
    this.saveFriends();
  }

  /**
   * 친구 목록 가져오기
   */
  getFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  /**
   * 친구 정보 업데이트
   */
  updateFriend(did: string, updates: Partial<Friend>) {
    const friend = this.friends.get(did);
    if (friend) {
      this.friends.set(did, { ...friend, ...updates });
      this.saveFriends();
    }
  }

  /**
   * 친구인지 확인
   */
  isFriend(did: string): boolean {
    return this.friends.has(did);
  }

  /**
   * 로컬 스토리지에 저장
   */
  private saveFriends() {
    if (typeof window === "undefined") return;
    const friendsArray = Array.from(this.friends.values());
    localStorage.setItem("nodetalk_friends", JSON.stringify(friendsArray));
  }
}


