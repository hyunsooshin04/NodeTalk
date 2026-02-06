import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NodeTalk - Phase 1",
  description: "AT Protocol 기반 E2EE 채팅 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

