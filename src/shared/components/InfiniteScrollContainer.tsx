import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface InfiniteScrollContainerProps {
  children: ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  className?: string;
  scrollContainer?: HTMLElement | null;
}

export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  className = "",
  scrollContainer,
}: InfiniteScrollContainerProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading || !sentinelRef.current) {
      if (observerRef.current && sentinelRef.current) {
        observerRef.current.unobserve(sentinelRef.current);
        observerRef.current = null;
      }
      return;
    }

    // Clean up previous observer
    if (observerRef.current && sentinelRef.current) {
      observerRef.current.unobserve(sentinelRef.current);
    }

    const options: IntersectionObserverInit = {
      root: scrollContainer || null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    }, options);

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current && sentinelRef.current) {
        observerRef.current.unobserve(sentinelRef.current);
        observerRef.current = null;
      }
    };
  }, [hasMore, isLoading, onLoadMore, scrollContainer]);

  return (
    <div className={className}>
      {children}
      {hasMore && (
        <div ref={sentinelRef} className="h-8 flex items-center justify-center py-4">
          {isLoading && (
            <div className="text-xs text-muted-foreground">Loading older messages...</div>
          )}
        </div>
      )}
    </div>
  );
}

