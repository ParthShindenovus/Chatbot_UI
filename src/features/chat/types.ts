export interface Message {
  id: string;
  chatId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isRead: boolean;
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

