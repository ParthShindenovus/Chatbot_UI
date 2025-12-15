import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatButtonProps {
  onClick: () => void;
  className?: string;
}

export function ChatButton({ onClick, className = "" }: ChatButtonProps) {
  // TODO: Calculate unread count from messages when Session type includes unreadCount
  const totalUnread = 0;

  return (
    <Button
      onClick={onClick}
      size="icon"
      className={`widget-chat-button ${className}`.trim()}
      aria-label="Open chat"
    >
      <MessageCircle style={{ width: '1.25rem', height: '1.25rem' }} />
      {totalUnread > 0 && (
        <Badge
          variant="destructive"
          className="widget-chat-button-badge"
        >
          {totalUnread > 9 ? "9+" : totalUnread}
        </Badge>
      )}
    </Button>
  );
}
