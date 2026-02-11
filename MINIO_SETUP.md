# MinIO 설정 가이드

이 문서는 NodeTalk 프로젝트에서 MinIO를 사용하기 위한 환경 변수 설정 가이드를 제공합니다.

## MinIO 정보

Docker Compose를 통해 MinIO가 자동으로 실행됩니다.

### 기본 설정

- **MinIO API 엔드포인트**: `http://localhost:9000`
- **MinIO Console**: `http://localhost:9001`
- **Root User**: `minioadmin`
- **Root Password**: `minioadmin`

> ⚠️ **보안 주의**: 이 설정은 개발 환경용입니다. 프로덕션 환경에서는 반드시 강력한 비밀번호로 변경하세요.

## 환경 변수 파일 생성

프로젝트에 환경 변수 파일을 생성하고 다음 내용을 추가하세요:

### 서버용 환경 변수 (server/.env)

`server` 디렉토리에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# MinIO 설정
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=nodetalk
MINIO_USE_SSL=false

# API URL
API_URL=http://localhost:3001
```

### 클라이언트용 환경 변수 (client/.env.local)

`client` 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# MinIO 설정 (필요한 경우)
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_MINIO_BUCKET_NAME=nodetalk

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 빠른 설정

터미널에서 다음 명령어로 환경 변수 파일을 생성할 수 있습니다:

**Windows (PowerShell):**
```powershell
# 서버용
@"
# MinIO 설정
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=nodetalk
MINIO_USE_SSL=false

# API URL
API_URL=http://localhost:3001
"@ | Out-File -FilePath server\.env -Encoding utf8

# 클라이언트용
@"
# MinIO 설정 (필요한 경우)
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_MINIO_BUCKET_NAME=nodetalk

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
"@ | Out-File -FilePath client\.env.local -Encoding utf8
```

**Linux/Mac:**
```bash
# 서버용
cat > server/.env << 'EOF'
# MinIO 설정
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=nodetalk
MINIO_USE_SSL=false

# API URL
API_URL=http://localhost:3001
EOF

# 클라이언트용
cat > client/.env.local << 'EOF'
# MinIO 설정 (필요한 경우)
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
NEXT_PUBLIC_MINIO_BUCKET_NAME=nodetalk

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
```

## MinIO Console 접속

1. Docker Compose를 실행한 후 브라우저에서 `http://localhost:9001` 접속
2. 로그인 정보:
   - **Username**: `minioadmin`
   - **Password**: `minioadmin`

## MinIO 사용 예시

### Node.js에서 MinIO 사용하기

```typescript
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT?.replace('http://', '').replace('https://', '') || 'localhost',
  port: 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// 버킷 생성
await minioClient.makeBucket(process.env.MINIO_BUCKET_NAME || 'nodetalk', 'us-east-1');

// 파일 업로드
await minioClient.fPutObject('nodetalk', 'object-name', './file-path');

// 파일 다운로드
await minioClient.fGetObject('nodetalk', 'object-name', './download-path');
```

## Docker Compose 실행

```bash
# MinIO 포함하여 모든 서비스 시작
docker-compose up -d

# MinIO만 시작
docker-compose up -d minio

# 로그 확인
docker-compose logs -f minio
```

## 데이터 영속성

MinIO 데이터는 `minio_data` Docker 볼륨에 저장되며, 컨테이너를 삭제해도 데이터가 유지됩니다.

## 문제 해결

### MinIO에 접속할 수 없는 경우

1. Docker Compose가 실행 중인지 확인:
   ```bash
   docker-compose ps
   ```

2. 포트가 이미 사용 중인지 확인:
   ```bash
   # Windows
   netstat -ano | findstr :9000
   netstat -ano | findstr :9001
   
   # Linux/Mac
   lsof -i :9000
   lsof -i :9001
   ```

3. MinIO 로그 확인:
   ```bash
   docker-compose logs minio
   ```

### 버킷이 없는 경우

MinIO Console (`http://localhost:9001`)에서 직접 버킷을 생성하거나, 애플리케이션 코드에서 자동으로 생성하도록 설정하세요.

## 보안 권장사항

프로덕션 환경에서는 다음을 권장합니다:

1. **강력한 비밀번호 사용**: `MINIO_ROOT_PASSWORD`를 강력한 비밀번호로 변경
2. **SSL/TLS 사용**: HTTPS를 통한 연결 설정
3. **접근 제어**: IAM 정책을 통한 세밀한 권한 관리
4. **네트워크 격리**: 내부 네트워크에서만 접근 가능하도록 설정

