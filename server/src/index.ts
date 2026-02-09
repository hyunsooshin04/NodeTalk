import express from "express";
import { initDB, setupSchema, getDB } from "./db/index.js";
import { AppViewIndexer } from "./appview/indexer.js";
import { RealtimeGateway } from "./gateway/index.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS 설정
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = parseInt(process.env.PORT || "3001", 10);
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || "3002", 10);

// Database 초기화
await setupSchema();

// Gateway 초기화
const gateway = new RealtimeGateway(GATEWAY_PORT);

// AppView 초기화
const indexer = new AppViewIndexer();
indexer.setGateway(gateway);

// API Routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// PDS 구독 등록 (테스트용)
app.post("/api/subscribe", async (req, res) => {
  const { did, pdsEndpoint } = req.body;
  await indexer.subscribeToPDS(did, pdsEndpoint);
  res.json({ success: true });
});

// 메시지 즉시 알림 (메시지 전송 후 즉시 호출)
app.post("/api/messages/notify", async (req, res) => {
  console.log("[API] ===== /api/messages/notify called =====");
  console.log("[API] Request body:", {
    recordUri: req.body.recordUri,
    senderDid: req.body.senderDid,
    roomId: req.body.roomId,
    ciphertextLength: req.body.ciphertext?.length,
    nonceLength: req.body.nonce?.length,
    createdAt: req.body.createdAt,
  });
  
  try {
    const { recordUri, senderDid, roomId, ciphertext, nonce, createdAt } = req.body;
    
    if (!recordUri || !senderDid || !roomId || !ciphertext || !nonce) {
      console.error("[API] ✗ Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: recordUri, senderDid, roomId, ciphertext, nonce" 
      });
    }

    console.log("[API] Calling indexer.notifyMessageImmediately...");
    await indexer.notifyMessageImmediately(
      recordUri,
      senderDid,
      roomId,
      ciphertext,
      nonce,
      createdAt || new Date().toISOString()
    );
    console.log("[API] ✓ indexer.notifyMessageImmediately completed");

    res.json({ success: true });
  } catch (error: any) {
    console.error("[API] ✗ Error notifying message:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to notify message" 
    });
  }
});

// Room 생성/참여
app.post("/api/rooms/:roomId/join", async (req, res) => {
  const { roomId } = req.params;
  const { did, pdsEndpoint } = req.body;
  
  const db = getDB();
  
  // Room이 없으면 생성 (last_message_at도 함께 초기화)
  await db.query(
    `INSERT INTO rooms (room_id, last_message_at) 
     VALUES ($1, NOW()) 
     ON CONFLICT (room_id) DO NOTHING`,
    [roomId]
  );
  
  // 기존 참여자인지 확인
  const existingMember = await db.query(
    "SELECT member_did FROM room_members WHERE room_id = $1 AND member_did = $2",
    [roomId, did]
  );
  const isNewMember = existingMember.rows.length === 0;
  
  // 참여자 추가
  await db.query(
    `INSERT INTO room_members (room_id, member_did, pds_endpoint)
     VALUES ($1, $2, $3)
     ON CONFLICT (room_id, member_did) DO UPDATE
     SET pds_endpoint = $3`,
    [roomId, did, pdsEndpoint]
  );
  
  // 새로 참여한 경우에만 나머지 참여자들에게 member_joined 알림 전송
  if (isNewMember) {
    const otherMembersResult = await db.query(
      "SELECT member_did FROM room_members WHERE room_id = $1 AND member_did != $2",
      [roomId, did]
    );
    const otherMemberDids = otherMembersResult.rows.map((row: any) => row.member_did);
    
    for (const memberDid of otherMemberDids) {
      gateway.pushNotificationToDid(memberDid, {
        type: "member_joined",
        roomId,
        memberDid: did,
      });
    }
  }
  
  res.json({ success: true });
});

// Room 참여자 목록 조회
app.get("/api/rooms/:roomId/members", async (req, res) => {
  const { roomId } = req.params;
  const db = getDB();
  const result = await db.query(
    "SELECT member_did, pds_endpoint FROM room_members WHERE room_id = $1",
    [roomId]
  );
  res.json(result.rows);
});

