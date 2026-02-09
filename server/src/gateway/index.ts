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
        console.log(`[Gateway] Client subscribed to room: ${roomId} (total clients: ${this.clients.get(roomId)!.size})`);
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
   * 새 메시지 알림 전달 (메시지 내용 포함)
   */
  pushNotification(notification: PushNotification) {
    if (notification.type === "new_message") {
      const { roomId, recordUri, messageContent } = notification;
      console.log(`[Gateway] pushNotification called for room ${roomId}, recordUri: ${recordUri}`);
      console.log(`[Gateway] messageContent:`, messageContent ? "present" : "missing");
      
      const clients = this.clients.get(roomId || "");
      console.log(`[Gateway] Clients for room ${roomId}:`, clients ? clients.size : 0);
      console.log(`[Gateway] All subscribed rooms:`, Array.from(this.clients.keys()));

      if (!clients || clients.size === 0) {
        console.log(`[Gateway] No clients subscribed to room ${roomId}. Available rooms: ${Array.from(this.clients.keys()).join(", ")}`);
        return;
      }

      const message: PushNotification = {
        type: "new_message",
        roomId,
        recordUri,
        messageContent, // 메시지 내용 포함
      };

      console.log(`[Gateway] Sending notification to ${clients.size} clients:`, JSON.stringify(message, null, 2));

      // 모든 구독자에게 알림 전달
      let sentCount = 0;
      let errorCount = 0;
      clients.forEach((client, index) => {
        console.log(`[Gateway] Client ${index + 1}/${clients.size} - readyState: ${client.readyState} (OPEN=1)`);
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(message));
            sentCount++;
            console.log(`[Gateway] ✓ Successfully sent to client ${index + 1}`);
          } catch (error) {
            errorCount++;
            console.error(`[Gateway] ✗ Error sending notification to client ${index + 1}:`, error);
          }
        } else {
          console.warn(`[Gateway] ✗ Client ${index + 1} is not open (state: ${client.readyState})`);
        }
      });

      console.log(`[Gateway] Result: Pushed notification to ${sentCount}/${clients.size} clients in room ${roomId} (errors: ${errorCount})`);
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
    } else if (notification.type === "member_left" || notification.type === "member_joined") {
      // 채팅방 멤버 변경 알림은 해당 채팅방을 구독한 모든 클라이언트에게 전송
      const { roomId } = notification;
      const clients = this.clients.get(roomId || "");

      if (!clients || clients.size === 0) {
        console.log(`[Gateway] No clients subscribed to room ${roomId} for member change notification`);
        return;
      }

      const message: PushNotification = {
        type: notification.type,
        roomId,
        memberDid: notification.memberDid,
      };

      console.log(`[Gateway] Sending ${notification.type} notification to ${clients.size} clients in room ${roomId}`);

      // 모든 구독자에게 알림 전달
      let sentCount = 0;
      let errorCount = 0;
      clients.forEach((client, index) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            errorCount++;
            console.error(`[Gateway] ✗ Error sending ${notification.type} notification to client ${index + 1}:`, error);
          }
        }
      });

      console.log(`[Gateway] Result: Pushed ${notification.type} notification to ${sentCount}/${clients.size} clients in room ${roomId} (errors: ${errorCount})`);
    }
  }

  /**
   * 특정 DID로 알림 전달 (방 참여자에게 직접 전송)
   */
  pushNotificationToDid(did: string, notification: PushNotification) {
    const clients = this.didClients.get(did);

    if (!clients || clients.size === 0) {
      console.log(`[Gateway] No clients subscribed to DID ${did}`);
      return;
    }

    const message: PushNotification = {
      ...notification,
    };

    console.log(`[Gateway] Sending notification to ${clients.size} clients for DID ${did}:`, JSON.stringify(message, null, 2));

    // 모든 구독자에게 알림 전달
    let sentCount = 0;
    let errorCount = 0;
    clients.forEach((client, index) => {
      console.log(`[Gateway] Client ${index + 1}/${clients.size} - readyState: ${client.readyState} (OPEN=1)`);
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          sentCount++;
          console.log(`[Gateway] ✓ Successfully sent to client ${index + 1}`);
        } catch (error) {
          errorCount++;
          console.error(`[Gateway] ✗ Error sending notification to client ${index + 1}:`, error);
        }
      } else {
        console.warn(`[Gateway] ✗ Client ${index + 1} is not open (state: ${client.readyState})`);
      }
    });

    console.log(`[Gateway] Result: Pushed notification to ${sentCount}/${clients.size} clients for DID ${did} (errors: ${errorCount})`);
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

