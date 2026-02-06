# NodeTalk

> AT Protocol 기반 End-to-End Encrypted 분산 채팅 플랫폼
> 
> 
> Private. Federated. Node-to-Node.

NodeTalk는 **AT Protocol(PDS) 위에서 동작하는 완전 분산형(E2EE) 메신저 아키텍처**입니다.

기존 메신저처럼 중앙 서버에 메시지를 저장하지 않고,

**각 사용자의 Personal Data Server(PDS)가 하나의 노드가 되어 직접 통신**합니다.

모든 메시지와 파일은 **클라이언트에서 암호화된 후 저장**되며,

서버는 오직 **메타데이터/동기화/실시간 알림 역할만 수행**합니다.

즉, 서버는 메시지 내용을 알 수 없습니다.

---

## 🚀 Phase 1 구현 완료

Phase 1은 **암호화된 DM 1:1 메시지 한 줄 보내기**를 목표로 합니다.

### 구현된 기능

- ✅ PDS Adapter (DID resolve, createRecord, listRecords)
- ✅ Client Crypto Layer (단순 shared key 암복호화)
- ✅ 단순 DM (A→B 저장, B→fetch→decrypt)
- ✅ AppView 최소 버전 (record 감지, msgRef 인덱스만 저장)
- ✅ Gateway 최소 버전 (WebSocket, "새 메시지 있음" push)

### 완료 기준

✅ 브라우저 2개 열고 텍스트 채팅 가능

---

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18+
- Docker (PostgreSQL용)
- Bluesky 계정 (또는 Self-host PDS)

### 1. 의존성 설치

```bash
npm install
```

### 2. Database 설정

```bash
# Docker로 PostgreSQL 실행
docker-compose up -d postgres
```

PostgreSQL이 다음 설정으로 실행됩니다:
- Host: localhost
- Port: 5432
- Database: nodetalk
- User: postgres
- Password: postgres

### 3. 서버 환경 변수 설정

```bash
cd server
cp .env.example .env
# .env 파일 수정 (필요시)
```

### 4. 서버 실행

```bash
npm run server
```

서버는 다음 포트에서 실행됩니다:
- API Server: http://localhost:3001
- Gateway (WebSocket): ws://localhost:3002

### 5. 클라이언트 실행

새 터미널에서:

```bash
npm run client
```

클라이언트는 http://localhost:3000 에서 실행됩니다.

### PostgreSQL 중지

```bash
docker-compose down
```

---

## 🧪 테스트 방법

### 1. 두 개의 브라우저 창 열기

### 2. 각각 다른 Bluesky 계정으로 로그인

- Identifier: Bluesky handle 또는 email
- Password: App Password (Bluesky 설정에서 생성)

### 3. 같은 Room ID 입력

예: `dm-user1-user2`

### 4. 메시지 전송 및 수신 확인

- 한 브라우저에서 메시지 전송
- 다른 브라우저에서 실시간 알림 수신 및 메시지 표시 확인

---

## 🏗 프로젝트 구조

```
nodetalk/
├── client/          # Next.js 클라이언트
│   └── src/
│       ├── app/     # Next.js App Router
│       └── lib/     # PDS, Crypto, Gateway 클라이언트
├── server/          # Node.js 서버
│   └── src/
│       ├── appview/ # AppView Indexer
│       ├── gateway/ # WebSocket Gateway
│       ├── pds/     # PDS Adapter
│       └── db/      # Database 스키마
└── shared/          # 공통 타입 정의
    └── src/
        └── types.ts
```

---

## 🔐 보안 모델 (Phase 1)

### 암호화

- **방식**: AES-GCM (256-bit key)
- **키 관리**: 단순 shared symmetric key (Phase 1)
- **키 저장**: 클라이언트 로컬 스토리지

### 서버 역할

- **AppView**: msgRef 인덱스만 저장 (평문 저장 안 함)
- **Gateway**: 신호만 전달 (메시지 내용 전달 안 함)
- **PDS**: 암호화된 레코드만 저장

---

## 📝 다음 단계 (Phase 2+)

- [ ] 그룹 채팅
- [ ] MinIO 파일 전송
- [ ] 멀티 디바이스 키 동기화
- [ ] Ratchet 키 교체
- [ ] 검색 기능

---

## 📄 라이선스

MIT
