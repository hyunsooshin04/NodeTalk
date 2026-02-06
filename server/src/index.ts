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

// Room 생성/참여
app.post("/api/rooms/:roomId/join", async (req, res) => {
  const { roomId } = req.params;
  const { did, pdsEndpoint } = req.body;
  
  const db = getDB();
  
  // Room이 없으면 생성
  await db.query(
    "INSERT INTO rooms (room_id) VALUES ($1) ON CONFLICT (room_id) DO NOTHING",
    [roomId]
  );
  
  // 참여자 추가
  await db.query(
    `INSERT INTO room_members (room_id, member_did, pds_endpoint)
     VALUES ($1, $2, $3)
     ON CONFLICT (room_id, member_did) DO UPDATE
     SET pds_endpoint = $3`,
    [roomId, did, pdsEndpoint]
  );
  
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

