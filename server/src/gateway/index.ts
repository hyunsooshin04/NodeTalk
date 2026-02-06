import { WebSocketServer, WebSocket } from "ws";
import type { PushNotification } from "@nodetalk/shared";

/**
 * Realtime Gateway - WebSocket 기반 실시간 알림
 */
export class RealtimeGateway {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map(); // roomId -> clients
  private didClients: Map<string, Set<WebSocket>> = new Map(); // did -> clients

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setup();
  }

  private setup() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("New WebSocket connection");

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

    console.log(`Gateway WebSocket server running on port ${this.wss.options.port}`);
  }

  /**
   * 클라이언트 메시지 처리
   */
  private handleMessage(ws: WebSocket, message: any) {
    if (message.type === "subscribe") {
      const { roomId } = message;
      if (roomId) {
        if (!this.clients.has(roomId)) {
          this.clients.set(roomId, new Set());
        }
        this.clients.get(roomId)!.add(ws);
        console.log(`Client subscribed to room: ${roomId}`);
      }
    } else if (message.type === "subscribe_did") {
      const { did } = message;
      if (did) {
        if (!this.didClients.has(did)) {
          this.didClients.set(did, new Set());
        }
        this.didClients.get(did)!.add(ws);
        console.log(`Client subscribed to DID: ${did}`);
      }
    } else if (message.type === "unsubscribe") {
      const { roomId } = message;
      this.clients.get(roomId)?.delete(ws);
    } else if (message.type === "unsubscribe_did") {
      const { did } = message;
      this.didClients.get(did)?.delete(ws);
    }
  }

  /**
   * 새 메시지 알림 전달 (신호만, 내용 없음)
   */
  pushNotification(notification: PushNotification) {
    if (notification.type === "new_message") {
      const { roomId, recordUri } = notification;
      const clients = this.clients.get(roomId || "");

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

      console.log(`Pushed notification to ${clients.size} clients in room ${roomId}`);
    } else if (notification.type === "friend_request") {
      const { toDid } = notification;
      const clients = this.didClients.get(toDid || "");

      if (!clients || clients.size === 0) {
        return;
      }

      const message: PushNotification = {
        type: "friend_request",
        fromDid: notification.fromDid,
        toDid: notification.toDid,
        requestId: notification.requestId,
      };

      // 모든 구독자에게 알림 전달
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      console.log(`Pushed friend request notification to ${clients.size} clients for DID ${toDid}`);
    } else if (notification.type === "friend_accepted") {
      const { friendDid } = notification;
      const clients = this.didClients.get(friendDid || "");

      if (!clients || clients.size === 0) {
        return;
      }

      const message: PushNotification = {
        type: "friend_accepted",
        fromDid: notification.fromDid,
        toDid: notification.toDid,
        friendDid: notification.friendDid,
      };

      // 모든 구독자에게 알림 전달
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      console.log(`Pushed friend accepted notification to ${clients.size} clients for DID ${friendDid}`);
    } else if (notification.type === "friend_removed") {
      const { friendDid } = notification;
      const clients = this.didClients.get(friendDid || "");

      if (!clients || clients.size === 0) {
        return;
      }

      const message: PushNotification = {
        type: "friend_removed",
        fromDid: notification.fromDid,
        toDid: notification.toDid,
        friendDid: notification.friendDid,
      };

      // 모든 구독자에게 알림 전달
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });

      console.log(`Pushed friend removed notification to ${clients.size} clients for DID ${friendDid}`);
    }
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
    for (const [did, clients] of this.didClients.entries()) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.didClients.delete(did);
      }
    }
  }
}

