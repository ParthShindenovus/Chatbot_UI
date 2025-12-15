import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface MessageInputHandle {
  focus: () => void;
}

/**
 * MessageInput Component
 * Single Responsibility: Render input field and handle message submission
 * Uses forwardRef for imperative focus control instead of useEffect
 */
export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ onSend, disabled = false, placeholder = "Type your message..." }, ref) => {
    const [message, setMessage] = useState("");
    const inputElementRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        setTimeout(() => {
          inputElementRef.current?.focus();
        }, 100);
      },
    }));

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (message.trim() && !disabled) {
        onSend(message.trim());
        setMessage("");
      }
    };

    return (
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 sm:p-4 border-t">
        <Input
          ref={inputElementRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 text-sm sm:text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" disabled={disabled || !message.trim()} size="icon" className="shrink-0 size-9 sm:size-10">
          <Send className="size-4 sm:size-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    );
  }
);

MessageInput.displayName = "MessageInput";

