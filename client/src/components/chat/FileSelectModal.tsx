"use client";
import { useRef } from "react";

interface FileSelectModalProps {
  onClose: () => void;
  onImageSelect: (files: FileList | null) => void;
  onFileSelect: (files: FileList | null) => void;
}

export default function FileSelectModal({
  onClose,
  onImageSelect,
  onFileSelect,
}: FileSelectModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "rgba(31, 16, 34, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          minWidth: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "white" }}>
            첨부할 항목 선택
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "rgba(255, 255, 255, 0.7)",
              padding: 0,
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => {
              imageInputRef.current?.click();
            }}
            style={{
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <span>이미지 선택</span>
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => {
              onImageSelect(e.target.files);
              onClose();
            }}
            style={{ display: "none" }}
            accept="image/*"
            multiple
          />
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            style={{
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <span>파일 선택</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              onFileSelect(e.target.files);
              onClose();
            }}
            style={{ display: "none" }}
            multiple
          />
        </div>
      </div>
    </div>
  );
}

