// 동적 import로 런타임에 로드 (SSR/브라우저 환경 대응)
// 클라이언트 사이드에서만 실행되도록 보장
let BskyAgent: any = null;
let BskyAgentPromise: Promise<any> | null = null;

const getBskyAgent = async () => {
  // 브라우저 환경에서만 실행
  if (typeof window === 'undefined') {
    throw new Error("BskyAgent can only be used in browser environment");
  }
  
  if (BskyAgent) {
    return BskyAgent;
  }
  
  if (BskyAgentPromise) {
    return BskyAgentPromise;
  }
  
  BskyAgentPromise = (async () => {
    try {
      const AtprotoApi = await import("@atproto/api");
      const api = AtprotoApi as any;
      
      // 다양한 가능한 경로 확인
      if (api.default?.BskyAgent && typeof api.default.BskyAgent === 'function') {
        BskyAgent = api.default.BskyAgent;
        return BskyAgent;
      }
      if (api.BskyAgent && typeof api.BskyAgent === 'function') {
        BskyAgent = api.BskyAgent;
        return BskyAgent;
      }
      // 직접 접근 시도
      if (api.default && typeof api.default === 'object') {
        const Agent = (api.default as any).BskyAgent;
        if (typeof Agent === 'function') {
          BskyAgent = Agent;
          return BskyAgent;
        }
      }
      throw new Error("BskyAgent not found in @atproto/api");
    } catch (error) {
      BskyAgentPromise = null;
      throw error;
    }
  })();
  
  return BskyAgentPromise;
};

type BskyAgentType = any; // 동적 로딩이므로 타입을 any로
import type { MessageRecord } from "@nodetalk/shared";

const COLLECTION = "com.nodetalk.chat.message";

/**
 * Client PDS Adapter
 */
export class ClientPDSAdapter {
  private agent: BskyAgentType | null = null;
  private did: string = "";

  /**
   * 로그인
   */
  async login(identifier: string, password: string, service?: string) {
    // 런타임에 BskyAgent 가져오기 (SSR/브라우저 환경 대응)
    const Agent = await getBskyAgent();
    this.agent = new Agent({
      service: service || "https://bsky.social",
    });

    await this.agent.login({ identifier, password });
    this.did = this.agent.session?.did || "";
    return this.agent;
  }

  /**
   * 메시지 전송 (암호화된 레코드 저장)
   */
  async sendMessage(
    roomId: string,
    ciphertext: string,
    nonce: string
  ): Promise<string> {
    if (!this.agent) {
      throw new Error("Not logged in");
    }

    const record: MessageRecord = {
      $type: COLLECTION,
      roomId,
      ciphertext,
      nonce,
      createdAt: new Date().toISOString(),
    };

    const result = await this.agent.com.atproto.repo.createRecord({
      repo: this.did,
      collection: COLLECTION,
      record,
    });

    // result 구조 확인: data.uri 또는 uri
    const uri = result.data?.uri || result.uri;
    if (!uri) {
      console.error("createRecord result:", result);
      throw new Error("Failed to get URI from createRecord");
    }
    
    // AppView에 PDS 구독 알림 (선택적, 실패해도 계속 진행)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const pdsEndpoint = this.agent?.service || "https://bsky.social";
      await fetch(`${API_URL}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: this.did, pdsEndpoint }),
      }).catch(() => {
        // 실패해도 무시 (AppView가 없을 수 있음)
      });
    } catch (error) {
      // 무시
    }
    
    return uri;
  }

  /**
   * 메시지 조회 (recordUri로)
   */
  async getMessage(recordUri: string): Promise<MessageRecord | null> {
    if (!this.agent) {
      throw new Error("Not logged in");
    }

    // URI 파싱: at://did:plc:xxx/com.nodetalk.chat.message/rkey
    const match = recordUri.match(/at:\/\/([^/]+)\/([^/]+)\/(.+)/);
    if (!match) {
      throw new Error("Invalid record URI");
    }

    const [, repo, collection, rkey] = match;

    const result = await this.agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    return result.data.value as MessageRecord;
  }

  /**
   * Room의 메시지 목록 조회 (각 참여자의 PDS에서 직접 가져오기)
   */
  async listRoomMessages(roomId: string, limit = 50) {
    if (!this.agent) {
      throw new Error("Not logged in");
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    // 1. Room 참여자 목록 가져오기
    let members: any[] = [];
    try {
      const membersResponse = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomId)}/members`);
      if (membersResponse.ok) {
        members = await membersResponse.json();
      }
    } catch (error) {
      console.warn("Failed to fetch room members:", error);
    }
    
    // 참여자가 없으면 자신만 조회
    if (members.length === 0) {
      members = [{ member_did: this.did, pds_endpoint: "https://bsky.social" }];
    }
    
