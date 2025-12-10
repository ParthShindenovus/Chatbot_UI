import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
      className={cn(
        "p-3 sm:p-4 cursor-pointer transition-all hover:bg-accent/50 active:bg-accent/70",
        chat.isActive && "bg-accent border-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-xs sm:text-sm truncate">{chat.title}</h3>
            {chat.unreadCount > 0 && (
              <Badge variant="default" className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2">
                {chat.unreadCount}
              </Badge>
            )}
          </div>
          {chat.lastMessage && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {chat.lastMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {formatTime(chat.lastMessageTime)}
          </span>
          {onDelete && (
            <Button
              onClick={handleDelete}
              size="icon"
              variant="ghost"
              className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
              aria-label="Delete chat"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

