import { Button } from "@/components/ui/button";
import { Loader2, Users, HelpCircle, BookOpen, ArrowLeft } from "lucide-react";

export type ConversationType = "sales" | "support" | "knowledge";

interface ConversationTypeSelectionProps {
  onSelect: (type: ConversationType) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

const options: Array<{
  type: ConversationType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: "sales",
    label: "Talk to Sales Team",
    description: "Get information and connect with sales",
    icon: <Users className="size-5" />,
  },
  {
    type: "support",
    label: "Talk to Support Team",
    description: "Get help with your account",
    icon: <HelpCircle className="size-5" />,
  },
  {
    type: "knowledge",
    label: "Know About WhipSmart",
    description: "Learn about novated leasing",
    icon: <BookOpen className="size-5" />,
  },
];

export function ConversationTypeSelection({
  onSelect,
  onBack,
  isLoading = false,
}: ConversationTypeSelectionProps) {
  return (
    <div className="flex flex-col h-full min-h-[400px] overflow-hidden">
      {/* Header with back button */}
      <div className="shrink-0 border-b flex items-center gap-2 bg-card p-3 sm:p-4">
        {onBack && (
          <Button onClick={onBack} variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-4 sm:size-5" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-base sm:text-lg font-semibold">How can we help you?</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select an option to start chatting
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
          {options.map((option) => (
          <Button
            key={option.type}
            variant="outline"
            className="w-full h-auto py-4 px-4 justify-start text-left"
            onClick={() => onSelect(option.type)}
            disabled={isLoading}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="shrink-0 mt-0.5 text-muted-foreground">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </div>
              </div>
            </div>
          </Button>
        ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 shrink-0">
            <Loader2 className="size-4 animate-spin" />
            <span>Setting up your chat...</span>
          </div>
        )}
      </div>
    </div>
  );
}

