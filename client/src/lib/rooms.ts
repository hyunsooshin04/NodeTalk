/**
 * Room 관리 유틸리티
 */

/**
 * 1:1 DM용 Room ID 생성
 * 두 DID를 정렬하여 고유한 Room ID 생성
 */
export function generateDMRoomId(did1: string, did2: string): string {
  // DID를 정렬하여 항상 같은 Room ID 생성
  const sorted = [did1, did2].sort();
  return `dm-${sorted[0]}-${sorted[1]}`.replace(/:/g, "-");
}

/**
 * Room ID에서 참여자 DID 추출
 */
export function getDIDsFromRoomId(roomId: string): string[] | null {
  if (!roomId.startsWith("dm-")) {
    return null;
  }
  
  // dm- 접두사 제거
  const rest = roomId.replace("dm-", "");
  
  // DID는 :를 포함하므로, :를 기준으로 분리
  // 하지만 DID의 :는 여러 개이므로, 더 정확한 방법 필요
  // 간단하게: did:plc:xxx 형식에서 did:plc:를 찾아서 분리
  const didPattern = /(did:[^:]+:[^:]+)/g;
  const matches = rest.match(didPattern);
  
  if (matches && matches.length === 2) {
    return matches;
  }
  
  // 패턴 매칭 실패 시, -를 :로 변환하여 시도
  const parts = rest.split(/-did-/);
  if (parts.length === 2) {
    return [`did-${parts[0]}`.replace(/-/g, ":"), `did-${parts[1]}`.replace(/-/g, ":")];
  }
  
  return null;
}

/**
 * Room ID가 1:1 DM인지 확인
 */
export function isDMRoom(roomId: string): boolean {
  return roomId.startsWith("dm-");
}

