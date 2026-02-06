import AtprotoApi from "@atproto/api";
const BskyAgent = (AtprotoApi as any).default?.BskyAgent || (AtprotoApi as any).BskyAgent;
type BskyAgentType = InstanceType<typeof BskyAgent>;
import { getDB } from "../db/index.js";
import type { MessageRef } from "@nodetalk/shared";
import { RealtimeGateway } from "../gateway/index.js";

const COLLECTION = "com.nodetalk.chat.message";

/**
 * AppView - PDS에서 레코드를 감지하고 인덱싱
 */
export class AppViewIndexer {
  private agents: Map<string, BskyAgentType> = new Map();
  private gateway: RealtimeGateway | null = null;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Gateway 연결 설정
   */
  setGateway(gateway: RealtimeGateway) {
    this.gateway = gateway;
  }

  /**
   * 사용자 PDS 구독 시작
   */
  async subscribeToPDS(did: string, pdsEndpoint: string) {
    // 이미 구독 중이면 스킵
    if (this.agents.has(did)) {
      console.log(`Already subscribed to ${did}`);
      return;
    }
    
    const agent = new BskyAgent({ service: pdsEndpoint });
    this.agents.set(did, agent);
    
    console.log(`Subscribing to PDS: ${did} at ${pdsEndpoint}`);
    
    // 주기적으로 레코드 체크 (Phase 1에서는 polling)
    this.startPolling(did, agent);
  }

  /**
   * Polling으로 새 레코드 감지 (Phase 1)
   * TODO: Phase 2에서 repo subscribe로 변경
   */
  private async startPolling(did: string, agent: BskyAgentType) {
    // 초기 로드: 모든 기존 메시지 인덱싱
    try {
      const result = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: COLLECTION,
        limit: 100,
      });

      for (const record of result.data.records) {
        await this.indexMessage(record, did);
      }
      console.log(`Indexed ${result.data.records.length} existing messages for ${did}`);
    } catch (error: any) {
      // 인증 오류인 경우 무시 (public 레코드는 인증 없이 읽을 수 있어야 함)
      if (error.message?.includes("Authentication") || error.message?.includes("401")) {
        console.warn(`Cannot authenticate to PDS for ${did}, trying without auth`);
      } else {
        console.error(`Error loading existing messages for ${did}:`, error);
      }
    }

    let lastRecordCount = 0;
    let lastCursor: string | undefined;

    const interval = setInterval(async () => {
      try {
        const result = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: COLLECTION,
          limit: 100,
          cursor: lastCursor,
        });

        // 새 메시지가 있는지 확인 (cursor 기반)
        if (result.data.records.length > 0) {
          // 마지막으로 본 레코드 이후의 것만 처리
          for (const record of result.data.records) {
            const msgRef = await this.indexMessage(record, did);
            if (msgRef && this.gateway) {
              // Gateway에 알림 전달
              this.gateway.pushNotification({
                type: "new_message",
                roomId: msgRef.roomId,
                recordUri: msgRef.recordUri,
              });
            }
          }
          lastCursor = result.data.cursor;
        }
        lastRecordCount = result.data.records.length;
      } catch (error: any) {
        // 인증 오류는 무시
        if (!error.message?.includes("Authentication") && !error.message?.includes("401")) {
          console.error(`Error polling PDS for ${did}:`, error);
        }
      }
    }, 3000); // 3초마다 체크 (더 빠른 반응)

    this.pollingIntervals.set(did, interval);
  }

  /**
   * 메시지 인덱싱 (msgRef만 저장)
   */
  private async indexMessage(record: any, senderDid: string): Promise<MessageRef | null> {
    const db = getDB();
    const recordUri = record.uri;
    const createdAt = record.value.createdAt || new Date().toISOString();
    const roomId = record.value.roomId;

    // 중복 체크
    const existing = await db.query(
      "SELECT id FROM msg_index WHERE record_uri = $1",
      [recordUri]
    );

    if (existing.rows.length > 0) {
      return null; // 이미 인덱싱됨
    }

    // msgRef만 저장 (평문 저장 안 함)
    await db.query(
      `INSERT INTO msg_index (room_id, record_uri, sender_did, created_at)
       VALUES ($1, $2, $3, $4)`,
      [roomId, recordUri, senderDid, createdAt]
    );

    console.log(`Indexed message: ${recordUri}`);
    
    return {
      roomId,
      recordUri,
      senderDid,
      createdAt,
    } as MessageRef;
  }

  /**
   * 특정 room의 메시지 목록 조회
   */
  async getRoomMessages(roomId: string, limit = 50, cursor?: string) {
    const db = getDB();
    const query = cursor
      ? `SELECT * FROM msg_index 
         WHERE room_id = $1 AND id > $2 
         ORDER BY created_at ASC 
         LIMIT $3`
      : `SELECT * FROM msg_index 
         WHERE room_id = $1 
         ORDER BY created_at ASC 
         LIMIT $2`;

    const params = cursor ? [roomId, cursor, limit] : [roomId, limit];
    const result = await db.query(query, params);

    return result.rows;
  }
}

