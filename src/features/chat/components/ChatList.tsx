import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatListItem } from "./ChatListItem";
import { useChatStore } from "../store/chatStore";
import { Plus, X, Loader2 } from "lucide-react";

interface ChatListProps {
  onClose?: () => void;
}

export function ChatList({ onClose }: ChatListProps) {
  const { chats, createChat, selectChat, loadChats, isLoading, deleteChat } = useChatStore();

  // Load chats when component mounts or when it becomes visible
  useEffect(() => {
    // Always reload chats when chat list is shown to get latest sessions
    loadChats();
  }, [loadChats]);

  const handleCreateChat = async () => {
    try {
      const newChatId = await createChat();
      selectChat(newChatId);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="text-base sm:text-lg font-semibold">Chats</h2>
        <div className="flex items-center gap-1">
          <Button onClick={handleCreateChat} size="icon" variant="ghost" className="shrink-0">
            <Plus className="size-4 sm:size-5" />
            <span className="sr-only">New chat</span>
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="shrink-0 md:hidden"
              aria-label="Close chat"
            >
              <X className="size-4 sm:size-5" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : chats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">
            No chats yet. Start a new conversation!
          </p>
          <Button onClick={handleCreateChat} size="sm" className="sm:size-default">
            <Plus className="size-4 mr-2" />
            Start New Chat
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-4 space-y-2">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => selectChat(chat.id)}
                onDelete={deleteChat}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

