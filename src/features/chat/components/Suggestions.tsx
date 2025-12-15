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
      <div className="widget-flex widget-items-center widget-justify-center widget-p-4">
        <Loader2 className="widget-loader-spinner" />
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  // Show top 3 suggestions
  const topSuggestions = suggestions.slice(0, 3);

  return (
    <div className="widget-suggestions">
      {topSuggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          className="widget-suggestion-button"
          onClick={() => onSelect(suggestion)}
        >
          <span className="widget-suggestion-text">{suggestion}</span>
        </Button>
      ))}
    </div>
  );
}
