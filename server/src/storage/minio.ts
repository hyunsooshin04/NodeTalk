import { Client } from "minio";
import { randomUUID } from "crypto";

// MinIO 엔드포인트 파싱
const parseEndpoint = (endpoint?: string) => {
  if (!endpoint) return { host: "localhost", port: 9000 };
  
  const url = endpoint.replace("http://", "").replace("https://", "");
  const parts = url.split(":");
  return {
    host: parts[0] || "localhost",
    port: parseInt(parts[1] || "9000", 10),
  };
};

const { host, port } = parseEndpoint(process.env.MINIO_ENDPOINT);

const minioClient = new Client({
  endPoint: host,
  port: port,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "nodetalk";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://localhost:9000";

/**
 * MinIO 버킷 초기화 (없으면 생성)
 */
export async function initBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      console.log(`[MinIO] Created bucket: ${BUCKET_NAME}`);
      
      // 공개 읽기 정책 설정 (링크만 있으면 접근 가능)
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`[MinIO] Set public read policy for bucket: ${BUCKET_NAME}`);
    } else {
      console.log(`[MinIO] Bucket already exists: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("[MinIO] Error initializing bucket:", error);
    throw error;
  }
}

/**
 * 파일 업로드
 * @param fileBuffer 파일 버퍼
 * @param originalName 원본 파일명
 * @param mimeType MIME 타입
 * @returns 암호화된 파일 URL
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ fileUrl: string; fileName: string }> {
  try {
    // 암호화된 파일명 생성 (UUID)
    const fileExtension = originalName.split(".").pop() || "";
    const encryptedFileName = `${randomUUID()}.${fileExtension}`;
    
    // MinIO에 업로드
    await minioClient.putObject(BUCKET_NAME, encryptedFileName, fileBuffer, fileBuffer.length, {
      "Content-Type": mimeType,
    });
    
    // 공개 URL 생성
    const fileUrl = `${MINIO_ENDPOINT}/${BUCKET_NAME}/${encryptedFileName}`;
    
    console.log(`[MinIO] Uploaded file: ${encryptedFileName} (original: ${originalName})`);
    
    return {
      fileUrl,
      fileName: encryptedFileName,
    };
  } catch (error) {
    console.error("[MinIO] Error uploading file:", error);
    throw error;
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, fileName);
    console.log(`[MinIO] Deleted file: ${fileName}`);
  } catch (error) {
    console.error("[MinIO] Error deleting file:", error);
    throw error;
  }
}

/**
 * 파일 존재 여부 확인
 */
export async function fileExists(fileName: string): Promise<boolean> {
  try {
    await minioClient.statObject(BUCKET_NAME, fileName);
    return true;
  } catch (error) {
    return false;
  }
}

