import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface StartScreenProps {
  onStartChat: () => void;
  isLoading?: boolean;
}

export function StartScreen({ onStartChat, isLoading = false }: StartScreenProps) {
  return (
    <div className="widget-start-screen">
      <div className="widget-start-content">
        <div className="widget-start-icon-container">
          <div className="widget-start-icon-circle">
            <MessageCircle style={{ width: '2rem', height: '2rem', color: 'var(--widget-primary)' }} />
          </div>
        </div>
        <h2 className="widget-start-title">Welcome to WhipSmart Chat</h2>
        <p className="widget-start-description">
          How can we help you today?
        </p>
        <Button onClick={onStartChat} size="lg" className="widget-mt-4" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="widget-loader-spinner" style={{ marginRight: '0.5rem' }} />
              Starting...
            </>
          ) : (
            "Start Chat"
          )}
        </Button>
      </div>
    </div>
  );
}
