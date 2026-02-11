-- NodeTalk Phase 1 Database Schema

-- 방(Room) 정보
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP,
  last_message_id INTEGER REFERENCES msg_index(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_last_message_at ON rooms(last_message_at DESC);

-- 방 참여자 정보
CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  member_did VARCHAR(255) NOT NULL,
  pds_endpoint VARCHAR(512),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_read_message_id INTEGER REFERENCES msg_index(id),
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

-- 친구 신청 (Phase 1)
CREATE TABLE IF NOT EXISTS friend_requests (
  id SERIAL PRIMARY KEY,
  from_did TEXT NOT NULL,
  to_did TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(from_did, to_did)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_did ON friend_requests(from_did);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_did ON friend_requests(to_did);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- 친구 관계 (Phase 1)
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  did1 TEXT NOT NULL,
  did2 TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(did1, did2)
);

CREATE INDEX IF NOT EXISTS idx_friends_did1 ON friends(did1);
CREATE INDEX IF NOT EXISTS idx_friends_did2 ON friends(did2);

-- Room 키 관리 (Phase 1: 서버에서 키 생성 및 관리)
CREATE TABLE IF NOT EXISTS room_keys (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL UNIQUE,
  key_base64 TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_keys_room_id ON room_keys(room_id);

-- 사용자 프로필 정보
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  did TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_did ON user_profiles(did);
