import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pool: pg.Pool | null = null;

export function initDB() {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "nodetalk",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  return pool;
}

export async function setupSchema() {
  const pool = initDB();
  
  // Docker 환경에서는 dist 폴더에, 로컬에서는 src 폴더에 있음
  const schemaPath = join(__dirname, "schema.sql");
  let schema: string;
  
  try {
    schema = readFileSync(schemaPath, "utf-8");
  } catch (error) {
    // Docker 환경에서 dist/db/schema.sql 경로 시도
    const altPath = join(__dirname, "..", "..", "src", "db", "schema.sql");
    try {
      schema = readFileSync(altPath, "utf-8");
    } catch {
      console.error("Could not find schema.sql");
      throw error;
    }
  }
  
  // SQL 파일을 세미콜론으로 분리하여 각각 실행
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error: any) {
      // IF NOT EXISTS로 인한 에러는 무시
      // ALTER TABLE 등 기존 컬럼 추가 시도도 무시 (이미 존재하는 경우)
      if (!error.message.includes("already exists") && 
          !error.message.includes("duplicate column") &&
          !error.message.includes("column") && error.message.includes("already exists")) {
        console.error("Schema setup error:", error.message);
      }
    }
  }
  
  // 기존 테이블에 컬럼 추가 (마이그레이션)
  try {
    // rooms 테이블에 last_message_at 컬럼 추가 (없으면)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='rooms' AND column_name='last_message_at') THEN
          ALTER TABLE rooms ADD COLUMN last_message_at TIMESTAMP;
          CREATE INDEX IF NOT EXISTS idx_rooms_last_message_at ON rooms(last_message_at DESC);
        END IF;
      END $$;
    `);
  } catch (error: any) {
    // 무시 (이미 존재하거나 다른 이유로 실패)
  }

  // rooms 테이블에 last_message_id 컬럼 추가 (없으면)
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='rooms' AND column_name='last_message_id') THEN
          ALTER TABLE rooms ADD COLUMN last_message_id INTEGER;
        END IF;
        
        -- 외래 키 제약 조건 추가 (없으면)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name='fk_rooms_last_message_id') THEN
          ALTER TABLE rooms ADD CONSTRAINT fk_rooms_last_message_id 
            FOREIGN KEY (last_message_id) REFERENCES msg_index(id);
        END IF;
      END $$;
    `);
  } catch (error: any) {
    // 무시 (이미 존재하거나 다른 이유로 실패)
    if (!error.message.includes("already exists") && 
        !error.message.includes("duplicate column") &&
        !error.message.includes("constraint") && !error.message.includes("already exists")) {
      console.warn("Migration warning (last_message_id):", error.message);
    }
  }

  // room_members 테이블에 last_read_message_id 컬럼 추가 (없으면)
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='room_members' AND column_name='last_read_message_id') THEN
          ALTER TABLE room_members ADD COLUMN last_read_message_id INTEGER;
        END IF;
        
        -- 외래 키 제약 조건 추가 (없으면)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name='fk_room_members_last_read_message_id') THEN
          ALTER TABLE room_members ADD CONSTRAINT fk_room_members_last_read_message_id 
            FOREIGN KEY (last_read_message_id) REFERENCES msg_index(id);
        END IF;
      END $$;
    `);
  } catch (error: any) {
    // 무시 (이미 존재하거나 다른 이유로 실패)
    if (!error.message.includes("already exists") && 
        !error.message.includes("duplicate column") &&
        !error.message.includes("constraint") && !error.message.includes("already exists")) {
      console.warn("Migration warning (last_read_message_id):", error.message);
    }
  }
  
  console.log("Database schema initialized and migrated");
}

export function getDB() {
  if (!pool) {
    initDB();
  }
  return pool!;
}

