export interface Message {
  id: string;
  chatId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>; // For metadata like type: "idle_warning", "session_end", or "session_snooze"
}

export interface ChatSummary {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isActive: boolean;
}

export interface Session {
  sessionId: string;
  widgetApiKey: string;
  initialized: boolean;
}

