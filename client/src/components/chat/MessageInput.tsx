"use client";
import { useRef } from "react";

interface MessageInputProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  selectedFiles: Array<{ fileUrl: string; fileName: string; mimeType: string }>;
  onRemoveFile: (index: number) => void;
  onShowFileSelectModal: () => void;
  uploadingFile: boolean;
}

export default function MessageInput({
  message,
  onMessageChange,
  onSendMessage,
  selectedFiles,
  onRemoveFile,
  onShowFileSelectModal,
  uploadingFile,
}: MessageInputProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ 
      padding: "1.5rem",
      paddingTop: "0.5rem",
      flexShrink: 0,
      position: "relative",
      zIndex: 20
    }}>
      {selectedFiles.length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          maxHeight: "100px",
          overflowY: "auto",
        }}>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                color: "white",
              }}
            >
              <span style={{
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {file.fileName}
              </span>
              <button
                onClick={() => onRemoveFile(index)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: 0,
                  width: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "9999px",
        padding: "0.5rem 0.5rem 0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        transition: "all 0.2s"
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(209, 37, 244, 0.5)";
        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(209, 37, 244, 0.5)";
      }}
      >
        <input
          type="file"
          ref={imageInputRef}
          style={{ display: "none" }}
          accept="image/*"
          multiple
        />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
        />
        <button
          onClick={onShowFileSelectModal}
          disabled={uploadingFile}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            border: "none",
            color: uploadingFile ? "rgba(148, 163, 184, 1)" : "rgba(255, 255, 255, 0.7)",
            cursor: uploadingFile ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (!uploadingFile) {
              e.currentTarget.style.background = "#d125f4";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            if (!uploadingFile) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
            }
          }}
          title="파일 첨부"
        >
          <span style={{ fontSize: "1.125rem" }}>{uploadingFile ? "⏳" : "+"}</span>
        </button>
        <input
          type="text"
          placeholder="Spill the tea..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 500,
            outline: "none",
            padding: "0.625rem 0.5rem"
          }}
        />
        <button
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            background: "transparent",
            border: "none",
            color: "rgba(148, 163, 184, 1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.color = "#00f0ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(148, 163, 184, 1)";
          }}
        >
          <span style={{ fontSize: "1.125rem" }}>🎬</span>
        </button>
        <button
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            background: "transparent",
            border: "none",
            color: "rgba(148, 163, 184, 1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.color = "#ccff00";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(148, 163, 184, 1)";
          }}
        >
          <span style={{ fontSize: "1.125rem" }}>🎤</span>
        </button>
        <button
          onClick={onSendMessage}
          disabled={(!message.trim() && selectedFiles.length === 0) || uploadingFile}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: (!message.trim() && selectedFiles.length === 0) || uploadingFile 
              ? "rgba(255, 255, 255, 0.1)" 
              : "#d125f4",
            color: "white",
            border: "none",
            cursor: (!message.trim() && selectedFiles.length === 0) || uploadingFile ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: (!message.trim() && selectedFiles.length === 0) || uploadingFile 
              ? "none" 
              : "0 0 10px rgba(209, 37, 244, 0.5), 0 0 20px rgba(209, 37, 244, 0.3)"
          }}
          onMouseEnter={(e) => {
            if (!((!message.trim() && selectedFiles.length === 0) || uploadingFile)) {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#d125f4";
            }
          }}
          onMouseLeave={(e) => {
            if (!((!message.trim() && selectedFiles.length === 0) || uploadingFile)) {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#d125f4";
              e.currentTarget.style.color = "white";
            }
          }}
        >
          <span style={{ fontSize: "1.125rem", transform: "rotate(-45deg)", marginLeft: "0.25rem" }}>➤</span>
        </button>
      </div>
      <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
        <span style={{ fontSize: "0.625rem", color: "rgba(255, 255, 255, 0.4)", fontFamily: "monospace" }}>
          Press ⏎ to send • Shift + ⏎ for new line
        </span>
      </div>
    </div>
  );
}

