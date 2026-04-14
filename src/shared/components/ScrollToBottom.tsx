import { useEffect, useRef, useState } from "react";

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
  const [showButton, setShowButton] = useState(false);

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
    setShowButton(false);
  };

  const checkScrollPosition = () => {
    if (!scrollContainer) {
      setShowButton(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;

    if (isNearBottom) {
      setShowButton(false);
    } else if (streamingContent) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  // Keep button visible when streaming and not at bottom
  useEffect(() => {
    const viewport = scrollContainer;
    if (!viewport) return;

    checkScrollPosition();

    const listener = () => {
      checkScrollPosition();
    };

    viewport.addEventListener("scroll", listener);
    return () => viewport.removeEventListener("scroll", listener);
  }, [scrollContainer, streamingContent]);

  // Only auto-scroll when not streaming (initial loads or regular new messages)
  useEffect(() => {
    if (!streamingContent) {
      scrollToBottom();
    } else {
      checkScrollPosition();
    }
  }, [messages.length, smooth, scrollContainer, streamingContent]);

  // Scroll when suggestions appear (with a small delay to ensure DOM update)
  useEffect(() => {
    const currentSuggestionsLength = suggestions?.length || 0;
    const previousSuggestionsLength = suggestionsLengthRef.current;

    // Only scroll if suggestions were added (not removed) and not streaming
    if (!streamingContent && currentSuggestionsLength > previousSuggestionsLength && currentSuggestionsLength > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    suggestionsLengthRef.current = currentSuggestionsLength;
  }, [suggestions?.length, scrollContainer, smooth, streamingContent]);

  // Watch for DOM changes using MutationObserver to catch any dynamic content
  useEffect(() => {
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user is near bottom (within 200px) and not streaming
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (!streamingContent && isNearBottom) {
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
  }, [scrollContainer, streamingContent]);

  return (
    <>
      <div ref={messagesEndRef} />
      {showButton && (
        <button
          type="button"
          className="widget-scroll-to-bottom-button"
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "6rem",
            zIndex: 200,
            padding: "0.5rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid var(--widget-border)",
            background: "var(--widget-bg)",
            color: "var(--widget-text)",
            boxShadow: "0 0 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
          }}
          onClick={scrollToBottom}
        >
          Scroll to bottom
        </button>
      )}
    </>
  );
}


