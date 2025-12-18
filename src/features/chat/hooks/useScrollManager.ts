import { useRef, useEffect } from "react";
import type { Message } from "../types";

/**
 * Custom hook for managing scroll behavior
 * Single Responsibility: Handle scroll position and viewport management
 */
export function useScrollManager(
  messages: Message[],
  isLoadingOlder: boolean,
  chatId: string,
  streamingContent?: string // Add streaming content to trigger scroll updates
) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const shouldScrollToBottomRef = useRef(true);
  const previousStreamingContentRef = useRef<string>("");

  // Find scroll viewport reference
  useEffect(() => {
    const findViewport = () => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector(
          '[data-slot="scroll-area-viewport"]'
        ) as HTMLElement;
        if (viewport) {
          scrollViewportRef.current = viewport;
          return true;
        }
      }
      return false;
    };

    if (!findViewport()) {
      const timer = setTimeout(() => {
        findViewport();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chatId]);

  // Handle scroll position when messages change or streaming content updates
  useEffect(() => {
    if (!scrollViewportRef.current) return;

    const viewport = scrollViewportRef.current;
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;
    const currentScrollHeight = viewport.scrollHeight;
    const previousScrollHeight = previousScrollHeightRef.current;
    const currentStreamingContent = streamingContent || "";
    const previousStreamingContent = previousStreamingContentRef.current;

    const isNewMessage = currentMessageCount > previousMessageCount;
    const isStreamingUpdate = currentStreamingContent !== previousStreamingContent && currentStreamingContent.length > previousStreamingContent.length;
    const isInitialLoad = isInitialLoadRef.current;

    if (isInitialLoad && messages.length > 0) {
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          isInitialLoadRef.current = false;
          shouldScrollToBottomRef.current = false;
        }
      });
    } else if (isLoadingOlder) {
      const scrollDiff = currentScrollHeight - previousScrollHeight;
      if (scrollDiff > 0) {
        requestAnimationFrame(() => {
          if (viewport) {
            viewport.scrollTop = viewport.scrollTop + scrollDiff;
          }
        });
      }
      shouldScrollToBottomRef.current = false;
    } else if ((isNewMessage || isStreamingUpdate) && shouldScrollToBottomRef.current) {
      // Scroll to bottom for new messages or streaming content updates
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    }

    previousMessageCountRef.current = currentMessageCount;
    previousScrollHeightRef.current = viewport.scrollHeight;
    previousStreamingContentRef.current = currentStreamingContent;
  }, [messages.length, isLoadingOlder, chatId, streamingContent]);

  // Track user scroll to determine if we should auto-scroll
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldScrollToBottomRef.current = isNearBottom;
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [chatId]);

  const enableAutoScroll = () => {
    shouldScrollToBottomRef.current = true;
  };

  return {
    scrollAreaRef,
    scrollViewportRef,
    enableAutoScroll,
  };
}

