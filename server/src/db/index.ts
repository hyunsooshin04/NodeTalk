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
      if (!error.message.includes("already exists")) {
        console.error("Schema setup error:", error.message);
      }
    }
  }
  
  console.log("Database schema initialized");
}

export function getDB() {
  if (!pool) {
    initDB();
  }
  return pool!;
}

