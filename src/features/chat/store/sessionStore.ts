import { create } from "zustand";
import type { Session as SessionType } from "../types";
import { getWidgetConfig, listSessions, createVisitor, validateVisitor, type Session as ApiSession } from "../api";
import axios from "@/lib/axios";

const VISITOR_ID_KEY = "whipsmart_visitor_id";

interface SessionStore extends SessionType {
  initialize: () => Promise<void>;
  widgetConfig: any | null;
  error: string | null;
  visitorId: string | null;
  conversationType: "sales" | "support" | "knowledge" | null;
  loadUserSessions: () => Promise<ApiSession[]>;
  initVisitor: () => Promise<string>;
  setConversationType: (type: "sales" | "support" | "knowledge") => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: "",
  widgetApiKey: "",
  initialized: false,
  widgetConfig: null,
  error: null,
  visitorId: null,
  conversationType: null,
  setConversationType: (type: "sales" | "support" | "knowledge") => {
    set({ conversationType: type });
  },
  initVisitor: async (): Promise<string> => {
    // Check localStorage for existing visitor_id
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    
    if (visitorId) {
      // Validate existing visitor
      try {
        console.log("🔍 Validating existing visitor:", visitorId);
        await validateVisitor(visitorId);
        console.log("✅ Visitor ID is valid");
        set({ visitorId });
        return visitorId;
      } catch (error: any) {
        console.warn("⚠️ Visitor ID is invalid, creating new visitor:", error);
        // Remove invalid visitor_id from localStorage
        localStorage.removeItem(VISITOR_ID_KEY);
      }
    }
    
    // Create new visitor
    console.log("➕ Creating new visitor...");
    try {
      const visitor = await createVisitor();
      visitorId = visitor.id;
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
      console.log("✅ Created new visitor:", visitorId);
      set({ visitorId });
      return visitorId;
    } catch (error: any) {
      console.error("❌ Failed to create visitor:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to create visitor"
      );
    }
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

      // Update axios baseURL if apiUrl is provided
      if (apiUrl) {
        axios.defaults.baseURL = apiUrl;
        console.log("✅ Axios baseURL set to:", apiUrl);
      }

      // Verify API key and get widget config
      console.log("🔍 Verifying API key...");
      let config;
      try {
        config = await getWidgetConfig();
        console.log("✅ API key verified, config received:", config);
      } catch (error: any) {
        console.error("❌ API key verification failed:", error);
        throw new Error(
          error.response?.data?.message || error.message || "Failed to verify API key"
        );
      }

      // Initialize visitor (check localStorage, validate, or create)
      console.log("👤 Initializing visitor...");
      const visitorId = await get().initVisitor();
      console.log("✅ Visitor initialized:", visitorId);

      // Load existing sessions for this visitor (will be loaded in chatStore)
      console.log("📋 Sessions will be loaded in chat store...");
      
      console.log("✅ Widget initialized successfully:", {
        visitorId: visitorId,
        config: config,
      });
      
      set({
        sessionId: "", // Will be set when user selects a chat
        widgetApiKey: apiKey,
        widgetConfig: config,
        visitorId: visitorId,
        initialized: true,
        error: null,
      });
    } catch (error: any) {
      console.error("❌ Failed to initialize widget:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      set({
        initialized: false,
        error: error.message || "Failed to initialize widget",
      });
    }
  },
  loadUserSessions: async (): Promise<ApiSession[]> => {
    const state = get();
    if (!state.visitorId) {
      return [];
    }

    try {
      const sessions = await listSessions(state.visitorId, true);
      return sessions;
    } catch (error) {
      console.error("Failed to load user sessions:", error);
      return [];
    }
  },
}));

