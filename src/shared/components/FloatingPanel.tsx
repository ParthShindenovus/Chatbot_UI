import type { ReactNode } from "react";

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
  className = "",
}: FloatingPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="widget-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        className={`widget-panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}
