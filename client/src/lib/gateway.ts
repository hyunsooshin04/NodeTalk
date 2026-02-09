import type { PushNotification } from "@nodetalk/shared";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:3002";

/**
 * Gateway WebSocket 클라이언트
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private subscribedDid: string | null = null;
  private onMessageCallback: ((notification: PushNotification) => void) | null = null;

  /**
   * 연결
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(GATEWAY_URL);

    this.ws.onopen = () => {
      console.log("[Gateway Client] Connected to Gateway");
      if (this.roomId) {
        console.log(`[Gateway Client] Re-subscribing to room: ${this.roomId}`);
        this.subscribe(this.roomId);
      }
      if (this.subscribedDid) {
        console.log(`[Gateway Client] Re-subscribing to DID: ${this.subscribedDid}`);
        this.subscribeDid(this.subscribedDid);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as PushNotification;
        console.log("[Gateway Client] ===== Received notification =====");
        console.log("[Gateway Client] Notification type:", notification.type);
        console.log("[Gateway Client] Full notification:", JSON.stringify(notification, null, 2));
        if (notification.type === "new_message") {
          console.log("[Gateway Client] RoomId:", notification.roomId);
          console.log("[Gateway Client] RecordUri:", notification.recordUri);
          console.log("[Gateway Client] Has messageContent:", !!notification.messageContent);
          if (notification.messageContent) {
            console.log("[Gateway Client] MessageContent senderDid:", notification.messageContent.senderDid);
            console.log("[Gateway Client] MessageContent ciphertext length:", notification.messageContent.ciphertext?.length);
            console.log("[Gateway Client] MessageContent nonce length:", notification.messageContent.nonce?.length);
          }
        }
        if (this.onMessageCallback) {
          console.log("[Gateway Client] Calling onMessageCallback...");
          this.onMessageCallback(notification);
          console.log("[Gateway Client] onMessageCallback completed");
        } else {
          console.warn("[Gateway Client] ✗ No callback registered for notifications");
        }
      } catch (error) {
        console.error("[Gateway Client] Error parsing gateway message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("Gateway error:", error);
    };

    this.ws.onclose = () => {
      console.log("Gateway disconnected");
      // 재연결 시도
      setTimeout(() => this.connect(), 3000);
    };
  }

  /**
   * Room 구독
   */
  subscribe(roomId: string) {
    this.roomId = roomId;
    console.log(`[Gateway Client] Subscribing to room: ${roomId}, ws state: ${this.ws?.readyState}`);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", roomId }));
      console.log(`[Gateway Client] Sent subscribe message for room: ${roomId}`);
    } else {
      console.warn(`[Gateway Client] WebSocket is not open (state: ${this.ws?.readyState}), will subscribe when connected`);
    }
  }

  /**
   * DID 구독 (친구 신청 알림용)
   */
  subscribeDid(did: string) {
    this.subscribedDid = did;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe_did", did }));
    }
  }

  /**
   * Room 구독 해제
   */
  unsubscribe(roomId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", roomId }));
    }
    if (this.roomId === roomId) {
      this.roomId = null;
    }
  }

  /**
   * 새 메시지 알림 콜백 설정
   */
  onMessage(callback: (notification: PushNotification) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * 연결 종료
   */
  disconnect() {
    if (this.roomId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", roomId: this.roomId }));
    }
    if (this.subscribedDid && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe_did", did: this.subscribedDid }));
    }
    this.ws?.close();
    this.ws = null;
  }
}

