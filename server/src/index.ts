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
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Gateway running on ws://localhost:${GATEWAY_PORT}`);
});

