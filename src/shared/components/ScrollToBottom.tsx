import { useEffect, useRef } from "react";

interface ScrollToBottomProps {
  messages: unknown[];
  smooth?: boolean;
  scrollContainer?: HTMLElement | null;
}

export function ScrollToBottom({ messages, smooth = false, scrollContainer }: ScrollToBottomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // If scrollContainer is provided, scroll it directly
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        });
      } else {
        // Otherwise use scrollIntoView
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      }
    }
  }, [messages.length, smooth, scrollContainer]);

  return <div ref={messagesEndRef} />;
}

