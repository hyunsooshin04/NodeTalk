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
    // 초기 로드: 모든 기존 메시지 인덱싱 (알림은 보내지 않음)
    const db = getDB();
    try {
      const result = await agent.com.atproto.repo.listRecords({
        repo: did,
        collection: COLLECTION,
        limit: 100,
      });

      for (const record of result.data.records) {
        await this.indexMessage(record, did, false); // 초기 로드는 알림 없이
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

    // 이미 인덱싱된 메시지의 최신 시간을 기록
    const lastIndexed = await db.query(
      "SELECT created_at FROM msg_index WHERE sender_did = $1 ORDER BY created_at DESC LIMIT 1",
      [did]
    );
    let lastIndexedTime = lastIndexed.rows[0]?.created_at 
      ? new Date(lastIndexed.rows[0].created_at).getTime() 
      : 0;

    const interval = setInterval(async () => {
      try {
        // 현재 인덱싱된 최신 시간을 다시 조회 (동적으로 업데이트)
        const currentIndexed = await db.query(
          "SELECT created_at FROM msg_index WHERE sender_did = $1 ORDER BY created_at DESC LIMIT 1",
          [did]
        );
        const currentLastTime = currentIndexed.rows[0]?.created_at 
          ? new Date(currentIndexed.rows[0].created_at).getTime() 
          : lastIndexedTime;

        const result = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: COLLECTION,
          limit: 100,
        });

        // 새 메시지가 있는지 확인 (시간 기반)
        let foundNew = false;
        for (const record of result.data.records) {
          const recordTime = record.value.createdAt 
            ? new Date(record.value.createdAt).getTime() 
            : 0;
          
          // 마지막 인덱싱 시간 이후의 메시지만 처리
          if (recordTime > currentLastTime) {
            const msgRef = await this.indexMessage(record, did, true); // 새 메시지는 알림 전송 (indexMessage 내부에서 알림 처리)
            if (msgRef) {
              foundNew = true;
              lastIndexedTime = Math.max(lastIndexedTime, recordTime);
            }
          }
        }
        
        if (foundNew) {
          console.log(`[AppView] Found and indexed new messages for ${did}`);
        }
      } catch (error: any) {
        // 인증 오류는 무시
        if (!error.message?.includes("Authentication") && !error.message?.includes("401")) {
          console.error(`[AppView] Error polling PDS for ${did}:`, error);
        }
      }
    }, 2000); // 2초마다 체크 (더 빠른 반응)

    this.pollingIntervals.set(did, interval);
  }

  /**
   * 메시지를 즉시 알림 (메시지 전송 후 즉시 호출)
   */
  async notifyMessageImmediately(
    recordUri: string,
    senderDid: string,
    roomId: string,
    ciphertext: string,
    nonce: string,
    createdAt: string
  ): Promise<void> {
    const db = getDB();
    
    // 중복 체크
    const existing = await db.query(
      "SELECT id FROM msg_index WHERE record_uri = $1",
      [recordUri]
    );

    if (existing.rows.length > 0) {
      console.log(`[AppView] Message already indexed: ${recordUri}`);
      return; // 이미 인덱싱됨
    }

    // msgRef 저장 및 메시지 ID 가져오기
    const insertResult = await db.query(
      `INSERT INTO msg_index (room_id, record_uri, sender_did, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [roomId, recordUri, senderDid, createdAt]
    );
    
    const messageId = insertResult.rows[0].id;

    // rooms 테이블의 last_message_at과 last_message_id 업데이트
    await db.query(
      `UPDATE rooms 
       SET last_message_at = $1, last_message_id = $2
       WHERE room_id = $3 AND (last_message_at IS NULL OR last_message_at < $1)`,
      [createdAt, messageId, roomId]
    );

    console.log(`[AppView] Indexed and notifying new message: ${recordUri} in room ${roomId}, messageId: ${messageId}`);
    console.log(`[AppView] Message details - senderDid: ${senderDid}, ciphertext length: ${ciphertext.length}, nonce length: ${nonce.length}`);

    // 방 참여자 목록 가져오기
    const membersResult = await db.query(
      "SELECT member_did FROM room_members WHERE room_id = $1",
      [roomId]
    );
    
    const memberDids = membersResult.rows.map((row: any) => row.member_did);
    console.log(`[AppView] Room members: ${memberDids.join(", ")}`);

    // Gateway에 각 참여자에게 직접 알림 전달
    if (this.gateway) {
      const notification = {
        type: "new_message" as const,
        roomId: roomId,
        recordUri: recordUri,
        messageContent: {
          senderDid: senderDid,
          ciphertext: ciphertext,
          nonce: nonce,
          createdAt: createdAt,
        },
      };
      
      // 각 참여자 DID로 알림 전송
      for (const memberDid of memberDids) {
        console.log(`[AppView] Pushing notification to member: ${memberDid}`);
        this.gateway.pushNotificationToDid(memberDid, notification);
      }
      console.log(`[AppView] Gateway.pushNotification completed for ${memberDids.length} members`);
    } else {
      console.warn(`[AppView] Gateway is not available, cannot push notification`);
    }
  }

  /**
   * 메시지 인덱싱 (msgRef만 저장)
   */
  private async indexMessage(record: any, senderDid: string, isNew: boolean = true): Promise<MessageRef | null> {
    const db = getDB();
    const recordUri = record.uri;
    const createdAt = record.value.createdAt || new Date().toISOString();
    const roomId = record.value.roomId;

    if (!roomId) {
      console.warn(`Message record missing roomId: ${recordUri}`);
      return null;
    }

    // 중복 체크
    const existing = await db.query(
      "SELECT id FROM msg_index WHERE record_uri = $1",
      [recordUri]
    );

    if (existing.rows.length > 0) {
      return null; // 이미 인덱싱됨
    }

    // msgRef만 저장 (평문 저장 안 함) 및 메시지 ID 가져오기
    const insertResult = await db.query(
      `INSERT INTO msg_index (room_id, record_uri, sender_did, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [roomId, recordUri, senderDid, createdAt]
    );
    
    const messageId = insertResult.rows[0].id;

    // rooms 테이블의 last_message_at과 last_message_id 업데이트
    await db.query(
      `UPDATE rooms 
       SET last_message_at = $1, last_message_id = $2
       WHERE room_id = $3 AND (last_message_at IS NULL OR last_message_at < $1)`,
      [createdAt, messageId, roomId]
    );

    if (isNew) {
      console.log(`Indexed new message: ${recordUri} in room ${roomId}, messageId: ${messageId}`);
      
      // 방 참여자 목록 가져오기
      const membersResult = await db.query(
        "SELECT member_did FROM room_members WHERE room_id = $1",
        [roomId]
      );
      
      const memberDids = membersResult.rows.map((row: any) => row.member_did);
      
      // Gateway에 각 참여자에게 직접 알림 전달
      if (this.gateway) {
        const notification = {
          type: "new_message" as const,
          roomId: roomId,
          recordUri: recordUri,
          messageContent: {
            senderDid: senderDid,
            ciphertext: String(record.value.ciphertext || ""),
            nonce: String(record.value.nonce || ""),
            createdAt: createdAt,
          },
        };
        
        // 각 참여자 DID로 알림 전송
        for (const memberDid of memberDids) {
          this.gateway.pushNotificationToDid(memberDid, notification);
        }
        console.log(`[AppView] Pushed notification to ${memberDids.length} members for room ${roomId}`);
      }
    }
    
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