    // 2. 각 참여자의 PDS에서 메시지 가져오기
    const allMessages: any[] = [];
    
    for (const member of members) {
      try {
        const memberDid = member.member_did;
        const pdsEndpoint = member.pds_endpoint || "https://bsky.social";
        
        // 각 참여자의 PDS endpoint를 사용하여 인증 없이 public 레코드 읽기
        // 동적으로 새로운 agent 생성 (인증 없이)
        const Agent = await getBskyAgent();
        const memberAgent = new Agent({
          service: pdsEndpoint,
        });
        
        // 각 참여자의 PDS에서 해당 방의 메시지 가져오기
        const result = await memberAgent.com.atproto.repo.listRecords({
          repo: memberDid,
          collection: COLLECTION,
          limit: 100, // 충분히 큰 값
        });

        const memberMessages = result.data.records
          .filter((r) => (r.value as MessageRecord).roomId === roomId)
          .map((r) => ({
            uri: r.uri,
            senderDid: memberDid,
            createdAt: r.value.createdAt || new Date().toISOString(),
            ...(r.value as MessageRecord),
          }));
        
        allMessages.push(...memberMessages);
      } catch (error: any) {
        // 특정 사용자의 메시지를 가져올 수 없으면 스킵
        const errorMsg = error.message || error.toString() || "";
        const statusCode = error.status || error.statusCode || error.code || "";
        
        // 400, 404 등은 조용히 무시
        if (statusCode === 400 || statusCode === 404 || 
            errorMsg.includes("Bad Request") || 
            errorMsg.includes("not found")) {
          // 조용히 스킵
          continue;
        }
        
        console.warn(`Failed to fetch messages from ${member.member_did}:`, errorMsg || error);
        continue;
      }
    }
    
    // 3. 시간순으로 정렬하고 중복 제거
    const uniqueMessages = new Map<string, any>();
    for (const msg of allMessages) {
      if (!uniqueMessages.has(msg.uri)) {
        uniqueMessages.set(msg.uri, msg);
      }
    }
    
    const sortedMessages = Array.from(uniqueMessages.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
    
    return sortedMessages.slice(-limit); // 최신 limit개만 반환
  }

  getDid() {
    return this.did;
  }

  /**
   * DID로 프로필 정보 가져오기
   */
  async getProfile(did: string) {
    if (!this.agent) {
      throw new Error("Not logged in");
    }

    try {
      // AT Protocol에서 프로필 정보 가져오기
      const result = await this.agent.com.atproto.repo.getRecord({
        repo: did,
        collection: "app.bsky.actor.profile",
        rkey: "self",
      });
      
      const profile = result.data.value as any;
      return {
        did,
        handle: profile?.handle || did,
        displayName: profile?.displayName || profile?.handle || did,
        description: profile?.description || "",
        avatar: profile?.avatar,
      };
    } catch (error) {
      // 프로필 레코드가 없으면 describeRepo로 기본 정보 가져오기
      try {
        const result = await this.agent.com.atproto.repo.describeRepo({
          repo: did,
        });
        
        return {
          did,
          handle: result.data.handle || did,
          displayName: result.data.handle || did,
          description: "",
        };
      } catch (error2) {
        console.warn(`Failed to get profile for ${did}:`, error2);
        return {
          did,
          handle: did,
          displayName: did,
          description: "",
        };
      }
    }
  }

  /**
   * 자신의 프로필 정보 가져오기
   */
  async getMyProfile() {
    return this.getProfile(this.did);
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(updates: {
    displayName?: string;
    description?: string;
    avatar?: string;
  }) {
    if (!this.agent) {
      throw new Error("Not logged in");
    }

    try {
      // 기존 프로필 가져오기
      let existingProfile: any = {};
      try {
        const result = await this.agent.com.atproto.repo.getRecord({
          repo: this.did,
          collection: "app.bsky.actor.profile",
          rkey: "self",
        });
        existingProfile = result.data.value as any;
      } catch (error) {
        // 프로필이 없으면 새로 생성
        existingProfile = {
          $type: "app.bsky.actor.profile",
        };
      }

      // 업데이트할 필드 병합
      const updatedProfile = {
        $type: "app.bsky.actor.profile",
        displayName: updates.displayName !== undefined ? updates.displayName : existingProfile.displayName,
        description: updates.description !== undefined ? updates.description : existingProfile.description,
        avatar: updates.avatar !== undefined ? updates.avatar : existingProfile.avatar,
      };

      // 프로필 업데이트 또는 생성
      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.did,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: updatedProfile,
      });

      return {
        did: this.did,
        handle: existingProfile.handle || this.did,
        displayName: updatedProfile.displayName,
        description: updatedProfile.description,
        avatar: updatedProfile.avatar,
      };
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      throw new Error(`Profile update failed: ${error.message || error}`);
    }
  }
}

