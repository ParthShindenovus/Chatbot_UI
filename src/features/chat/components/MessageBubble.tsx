import { MessageRenderer } from "./MessageRenderer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTypingIndicator =
    message.id === "typing-indicator" && (!message.content || message.content === "");

  // Extract knowledge source links from metadata (if present)
  const knowledgeResults = (message.metadata?.knowledge_results ||
    []) as Array<{ source?: string; text?: string; score?: number }>;

    const knowledgeSources = Array.from(
      new Set(
        knowledgeResults
          .map((k) => k.source)
          .filter(
            (src): src is string =>
              typeof src === "string" &&
              src.trim() !== "" &&
              src.trim().toLowerCase() !== "n/a"
          )
      )
    );
    
  

  // idle_warning and session_end messages are displayed as normal assistant messages
  // They are identified by metadata.type but rendered with markdown like regular messages

  return (
    <div
      className={`widget-message-container ${isUser ? "widget-message-container-user" : ""}`}
    >
      <Avatar className="widget-avatar" style={{ width: "1.75rem", height: "1.75rem" }}>
        <AvatarFallback className={isUser ? "widget-avatar-fallback-primary" : ""}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div
        className={`widget-message-content ${isUser ? "widget-message-content-user" : ""}`}
      >
        <div className={`widget-message-bubble widget-message-bubble-assistant`}>
          {isTypingIndicator ? (
            <div className="widget-typing-dots-bounce">
              <div className="widget-typing-dot-bounce" />
              <div className="widget-typing-dot-bounce" />
              <div className="widget-typing-dot-bounce" />
            </div>
          ) : (
            <>
              <MessageRenderer content={message.content} isUser={isUser} />
              {isStreaming && (
                <span
                  className="widget-streaming-cursor"
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1rem",
                    marginLeft: "0.25rem",
                    background: "currentColor",
                    verticalAlign: "middle",
                    animation: "widget-blink 1s ease-in-out infinite",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Knowledge source references (assistant messages only) */}
        {!isUser && knowledgeSources.length > 0 && !isTypingIndicator && (
          <div
            className="widget-text-xs widget-text-muted"
            style={{
              padding: "0.5rem 0.25rem 0",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.35rem",
              alignItems: "center",
              lineHeight: 1.5,
            }}
          >
            <span style={{ marginRight: "0.25rem", fontWeight: 600, color: "#111827" }}>
              Sources:
            </span>
            {knowledgeSources.map((src, index) => (
              <a
                key={`${src}-${index}`}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "underline",
                  color: "#2563eb", // Tailwind blue-600
                  wordBreak: "break-all",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                [{index + 1}] {src}
              </a>
            ))}
          </div>
        )}

        {!isTypingIndicator && (
          <span className="widget-text-xs widget-text-muted" style={{ padding: "0 0.25rem" }}>
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
