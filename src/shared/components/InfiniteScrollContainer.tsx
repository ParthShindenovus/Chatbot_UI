import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface InfiniteScrollContainerProps {
  children: ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  className?: string;
  style?: React.CSSProperties;
  scrollContainer?: HTMLElement | null;
}

export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  className = "",
  style,
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

    // Use the provided scroll container or fallback to window
    const root = scrollContainer || null;
    
    const options: IntersectionObserverInit = {
      root: root,
      rootMargin: "200px", // Increased margin to trigger earlier
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !isLoading) {
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
    <div className={className} style={{ width: '100%', ...style }}>
      {children}
      {hasMore && (
        <div 
          ref={sentinelRef} 
          style={{ 
            height: '3rem', 
            minHeight: '3rem',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem 0',
            width: '100%',
            visibility: 'visible' // Ensure sentinel is visible
          }}
        >
          {isLoading && (
            <div className="widget-text-xs widget-text-muted">Loading more chats...</div>
          )}
        </div>
      )}
    </div>
  );
}
