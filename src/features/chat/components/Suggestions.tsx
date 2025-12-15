import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SuggestionsProps {
  suggestions: string[];
  isLoading?: boolean;
  onSelect: (suggestion: string) => void;
}

export function Suggestions({ suggestions, isLoading = false, onSelect }: SuggestionsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  // Show top 3 suggestions
  const topSuggestions = suggestions.slice(0, 3);

  return (
    <div className="mt-4 space-y-2">
      {topSuggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          className="w-full justify-start text-left h-auto py-2.5 px-4 whitespace-normal hover:bg-accent"
          onClick={() => onSelect(suggestion)}
        >
          <span className="text-sm">{suggestion}</span>
        </Button>
      ))}
    </div>
  );
}

