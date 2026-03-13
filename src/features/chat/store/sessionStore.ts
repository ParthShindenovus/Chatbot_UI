import { create } from "zustand";
import type { Session as SessionType } from "../types";
import { getWidgetConfig, listSessions, type Session as ApiSession } from "../api";
import axios from "@/lib/axios";

interface SessionStore extends SessionType {
  initialize: () => Promise<void>;
  widgetConfig: any | null;
  error: string | null;
  conversationType: "sales" | "support" | "knowledge" | null;
  loadUserSessions: () => Promise<ApiSession[]>;
  setConversationType: (type: "sales" | "support" | "knowledge") => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: "",
  widgetApiKey: "",
  initialized: false,
  widgetConfig: null,
  error: null,
  conversationType: null,
  setConversationType: (type: "sales" | "support" | "knowledge") => {
    set({ conversationType: type });
  },
  initialize: async () => {
    try {
      console.log("🔧 Starting widget initialization...");
      
      // Get API key from window config (widget mode)
      const widgetConfig = (window as any).__CHAT_WIDGET_CONFIG__;
      console.log("📋 Widget config from window:", widgetConfig);
      
      if (!widgetConfig || !widgetConfig.apiKey) {
        throw new Error("API key not found. Please provide data-api-key attribute.");
      }

      const apiKey = widgetConfig.apiKey;
      const apiUrl = widgetConfig.apiUrl || "";
      
      console.log("🔑 API Key:", apiKey.substring(0, 10) + "...");
      console.log("🌐 API URL:", apiUrl || "Using default");

      // Set axios defaults
      if (apiUrl) {
        axios.defaults.baseURL = apiUrl;
        console.log("✅ Axios baseURL set to:", apiUrl);
      }
      axios.defaults.headers.common["X-API-Key"] = apiKey;

      // Get widget configuration from backend
      console.log("🌐 Fetching widget config from backend...");
      try {
        const config = await getWidgetConfig();
        console.log("✅ Widget config loaded:", config);
        
        set({
          widgetApiKey: apiKey,
          widgetConfig: config,
          initialized: true,
          error: null,
        });

        console.log("✅ Widget initialization complete - backend will resolve visitor from IP");
      } catch (configError: any) {
        console.error("❌ Failed to fetch widget config:", configError);
        
        // Provide specific error messages for common issues
        let errorMessage = "Failed to initialize widget";
        if (configError.response?.status === 401) {
          errorMessage = "Invalid API key. Please check your widget configuration.";
        } else if (configError.response?.status === 403) {
          errorMessage = "Access denied. Please check your API key permissions.";
        } else if (configError.response?.status === 404) {
          errorMessage = "Widget configuration not found. Please check your API endpoint.";
        } else if (configError.code === 'NETWORK_ERROR' || !configError.response) {
          errorMessage = "Cannot connect to server. Please check if the backend is running.";
        } else {
          errorMessage = configError.response?.data?.message || configError.message || errorMessage;
        }
        
        set({
          error: errorMessage,
          initialized: false,
        });
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ Widget initialization failed:", error);
      // Error handling is now done in the config fetch try-catch above
      if (!error.message.includes("Invalid API key") && !error.message.includes("Access denied")) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to initialize widget";
        set({
          error: errorMessage,
          initialized: false,
        });
      }
      throw error;
    }
  },
  loadUserSessions: async (): Promise<ApiSession[]> => {
    try {
      console.log("📋 Loading user sessions...");
      // Backend now automatically filters by IP-resolved visitor and excludes INACTIVE sessions
      const { sessions } = await listSessions(20, 0);
      console.log(`✅ Loaded ${sessions.length} sessions`);
      return sessions;
    } catch (error: any) {
      console.error("❌ Failed to load sessions:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to load sessions"
      );
    }
  },
}));