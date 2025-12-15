import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ChatSummary } from "../types";

interface ChatListItemProps {
  chat: ChatSummary;
  onClick: () => void;
  onDelete?: (chatId: string) => void;
}

export function ChatListItem({ chat, onClick, onDelete }: ChatListItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    if (onDelete) {
      onDelete(chat.id);
    }
  };
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      onClick={onClick}
      className={`widget-chat-list-item ${chat.isActive ? "widget-chat-list-item-active" : ""}`}
    >
      <div className="widget-flex widget-items-center widget-justify-between widget-gap-2">
        <div className="widget-chat-list-item-content" onClick={onClick}>
          <div className="widget-chat-list-item-title-row">
            <h3 className="widget-chat-list-item-title">{chat.title}</h3>
            {chat.unreadCount > 0 && (
              <Badge variant="default" className="widget-text-xs" style={{ flexShrink: 0, padding: '0 0.375rem' }}>
                {chat.unreadCount}
              </Badge>
            )}
          </div>
          {chat.lastMessage && (
            <p className="widget-chat-list-item-message">
              {chat.lastMessage}
            </p>
          )}
        </div>
        <div className="widget-flex widget-items-center widget-gap-2" style={{ flexShrink: 0 }}>
          <span className="widget-text-xs widget-text-muted">
            {formatTime(chat.lastMessageTime)}
          </span>
          {onDelete && (
            <Button
              onClick={handleDelete}
              size="icon-sm"
              variant="ghost"
              className="widget-text-muted"
              style={{ 
                height: '1.5rem', 
                width: '1.5rem',
                color: 'var(--widget-muted-text)'
              }}
              aria-label="Delete chat"
            >
              <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
