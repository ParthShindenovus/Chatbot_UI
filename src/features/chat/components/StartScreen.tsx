import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2, MessageSquare } from "lucide-react";

interface StartScreenProps {
  onStartChat: () => void;
  onViewChats?: () => void;
  isLoading?: boolean;
  hasExistingChats?: boolean;
}

export function StartScreen({ onStartChat, onViewChats, isLoading = false, hasExistingChats = false }: StartScreenProps) {
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
        <div className="widget-flex widget-flex-col widget-gap-2 widget-mt-4" style={{ width: '100%' }}>
          <Button onClick={onStartChat} size="lg" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? (
              <>
                <Loader2 className="widget-loader-spinner" style={{ marginRight: '0.5rem' }} />
                Starting...
              </>
            ) : (
              "Start Chat"
            )}
          </Button>
          {hasExistingChats && onViewChats && (
            <Button 
              onClick={onViewChats} 
              size="lg" 
              variant="outline" 
              style={{ width: '100%' }}
            >
              <MessageSquare style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              View Chats
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
