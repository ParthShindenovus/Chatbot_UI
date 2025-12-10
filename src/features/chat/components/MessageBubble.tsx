import { MessageRenderer } from "./MessageRenderer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTypingIndicator = message.id === "typing-indicator" && !message.content;

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-3 mb-3 sm:mb-4 animate-in fade-in slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="size-7 sm:size-8 shrink-0">
        <AvatarFallback className={cn(
          "text-xs sm:text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%] sm:max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-3 py-2 sm:px-4 sm:py-2.5",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isTypingIndicator ? (
            <div className="flex items-center gap-1 py-1">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs ml-2 opacity-70">AI is typing...</span>
            </div>
          ) : (
            <>
              <MessageRenderer content={message.content} />
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </>
          )}
        </div>
        {!isTypingIndicator && (
          <span className="text-[10px] sm:text-xs text-muted-foreground px-1">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

