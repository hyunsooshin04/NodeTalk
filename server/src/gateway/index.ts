import { WebSocketServer, WebSocket } from "ws";
import type { PushNotification } from "@nodetalk/shared";

/**
 * Realtime Gateway - WebSocket 기반 실시간 알림
 */
export class RealtimeGateway {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map(); // roomId -> clients

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setup();
  }

  private setup() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("✅ New WebSocket connection");

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.removeClient(ws);
      });
    });

    console.log(`🚀 Gateway WebSocket server running on port ${this.wss.options.port}`);
  }

  /**
   * 클라이언트 메시지 처리
   */
  private handleMessage(ws: WebSocket, message: any) {
    if (message.type === "subscribe") {
      const { roomId } = message;
      if (!this.clients.has(roomId)) {
        this.clients.set(roomId, new Set());
      }
      this.clients.get(roomId)!.add(ws);
      console.log(`📌 Client subscribed to room: ${roomId}`);
    } else if (message.type === "unsubscribe") {
      const { roomId } = message;
      this.clients.get(roomId)?.delete(ws);
    }
  }

  /**
   * 새 메시지 알림 전달 (신호만, 내용 없음)
   */
  pushNotification(notification: PushNotification) {
    const { roomId, recordUri } = notification;
    const clients = this.clients.get(roomId);

    if (!clients || clients.size === 0) {
      return;
    }

    const message: PushNotification = {
      type: "new_message",
      roomId,
      recordUri,
    };

    // 모든 구독자에게 알림 전달
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });

    console.log(`📤 Pushed notification to ${clients.size} clients in room ${roomId}`);
  }

  /**
   * 클라이언트 제거
   */
  private removeClient(ws: WebSocket) {
    for (const [roomId, clients] of this.clients.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(roomId);
      }
    }
  }
}

