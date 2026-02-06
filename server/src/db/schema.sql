-- NodeTalk Phase 1 Database Schema

-- 방(Room) 정보
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 방 참여자 정보
CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  member_did VARCHAR(255) NOT NULL,
  pds_endpoint VARCHAR(512),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, member_did)
);

-- 메시지 참조 인덱스 (평문 저장 안 함)
CREATE TABLE IF NOT EXISTS msg_index (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  record_uri TEXT NOT NULL UNIQUE,
  sender_did TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_did ON room_members(member_did);
CREATE INDEX IF NOT EXISTS idx_room_id ON msg_index(room_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON msg_index(created_at);
CREATE INDEX IF NOT EXISTS idx_sender_did ON msg_index(sender_did);
