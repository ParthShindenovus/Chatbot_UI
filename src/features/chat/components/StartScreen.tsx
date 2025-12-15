import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface StartScreenProps {
  onStartChat: () => void;
  isLoading?: boolean;
}

export function StartScreen({ onStartChat, isLoading = false }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 overflow-hidden">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-semibold break-words">Welcome to WhipSmart Chat</h2>
        <p className="text-sm text-muted-foreground break-words">
          How can we help you today?
        </p>
        <Button onClick={onStartChat} size="lg" className="mt-4" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
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

