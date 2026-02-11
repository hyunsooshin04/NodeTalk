"use client";

interface MessageBubbleProps {
  msg: any;
  isMyMessage: boolean;
  onDeleteMessage: (uri: string) => void;
  onImageClick: (url: string) => void;
  onFileDownload: (url: string, fileName: string) => void;
  isImageFile: (mimeType?: string) => boolean;
}

export default function MessageBubble({
  msg,
  isMyMessage,
  onDeleteMessage,
  onImageClick,
  onFileDownload,
  isImageFile,
}: MessageBubbleProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-end",
        maxWidth: "80%",
        alignSelf: isMyMessage ? "flex-end" : "flex-start",
        flexDirection: isMyMessage ? "row-reverse" : "row",
        position: "relative",
        zIndex: 10
      }}
    >
      {!isMyMessage && (
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: msg.profile?.avatarUrl
            ? `url(${msg.profile.avatarUrl}) center/cover`
            : "linear-gradient(to bottom right, #00f0ff, #d125f4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "0.25rem",
          flexShrink: 0,
          border: "2px solid rgba(209, 37, 244, 0.5)"
        }}>
          {!msg.profile?.avatarUrl && (
            <span style={{ fontSize: "1rem" }}>👤</span>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {!isMyMessage && (
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginLeft: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#00f0ff" }}>
              {msg.profile?.displayName || msg.profile?.handle || msg.senderDid || "Unknown"}
            </span>
            <span style={{ fontSize: "0.625rem", color: "rgba(255, 255, 255, 0.5)" }}>
              {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Seoul"
              })}
            </span>
          </div>
        )}
        <div style={{
          padding: "1rem",
          borderRadius: "1rem",
          borderBottomLeftRadius: isMyMessage ? "1rem" : "0",
          borderBottomRightRadius: isMyMessage ? "0" : "1rem",
          background: isMyMessage 
            ? "#d125f4" 
            : "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          color: isMyMessage ? "white" : "rgba(255, 255, 255, 0.9)",
          boxShadow: isMyMessage 
            ? "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)" 
            : "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
          {/* 파일 표시 */}
          {((msg.files && msg.files.length > 0) || msg.fileUrl) && (
            <div style={{ marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {msg.files && msg.files.length > 0 ? (
                msg.files.map((file: any, fileIdx: number) => (
                  isImageFile(file.mimeType) ? (
                    <div
                      key={fileIdx}
                      style={{
                        cursor: "pointer",
                        borderRadius: "4px",
                        overflow: "hidden",
                        maxWidth: "100%",
                      }}
                      onClick={() => onImageClick(file.fileUrl)}
                    >
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || "이미지"}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "400px",
                          borderRadius: "4px",
                          objectFit: "contain",
                          display: "block",
                        }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      key={fileIdx}
                      onClick={() => onFileDownload(file.fileUrl, file.fileName || "파일")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: isMyMessage ? "rgba(255, 255, 255, 0.2)" : "#f3f2f1",
                        borderRadius: "4px",
                        color: isMyMessage ? "white" : "#323130",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        gap: "0.5rem",
                        transition: "opacity 0.2s",
                        border: `1px solid ${isMyMessage ? "rgba(255, 255, 255, 0.3)" : "#e1dfdd"}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "0.8";
                        (e.currentTarget as HTMLElement).style.backgroundColor = isMyMessage 
                          ? "rgba(255, 255, 255, 0.3)" 
                          : "#edebe9";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                        (e.currentTarget as HTMLElement).style.backgroundColor = isMyMessage 
                          ? "rgba(255, 255, 255, 0.2)" 
                          : "#f3f2f1";
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{file.fileName || "파일"}</span>
                      <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "0.25rem" }}>다운로드</span>
                    </div>
                  )
                ))
              ) : (
                isImageFile(msg.mimeType) ? (
                  <div
                    style={{
                      cursor: "pointer",
                      borderRadius: "4px",
                      overflow: "hidden",
                      maxWidth: "100%",
                    }}
                    onClick={() => onImageClick(msg.fileUrl)}
                  >
                    <img
                      src={msg.fileUrl}
                      alt={msg.fileName || "이미지"}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        borderRadius: "4px",
                        objectFit: "contain",
                        display: "block",
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => onFileDownload(msg.fileUrl, msg.fileName || "파일")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: isMyMessage ? "rgba(255, 255, 255, 0.2)" : "#f3f2f1",
                      borderRadius: "4px",
                      color: isMyMessage ? "white" : "#323130",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      gap: "0.5rem",
                      transition: "opacity 0.2s",
                      border: `1px solid ${isMyMessage ? "rgba(255, 255, 255, 0.3)" : "#e1dfdd"}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "0.8";
                      (e.currentTarget as HTMLElement).style.backgroundColor = isMyMessage 
                        ? "rgba(255, 255, 255, 0.3)" 
                        : "#edebe9";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                      (e.currentTarget as HTMLElement).style.backgroundColor = isMyMessage 
                        ? "rgba(255, 255, 255, 0.2)" 
                        : "#f3f2f1";
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{msg.fileName || "파일"}</span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "0.25rem" }}>다운로드</span>
                  </div>
                )
              )}
            </div>
          )}
          {/* 메시지 텍스트 */}
          {msg.plaintext && (
            <div style={{ 
              fontSize: "0.875rem",
              wordBreak: "break-word",
              color: isMyMessage ? "white" : (msg.decrypted ? "rgba(255, 255, 255, 0.9)" : "#d13438"),
              fontStyle: msg.decrypted ? "normal" : "italic",
              lineHeight: "1.4"
            }}>
              {msg.plaintext}
            </div>
          )}
          {/* 시간 및 삭제 버튼 */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginTop: "0.375rem",
            fontSize: "0.6875rem",
            opacity: 0.7
          }}>
            <div>
              {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { 
                hour: "2-digit", 
                minute: "2-digit",
                timeZone: "Asia/Seoul"
              })}
            </div>
            {isMyMessage && msg.uri && (
              <button
                onClick={() => onDeleteMessage(msg.uri)}
                style={{
                  padding: "0.125rem 0.375rem",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "0.6875rem",
                  marginLeft: "0.5rem",
                }}
                title="메시지 삭제"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

