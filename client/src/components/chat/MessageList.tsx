"use client";
import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: any[];
  isLoadingMessages: boolean;
  myDid: string | null;
  onDeleteMessage: (uri: string) => void;
  onImageClick: (url: string) => void;
  onFileDownload: (url: string, fileName: string) => void;
  isImageFile: (mimeType?: string) => boolean;
}

export default function MessageList({
  messages,
  isLoadingMessages,
  myDid,
  onDeleteMessage,
  onImageClick,
  onFileDownload,
  isImageFile,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        position: "relative"
      }}
    >
      {/* Watermark Logo */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: 0.03
      }}>
        <span style={{ fontSize: "300px", color: "white" }}>⚡</span>
      </div>

      {isLoadingMessages ? (
        <p style={{ color: "rgba(255, 255, 255, 0.5)", margin: "auto" }}>메시지 내용 불러오는 중...</p>
      ) : messages.length === 0 ? (
        <p style={{ color: "rgba(255, 255, 255, 0.5)", margin: "auto" }}>메시지가 없습니다.</p>
      ) : (
        <>
          {/* Date Divider */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{
              padding: "0.25rem 1rem",
              borderRadius: "9999px",
              background: "rgba(0, 0, 0, 0.2)",
              fontSize: "0.75rem",
              color: "rgba(255, 255, 255, 0.5)",
              fontFamily: "monospace",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}>Today</span>
          </div>

          {messages.map((msg, idx) => {
            const isMyMessage = msg.senderDid === myDid;
            return (
              <MessageBubble
                key={msg.uri || idx}
                msg={msg}
                isMyMessage={isMyMessage}
                onDeleteMessage={onDeleteMessage}
                onImageClick={onImageClick}
                onFileDownload={onFileDownload}
                isImageFile={isImageFile}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

