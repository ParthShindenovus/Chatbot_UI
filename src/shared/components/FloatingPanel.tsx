import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function FloatingPanel({
  isOpen,
  onClose,
  children,
  className,
}: FloatingPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        className={cn(
          // Mobile: Fullscreen
          "fixed inset-0 z-50",
          "bg-card flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-4 fade-in",
          // Tablet: Almost fullscreen with margins
          "sm:inset-4 sm:rounded-lg sm:border sm:shadow-lg",
          // Desktop: Fixed size bottom-right
          "md:inset-auto md:bottom-20 md:right-4 md:left-auto md:top-auto",
          "md:w-[380px] md:h-[600px] md:max-h-[calc(100vh-120px)]",
          // Large desktop: Slightly larger
          "lg:w-[420px] lg:h-[650px]",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}

