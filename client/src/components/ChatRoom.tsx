"use client";
import { useState } from "react";
import type { Friend } from "@/lib/friends";
import ChatHeader from "./chat/ChatHeader";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";
import ImageModal from "./chat/ImageModal";
import FileSelectModal from "./chat/FileSelectModal";
import InviteModal from "./chat/InviteModal";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  memberCount: number;
  messages: any[];
  isLoadingMessages: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (files?: Array<{ fileUrl: string; fileName: string; mimeType: string }>) => void;
  onDeleteMessage: (uri: string) => void;
  onUploadFile: (file: File) => Promise<{ fileUrl: string; fileName: string; mimeType: string }>;
  onLeaveRoom: () => void;
  onInviteToRoom: (friendDid: string) => Promise<void>;
  friends: Friend[];
  myDid: string | null;
}

export default function ChatRoom({
  roomName,
  memberCount,
  messages,
  isLoadingMessages,
  message,
  onMessageChange,
  onSendMessage,
  onDeleteMessage,
  onUploadFile,
  onInviteToRoom,
  friends,
  myDid,
}: ChatRoomProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showFileSelectModal, setShowFileSelectModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [invitingFriend, setInvitingFriend] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ fileUrl: string; fileName: string; mimeType: string }>>([]);

  // 이미지 타입인지 확인하는 헬퍼 함수
  const isImageFile = (mimeType?: string): boolean => {
    if (!mimeType) return false;
    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];
    return imageTypes.some(type => mimeType.toLowerCase().startsWith(type));
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    setShowFileSelectModal(false);
    try {
      const uploadPromises = Array.from(files).map(file => onUploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);
      setSelectedFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      alert("파일 업로드 실패: " + (error as Error).message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendWithFiles = async () => {
    if (selectedFiles.length > 0) {
      await onSendMessage(selectedFiles);
      setSelectedFiles([]);
    } else {
      await onSendMessage();
    }
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInvite = async (friendDid: string) => {
    setInvitingFriend(friendDid);
    try {
      await onInviteToRoom(friendDid);
      alert("친구를 초대했습니다.");
      setShowInviteModal(false);
    } catch (error) {
      alert("초대 실패: " + (error as Error).message);
    } finally {
      setInvitingFriend(null);
    }
  };

  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "transparent",
      overflow: "hidden",
      height: "100%"
    }}>
      <ChatHeader
        roomName={roomName}
        memberCount={memberCount}
        onShowInviteModal={() => setShowInviteModal(true)}
      />

      <MessageList
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        myDid={myDid}
        onDeleteMessage={onDeleteMessage}
        onImageClick={(url) => {
          setSelectedImageUrl(url);
          setShowImageModal(true);
        }}
        onFileDownload={handleDownloadFile}
        isImageFile={isImageFile}
      />

      <MessageInput
        message={message}
        onMessageChange={onMessageChange}
        onSendMessage={handleSendWithFiles}
        selectedFiles={selectedFiles}
        onRemoveFile={(index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
        onShowFileSelectModal={() => setShowFileSelectModal(true)}
        uploadingFile={uploadingFile}
      />

      {showImageModal && (
        <ImageModal
          imageUrl={selectedImageUrl}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImageUrl(null);
          }}
        />
      )}

      {showFileSelectModal && (
        <FileSelectModal
          onClose={() => setShowFileSelectModal(false)}
          onImageSelect={handleFileSelect}
          onFileSelect={handleFileSelect}
        />
      )}

      {showInviteModal && (
        <InviteModal
          friends={friends}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
          invitingFriend={invitingFriend}
        />
      )}
    </div>
  );
}
