"use client";

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        cursor: "pointer",
      }}
      onClick={onClose}
    >
      <img
        src={imageUrl}
        alt="확대 이미지"
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

