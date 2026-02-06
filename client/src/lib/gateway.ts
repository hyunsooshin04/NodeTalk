import type { PushNotification } from "@nodetalk/shared";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "ws://localhost:3002";

/**
 * Gateway WebSocket 클라이언트
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
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
      console.log("✅ Gateway connected");
      if (this.roomId) {
        this.subscribe(this.roomId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as PushNotification;
        if (this.onMessageCallback) {
          this.onMessageCallback(notification);
        }
      } catch (error) {
        console.error("Error parsing gateway message:", error);
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", roomId }));
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
    this.ws?.close();
    this.ws = null;
  }
}

