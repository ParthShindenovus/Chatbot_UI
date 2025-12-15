import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  onClick: () => void;
  className?: string;
}

export function ChatButton({ onClick, className }: ChatButtonProps) {
  // TODO: Calculate unread count from messages when Session type includes unreadCount
  const totalUnread = 0;

  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "fixed z-50 rounded-full shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "animate-in fade-in zoom-in-95",
        // Mobile: Smaller button, bottom-right
        "bottom-4 right-4 size-12",
        // Tablet: Medium size
        "sm:size-14",
        // Desktop: Standard size
        "md:bottom-4 md:right-4",
        className
      )}
      aria-label="Open chat"
    >
      <MessageCircle className="size-5 sm:size-6" />
      {totalUnread > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 size-4 sm:size-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs"
        >
          {totalUnread > 9 ? "9+" : totalUnread}
        </Badge>
      )}
    </Button>
  );
}

