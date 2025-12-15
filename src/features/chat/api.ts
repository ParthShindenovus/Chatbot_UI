import axios from "@/lib/axios";

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface WidgetConfig {
  apiUrl: string;
  widgetUrl: string;
  features: {
    chatEnabled: boolean;
    fileUploadEnabled: boolean;
    voiceEnabled: boolean;
  };
  theme: {
    primaryColor: string;
    position: string;
  };
  organizationId: string;
  organizationName: string;
}

export interface Session {
  id: string;
  visitor?: {
    id: string;
  };
  external_user_id?: string | null; // Legacy field, may still be present
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  last_message?: string | null;
  last_message_at?: string | null;
}

export interface Message {
  id: string;
  session_id: string;
  message: string;
  role: "user" | "assistant";
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  message_id: string;
  response_id: string;
  conversation_type?: "sales" | "support" | "knowledge";
  conversation_data?: {
    step?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    issue?: string | null;
  };
  complete?: boolean;
  needs_info?: "name" | "email" | "phone" | "issue" | null;
  suggestions?: string[];
}

export interface MessagesResponse {
  results: Message[];
  count: number;
}

export interface Visitor {
  id: string;
  created_at: string;
  last_seen_at: string;
}

// Visitor API
export const createVisitor = async (): Promise<Visitor> => {
  const response = await axios.post<ApiResponse<Visitor>>("/api/chats/visitors/", {});
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to create visitor");
  }
  return response.data.data;
};

export const validateVisitor = async (visitorId: string): Promise<Visitor> => {
  const response = await axios.get<ApiResponse<Visitor>>(
    `/api/chats/visitors/${visitorId}/validate/`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to validate visitor");
  }
  return response.data.data;
};

// Widget API
export const getWidgetConfig = async (): Promise<WidgetConfig> => {
  const response = await axios.get<ApiResponse<WidgetConfig>>("/api/v1/widget/config/");
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to get widget config");
  }
  return response.data.data;
};

// Session API
export const createSession = async (
  visitorId: string
): Promise<Session> => {
  const response = await axios.post<ApiResponse<Session>>("/api/chats/sessions/", {
    visitor_id: visitorId,
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to create session");
  }
  return response.data.data;
};

export const getSession = async (sessionId: string): Promise<Session> => {
  const response = await axios.get<ApiResponse<Session>>(`/api/chats/sessions/${sessionId}/`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to get session");
  }
  return response.data.data;
};

export interface SessionsListResponse {
  results: Session[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const listSessions = async (
  visitorId?: string,
  isActive?: boolean,
  limit?: number,
  offset?: number
): Promise<{ sessions: Session[]; hasMore: boolean; total: number }> => {
  const params = new URLSearchParams();
  if (visitorId) params.append("visitor_id", visitorId);
  if (isActive !== undefined) params.append("is_active", String(isActive));
  if (limit) params.append("limit", String(limit));
  if (offset !== undefined) params.append("offset", String(offset));

  // API returns: { success: true, data: { results: { count, next, previous, results: [...] } } }
  const response = await axios.get<ApiResponse<{ results: SessionsListResponse }>>(
    `/api/chats/sessions/?${params.toString()}`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to list sessions");
  }
  // Access nested results: data.results.results
  const sessions = response.data.data.results.results || [];
  const total = response.data.data.results.count || 0;
  const currentCount = (offset || 0) + sessions.length;
  const hasMore = currentCount < total;
  
  return { sessions, hasMore, total };
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const response = await axios.delete<ApiResponse<void>>(`/api/chats/sessions/${sessionId}/`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete session");
  }
};

// Message API
export const sendMessage = async (
  message: string,
  sessionId: string,
  visitorId: string
): Promise<ChatResponse> => {
  const apiKey = (window as any).__CHAT_WIDGET_CONFIG__?.apiKey;
  
  const response = await axios.post<ApiResponse<ChatResponse>>(
    "/api/chats/messages/chat/",
    {
      message,
      session_id: sessionId,
      visitor_id: visitorId,
    },
    {
      headers: {
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    }
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to send message");
  }
  return response.data.data;
};

export const sendMessageStream = async (
  message: string,
  sessionId: string,
  visitorId: string,
  onChunk: (content: string) => void
): Promise<string> => {
  const apiKey = (window as any).__CHAT_WIDGET_CONFIG__?.apiKey;
  const apiUrl = (window as any).__CHAT_WIDGET_CONFIG__?.apiUrl || axios.defaults.baseURL;

  const response = await fetch(`${apiUrl}/api/chats/messages/chat/stream/`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      visitor_id: visitorId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let messageId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const json = line.slice(6);
        try {
          const data = JSON.parse(json);
          if (data.type === "chunk") {
            onChunk(data.content);
          } else if (data.type === "done") {
            messageId = data.message_id;
          }
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      }
    }
  }

  return messageId;
};

export const getChatHistory = async (
  sessionId: string,
  limit?: number,
  offset?: number
): Promise<{ messages: Message[]; hasMore: boolean; total: number }> => {
  const params = new URLSearchParams({ session_id: sessionId });
  if (limit) params.append("limit", String(limit));
  if (offset) params.append("offset", String(offset));

  const response = await axios.get<ApiResponse<MessagesResponse>>(
    `/api/chats/messages/?${params.toString()}`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to get chat history");
  }
  
  const messages = response.data.data.results || [];
  const total = response.data.data.count || 0;
  const currentCount = (offset || 0) + messages.length;
  const hasMore = currentCount < total;

  // Sort messages by timestamp (oldest first) - API might return in different order
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return { messages: sortedMessages, hasMore, total };
};

export interface SuggestionsResponse {
  suggestions: string[];
  session_id: string;
  message_count: number;
}

export const getSuggestions = async (
  sessionId: string,
  visitorId?: string
): Promise<SuggestionsResponse> => {
  const params = new URLSearchParams({ session_id: sessionId });
  if (visitorId) params.append("visitor_id", visitorId);

  const response = await axios.get<ApiResponse<SuggestionsResponse>>(
    `/api/chats/messages/suggestions/?${params.toString()}`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to get suggestions");
  }
  return response.data.data;
};