// Room 나가기
app.delete("/api/rooms/:roomId/leave", async (req, res) => {
  const { roomId } = req.params;
  const { did } = req.body;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    // 나머지 참여자 목록 가져오기 (알림 전송용)
    const remainingMembersResult = await db.query(
      "SELECT member_did FROM room_members WHERE room_id = $1 AND member_did != $2",
      [roomId, did]
    );
    const remainingMemberDids = remainingMembersResult.rows.map((row: any) => row.member_did);

    // room_members에서 해당 사용자 삭제
    await db.query(
      "DELETE FROM room_members WHERE room_id = $1 AND member_did = $2",
      [roomId, did]
    );

    // 참여자가 없으면 room도 삭제 (선택적)
    const remainingMembers = await db.query(
      "SELECT COUNT(*) as count FROM room_members WHERE room_id = $1",
      [roomId]
    );

    if (remainingMembers.rows[0].count === "0") {
      await db.query("DELETE FROM rooms WHERE room_id = $1", [roomId]);
    }

    // 나머지 참여자들에게 member_left 알림 전송
    for (const memberDid of remainingMemberDids) {
      gateway.pushNotificationToDid(memberDid, {
        type: "member_left",
        roomId,
        memberDid: did,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to leave room:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 채팅방 목록 조회 (사용자가 참여한 방 목록, 최신 메시지 순으로 정렬, 안 읽은 메시지 개수 포함)
app.get("/api/rooms", async (req, res) => {
  const { did } = req.query;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    // 사용자가 참여한 방 목록 조회 (최신 메시지 순으로 정렬, 안 읽은 메시지 개수 포함)
    // 서브쿼리로 실제 메시지 개수를 세어서 정확한 안 읽은 메시지 개수 계산
    // member_count는 서브쿼리로 전체 멤버 수를 계산
    const result = await db.query(
      `SELECT r.room_id, r.created_at, r.last_message_at, r.last_message_id,
              (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.room_id) as member_count,
              COALESCE(r.last_message_at, r.created_at) as sort_time,
              rm.last_read_message_id,
              COALESCE((
                SELECT COUNT(*) 
                FROM msg_index mi 
                WHERE mi.room_id = r.room_id 
                  AND (rm.last_read_message_id IS NULL OR mi.id > rm.last_read_message_id)
              ), 0)::INTEGER as unread_count
       FROM rooms r
       INNER JOIN room_members rm ON r.room_id = rm.room_id
       WHERE rm.member_did = $1
       GROUP BY r.room_id, r.created_at, r.last_message_at, r.last_message_id, rm.last_read_message_id
       ORDER BY sort_time DESC`,
      [did]
    );

    console.log(`[API] Loaded ${result.rows.length} rooms for DID ${did}`);
    result.rows.forEach((room: any) => {
      console.log(`[API] Room ${room.room_id}: last_message_id=${room.last_message_id}, last_read_message_id=${room.last_read_message_id}, unread_count=${room.unread_count}`);
    });

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to get rooms list:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 마지막 읽은 메시지 ID 업데이트
app.post("/api/rooms/:roomId/read", async (req, res) => {
  const { roomId } = req.params;
  const { did, messageId } = req.body;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    console.log(`[API] Updating last read message for room ${roomId}, did: ${did}, messageId: ${messageId || 'auto'}`);
    
    // messageId가 제공되면 해당 ID로, 없으면 방의 마지막 메시지 ID로 업데이트
    let targetMessageId = messageId;
    if (!targetMessageId) {
      const roomResult = await db.query(
        "SELECT last_message_id FROM rooms WHERE room_id = $1",
        [roomId]
      );
      if (roomResult.rows.length > 0) {
        targetMessageId = roomResult.rows[0].last_message_id;
        console.log(`[API] Using room's last_message_id: ${targetMessageId}`);
      } else {
        console.log(`[API] Room ${roomId} not found or has no messages`);
      }
    }

    if (targetMessageId) {
      const updateResult = await db.query(
        `UPDATE room_members 
         SET last_read_message_id = $1 
         WHERE room_id = $2 AND member_did = $3`,
        [targetMessageId, roomId, did]
      );
      console.log(`[API] Updated last_read_message_id: ${updateResult.rowCount} row(s) affected`);
      
      if (updateResult.rowCount === 0) {
        console.warn(`[API] No rows updated. Room member might not exist: roomId=${roomId}, did=${did}`);
      }
    } else {
      // 메시지가 없는 경우 NULL로 설정
      const updateResult = await db.query(
        `UPDATE room_members 
         SET last_read_message_id = NULL 
         WHERE room_id = $1 AND member_did = $2`,
        [roomId, did]
      );
      console.log(`[API] Set last_read_message_id to NULL: ${updateResult.rowCount} row(s) affected`);
    }

    res.json({ success: true, lastReadMessageId: targetMessageId });
  } catch (error) {
    console.error("Failed to update last read message:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Room 메시지 목록 조회
app.get("/api/rooms/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const messages = await indexer.getRoomMessages(roomId);
  res.json(messages);
});

// 친구 신청 보내기
app.post("/api/friends/request", async (req, res) => {
  const { fromDid, toDid } = req.body;
  const db = getDB();

  if (!fromDid || !toDid) {
    return res.status(400).json({ success: false, error: "fromDid and toDid are required" });
  }

  if (fromDid === toDid) {
    return res.status(400).json({ success: false, error: "Cannot send friend request to yourself" });
  }

  try {
    // 이미 친구인지 확인 (friends 테이블)
    const friendsCheck = await db.query(
      "SELECT * FROM friends WHERE (did1 = $1 AND did2 = $2) OR (did1 = $2 AND did2 = $1)",
      [fromDid, toDid]
    );

    if (friendsCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Already friends" });
    }

    // 이미 pending 상태의 친구 신청이 있는지 확인
    const existing = await db.query(
      "SELECT * FROM friend_requests WHERE ((from_did = $1 AND to_did = $2) OR (from_did = $2 AND to_did = $1)) AND status = 'pending'",
      [fromDid, toDid]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Friend request already exists" });
    }

    // 새 친구 신청 생성
    const result = await db.query(
      `INSERT INTO friend_requests (from_did, to_did, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (from_did, to_did) DO UPDATE SET status = 'pending', updated_at = NOW()
       RETURNING id`,
      [fromDid, toDid]
    );

    const requestId = result.rows[0].id;

    // Gateway를 통해 친구 신청 알림 전송
    gateway.pushNotification({
      type: "friend_request",
      fromDid,
      toDid,
      requestId,
    });

    res.json({ success: true, requestId });
  } catch (error) {
    console.error("Failed to send friend request:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 받은 친구 신청 목록 조회
app.get("/api/friends/requests/received", async (req, res) => {
  const { did } = req.query;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    const result = await db.query(
      `SELECT fr.*
       FROM friend_requests fr
       WHERE fr.to_did = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [did]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to get received friend requests:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 보낸 친구 신청 목록 조회
app.get("/api/friends/requests/sent", async (req, res) => {
  const { did } = req.query;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    const result = await db.query(
      `SELECT fr.*
       FROM friend_requests fr
       WHERE fr.from_did = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [did]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to get sent friend requests:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 친구 신청 수락/거절
app.post("/api/friends/request/:requestId/respond", async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  const db = getDB();

  if (!action || (action !== "accept" && action !== "reject")) {
    return res.status(400).json({ success: false, error: "action must be 'accept' or 'reject'" });
  }

  try {
    // 신청 정보 가져오기
    const requestResult = await db.query(
      "SELECT * FROM friend_requests WHERE id = $1",
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Friend request not found" });
    }

    const request = requestResult.rows[0];

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, error: "Friend request already processed" });
    }

    // 신청 상태 업데이트
    await db.query(
      "UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2",
      [action === "accept" ? "accepted" : "rejected", requestId]
    );

    if (action === "accept") {
      // 친구 관계를 양방향으로 저장
      await db.query(
        `INSERT INTO friends (did1, did2, created_at) VALUES ($1, $2, NOW())
         ON CONFLICT (did1, did2) DO NOTHING`,
        [request.from_did, request.to_did]
      );
      await db.query(
        `INSERT INTO friends (did1, did2, created_at) VALUES ($1, $2, NOW())
         ON CONFLICT (did1, did2) DO NOTHING`,
        [request.to_did, request.from_did]
      );

      // Gateway를 통해 양쪽 모두에게 알림 전송
      // 신청을 받은 쪽 (수락한 쪽)
      gateway.pushNotification({
        type: "friend_accepted",
        fromDid: request.from_did,
        toDid: request.to_did,
        friendDid: request.from_did,
      });

      // 신청을 보낸 쪽
      gateway.pushNotification({
        type: "friend_accepted",
        fromDid: request.from_did,
        toDid: request.to_did,
        friendDid: request.to_did,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to respond to friend request:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 친구 목록 조회
app.get("/api/friends", async (req, res) => {
  const { did } = req.query;
  const db = getDB();

  if (!did) {
    return res.status(400).json({ success: false, error: "did is required" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM friends WHERE did1 = $1 OR did2 = $1 ORDER BY created_at DESC`,
      [did]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to get friends list:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Room 키 조회 또는 생성
app.get("/api/rooms/:roomId/key", async (req, res) => {
  const { roomId } = req.params;
  const db = getDB();

  try {
    // 기존 키 조회
    const result = await db.query(
      "SELECT key_base64 FROM room_keys WHERE room_id = $1",
      [roomId]
    );

    if (result.rows.length > 0) {
      return res.json({ success: true, key: result.rows[0].key_base64 });
    }

    // 키가 없으면 생성 (32바이트 랜덤 키)
    // 각 방마다 고유한 키를 생성 (이미 키가 있으면 생성하지 않음)
    const crypto = await import("crypto");
    const keyBytes = crypto.randomBytes(32);
    const keyBase64 = keyBytes.toString("base64");

    await db.query(
      `INSERT INTO room_keys (room_id, key_base64, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (room_id) DO NOTHING`,
      [roomId, keyBase64]
    );
    
    // 다시 조회 (다른 프로세스가 동시에 생성했을 수 있음)
    const retryResult = await db.query(
      "SELECT key_base64 FROM room_keys WHERE room_id = $1",
      [roomId]
    );
    
    if (retryResult.rows.length > 0) {
      return res.json({ success: true, key: retryResult.rows[0].key_base64 });
    }

    res.json({ success: true, key: keyBase64 });
  } catch (error) {
    console.error("Failed to get or create room key:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Room 키 생성 (명시적 생성)
app.post("/api/rooms/:roomId/key", async (req, res) => {
  const { roomId } = req.params;
  const { key } = req.body; // 클라이언트에서 키를 전달할 수도 있음
  const db = getDB();

  try {
    let keyBase64: string;
    
    if (key) {
      // 클라이언트에서 키를 전달한 경우 사용
      keyBase64 = key;
    } else {
      // 서버에서 32바이트 랜덤 키 생성
      const crypto = await import("crypto");
      const keyBytes = crypto.randomBytes(32);
      keyBase64 = keyBytes.toString("base64");
    }

    await db.query(
      `INSERT INTO room_keys (room_id, key_base64, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (room_id) DO UPDATE SET key_base64 = $2, updated_at = NOW()`,
      [roomId, keyBase64]
    );

    res.json({ success: true, key: keyBase64 });
  } catch (error) {
    console.error("Failed to create room key:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 친구 신청 취소
app.delete("/api/friends/request/:requestId", async (req, res) => {
  const { requestId } = req.params;
  const db = getDB();

  try {
    // 신청 정보 가져오기
    const requestResult = await db.query(
      "SELECT * FROM friend_requests WHERE id = $1",
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Friend request not found" });
    }

    const request = requestResult.rows[0];

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, error: "Cannot cancel a processed friend request" });
    }

    // 신청 삭제
    await db.query(
      "DELETE FROM friend_requests WHERE id = $1",
      [requestId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel friend request:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 친구 삭제
app.delete("/api/friends", async (req, res) => {
  const { did1, did2 } = req.body;
  const db = getDB();

  if (!did1 || !did2) {
    return res.status(400).json({ success: false, error: "did1 and did2 are required" });
  }

  try {
    // 양방향 친구 관계 모두 삭제
    await db.query(
      "DELETE FROM friends WHERE (did1 = $1 AND did2 = $2) OR (did1 = $2 AND did2 = $1)",
      [did1, did2]
    );

    // Gateway를 통해 양쪽 모두에게 알림 전송
    gateway.pushNotification({
      type: "friend_removed",
      fromDid: did1,
      toDid: did2,
      friendDid: did2,
    });

    gateway.pushNotification({
      type: "friend_removed",
      fromDid: did1,
      toDid: did2,
      friendDid: did1,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to remove friend:", error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Gateway running on ws://localhost:${GATEWAY_PORT}`);
});

