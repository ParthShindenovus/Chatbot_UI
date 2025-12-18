import { useEffect, useRef } from "react";

interface ScrollToBottomProps {
  messages: unknown[];
  smooth?: boolean;
  scrollContainer?: HTMLElement | null;
  streamingContent?: string; // Add streaming content to trigger scroll
  suggestions?: unknown[]; // Add suggestions to trigger scroll when they appear
}

export function ScrollToBottom({ messages, smooth = false, scrollContainer, streamingContent, suggestions }: ScrollToBottomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsLengthRef = useRef(0);

  // Scroll function
  const scrollToBottom = () => {
    if (scrollContainer) {
      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        });
      });
    } else if (messagesEndRef.current && messages.length > 0) {
      // Otherwise use scrollIntoView
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "end",
          });
        }
      });
    }
  };

  // Scroll when messages change or streaming content updates
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, smooth, scrollContainer, streamingContent]);

  // Scroll when suggestions appear (with a small delay to ensure DOM update)
  useEffect(() => {
    const currentSuggestionsLength = suggestions?.length || 0;
    const previousSuggestionsLength = suggestionsLengthRef.current;
    
    // Only scroll if suggestions were added (not removed)
    if (currentSuggestionsLength > previousSuggestionsLength && currentSuggestionsLength > 0) {
      // Use a small timeout to ensure suggestions are rendered in DOM
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    
    suggestionsLengthRef.current = currentSuggestionsLength;
  }, [suggestions?.length, scrollContainer, smooth]);

  // Watch for DOM changes using MutationObserver to catch any dynamic content
  useEffect(() => {
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user is near bottom (within 200px)
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      
      if (isNearBottom) {
        requestAnimationFrame(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        });
      }
    });

    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    return () => observer.disconnect();
  }, [scrollContainer]);

  return <div ref={messagesEndRef} />;
}

