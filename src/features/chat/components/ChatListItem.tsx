import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Bot } from "lucide-react";
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
    // Show time only in format: HH:MM AM/PM
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card
      onClick={onClick}
      className={`widget-chat-list-item ${chat.isActive ? "widget-chat-list-item-active" : ""}`}
    >
      <div className="widget-flex widget-items-center widget-gap-3" style={{ width: '100%', minWidth: 0 }}>
        {/* Bot Avatar */}
        <Avatar className="widget-avatar" style={{ width: '2.5rem', height: '2.5rem', flexShrink: 0 }}>
          <AvatarFallback style={{ backgroundColor: 'var(--widget-primary)', color: 'var(--widget-primary-text)' }}>
            <Bot style={{ width: '1.25rem', height: '1.25rem' }} />
          </AvatarFallback>
        </Avatar>
        
        {/* Content */}
        <div className="widget-chat-list-item-content" onClick={onClick} style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
          <div className="widget-flex widget-items-center widget-justify-between widget-gap-2" style={{ marginBottom: '0.25rem' }}>
            <h3 className="widget-chat-list-item-title" style={{ margin: 0 }}>{chat.title}</h3>
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
          {chat.lastMessage && (
            <p className="widget-chat-list-item-message">
              {chat.lastMessage}
            </p>
          )}
          {chat.unreadCount > 0 && (
            <Badge variant="default" className="widget-text-xs" style={{ marginTop: '0.25rem', padding: '0 0.375rem' }}>
              {chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
