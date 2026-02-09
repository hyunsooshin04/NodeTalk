import { useState, useEffect } from "react";
import { ClientPDSAdapter } from "@/lib/pds";
import { GatewayClient } from "@/lib/gateway";
import { GatewayClient as GatewayClientType } from "@/lib/gateway";
import type { PushNotification } from "@nodetalk/shared";

interface UseAuthCallbacks {
  onLoginSuccess: (adapter: ClientPDSAdapter, gateway: GatewayClientType) => Promise<void>;
  onMessage: (notification: PushNotification, adapter: ClientPDSAdapter) => Promise<void>;
}

export function useAuth(callbacks: UseAuthCallbacks) {
  const [pds, setPds] = useState<ClientPDSAdapter | null>(null);
  const [gateway, setGateway] = useState<GatewayClientType | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const handleAutoLogin = async (savedIdentifier: string, savedPassword: string) => {
    try {
      const adapter = new ClientPDSAdapter();
      await adapter.login(savedIdentifier, savedPassword);
      setPds(adapter);
      setLoggedIn(true);

      const gw = new GatewayClient();
      gw.connect();
      gw.onMessage(async (notification: PushNotification) => {
        await callbacks.onMessage(notification, adapter);
      });
      gw.subscribeDid(adapter.getDid());
      setGateway(gw);

      await callbacks.onLoginSuccess(adapter, gw);
    } catch (error) {
      console.error("Auto login error:", error);
      localStorage.removeItem("nodetalk_login");
    }
  };

  const handleLogin = async () => {
    try {
      const adapter = new ClientPDSAdapter();
      await adapter.login(identifier, password);
      setPds(adapter);
      setLoggedIn(true);

      localStorage.setItem("nodetalk_login", JSON.stringify({ identifier, password }));

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const pdsEndpoint = "https://bsky.social";
        
        await fetch(`${API_URL}/api/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            did: adapter.getDid(), 
            pdsEndpoint 
          }),
        });
      } catch (error) {
        console.warn("Failed to auto-subscribe to AppView:", error);
      }

      const gw = new GatewayClient();
      gw.connect();
      gw.onMessage(async (notification: PushNotification) => {
        await callbacks.onMessage(notification, adapter);
      });
      gw.subscribeDid(adapter.getDid());
      setGateway(gw);

      await callbacks.onLoginSuccess(adapter, gw);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: " + (error as Error).message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nodetalk_login");
    setPds(null);
    setLoggedIn(false);
    setIdentifier("");
    setPassword("");
    gateway?.disconnect();
    setGateway(null);
  };

  useEffect(() => {
    const savedLogin = localStorage.getItem("nodetalk_login");
    if (savedLogin) {
      try {
        const { identifier: savedIdentifier, password: savedPassword } = JSON.parse(savedLogin);
        setIdentifier(savedIdentifier);
        setPassword(savedPassword);
        handleAutoLogin(savedIdentifier, savedPassword).finally(() => {
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Failed to restore login:", error);
        localStorage.removeItem("nodetalk_login");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  return {
    pds,
    gateway,
    loggedIn,
    identifier,
    password,
    isLoading,
    setIdentifier,
    setPassword,
    handleLogin,
    handleLogout,
  };
}

