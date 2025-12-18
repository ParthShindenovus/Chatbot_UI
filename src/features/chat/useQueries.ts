import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getChatHistory, sendMessage, createSession, getSuggestions, listSessions, type Session } from "./api";
import { useSessionStore } from "./store/sessionStore";
import type { Message as ApiMessage } from "./api";
import type { Message } from "./types";

// Helper to convert API message to app message
const convertApiMessage = (apiMsg: ApiMessage, sessionId: string): Message => ({
  id: apiMsg.id,
  chatId: sessionId,
  content: apiMsg.message,
  role: apiMsg.role,
  timestamp: new Date(apiMsg.timestamp),
  isRead: apiMsg.role === "user",
  metadata: apiMsg.metadata, // Preserve metadata to identify idle_warning and session_end
});

// Query Keys
export const chatKeys = {
  all: ["chats"] as const,
  lists: () => [...chatKeys.all, "list"] as const,
  list: (visitorId: string) => [...chatKeys.lists(), visitorId] as const,
  messages: (sessionId: string) => [...chatKeys.all, "messages", sessionId] as const,
  suggestions: (sessionId: string) => [...chatKeys.all, "suggestions", sessionId] as const,
};

/**
 * Query hook for fetching messages for a session
 * Single Responsibility: Fetch and cache messages for a chat session
 */
export function useMessagesQuery(sessionId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: sessionId ? chatKeys.messages(sessionId) : ["messages", "null"],
    queryFn: async () => {
      if (!sessionId || sessionId.startsWith("temp_new_chat_")) {
        return { messages: [], hasMore: false, total: 0 };
      }
      const { messages: apiMessages, hasMore, total } = await getChatHistory(sessionId, 20, 0);
      const convertedMessages = apiMessages
        .map((msg) => convertApiMessage(msg, sessionId))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Check if any message is session_end and mark conversation as complete
      const hasSessionEnd = convertedMessages.some(
        (msg) => msg.metadata?.type === "session_end"
      );
      
      if (hasSessionEnd) {
        queryClient.setQueryData([...chatKeys.messages(sessionId), "state"], {
          needsInfo: null,
          isComplete: true,
          suggestions: [],
        });
      }
      
      return { messages: convertedMessages, hasMore, total };
    },
    enabled: enabled && !!sessionId && !sessionId.startsWith("temp_new_chat_"),
    staleTime: 0, // Always consider stale - refetch on mount
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when entering chat to get latest messages
    refetchOnReconnect: false,
  });
}

/**
 * Infinite query for loading older messages (pagination)
 */
export function useMessagesInfiniteQuery(sessionId: string | null) {
  return useInfiniteQuery({
    queryKey: sessionId ? [...chatKeys.messages(sessionId), "infinite"] : ["messages", "null", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      if (!sessionId || sessionId.startsWith("temp_new_chat_")) {
        return { messages: [], hasMore: false, total: 0, nextOffset: null };
      }
      const { messages: apiMessages, hasMore, total } = await getChatHistory(sessionId, 20, pageParam);
      const convertedMessages = apiMessages
        .map((msg) => convertApiMessage(msg, sessionId))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return {
        messages: convertedMessages,
        hasMore,
        total,
        nextOffset: hasMore ? pageParam + convertedMessages.length : null,
      };
    },
    enabled: !!sessionId && !sessionId.startsWith("temp_new_chat_"),
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes for older messages
  });
}

/**
 * Mutation hook for sending messages with optimistic updates
 * Single Responsibility: Send message and update UI optimistically
 */
export function useSendMessageMutation() {
  const queryClient = useQueryClient();
  const { visitorId } = useSessionStore();

  return useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      if (!visitorId) {
        throw new Error("Visitor ID is required");
      }

      // If temp chat, create session first
      let actualSessionId = sessionId;
      if (sessionId.startsWith("temp_new_chat_")) {
        const session = await createSession(visitorId);
        actualSessionId = session.id;
      }

      // Send message
      const response = await sendMessage(content, actualSessionId, visitorId);
      return { ...response, actualSessionId };
    },
    onMutate: async ({ sessionId, content }) => {
      // Rule 1 & 2: Cancel refetches and snapshot previous data
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(sessionId) });

      const previousMessages = queryClient.getQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
        chatKeys.messages(sessionId)
      );

      // Rule 3: Optimistically update UI - add user message
      const optimisticUserMessage: Message = {
        id: `temp_user_${Date.now()}`,
        chatId: sessionId,
        content: content.trim(),
        role: "user",
        timestamp: new Date(),
        isRead: true,
      };

      queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
        chatKeys.messages(sessionId),
        (old) => {
          if (!old) return { messages: [optimisticUserMessage], hasMore: false, total: 1 };
          return {
            ...old,
            messages: [...old.messages, optimisticUserMessage],
            total: old.total + 1,
          };
        }
      );

      // Rule 4: Return context for rollback
      return { previousMessages, sessionId, optimisticUserMessageId: optimisticUserMessage.id };
    },
    onError: (error, _variables, context) => {
      // Rule 5: Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(context.sessionId), context.previousMessages);
      }
      console.error("Failed to send message:", error);
    },
    onSuccess: (data, _variables, context) => {
      // Optimistically update the messages query cache directly using API response
      // API response provides: message_id (user), response_id (assistant), response (content)
      // DO NOT call getChatHistory API - we update cache directly with response data
      queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
        chatKeys.messages(data.actualSessionId),
        (old) => {
          if (!old) {
            // Edge case: If no existing data, we need to reconstruct user message
            // In practice, this shouldn't happen as onMutate always adds optimistic message
            const userMessage: Message = {
              id: data.message_id, // Real message ID from API
              chatId: data.actualSessionId,
              content: "", // We don't have user content in API response, but optimistic message should exist
              role: "user",
              timestamp: new Date(),
              isRead: true,
            };
            
            const assistantMessage: Message = {
              id: data.response_id, // Real response ID from API
              chatId: data.actualSessionId,
              content: data.response, // Response content from API
              role: "assistant",
              timestamp: new Date(),
              isRead: false,
            };
            
            return { messages: [userMessage, assistantMessage], hasMore: false, total: 2 };
          }

          // Normal flow: Replace temp user message ID with real message_id from API
          // The optimistic message already has the correct content, we just update the ID
          const updatedMessages = old.messages.map((msg) => {
            // If this is the optimistic user message, replace temp ID with real message_id from API
            if (context?.optimisticUserMessageId && msg.id === context.optimisticUserMessageId) {
              return {
                ...msg,
                id: data.message_id, // Use real message ID from API response
                // Content is already correct from optimistic update
              };
            }
            return msg;
          });

          // Add assistant message from API response
          const assistantMessage: Message = {
            id: data.response_id, // Real response ID from API
            chatId: data.actualSessionId,
            content: data.response, // Response content from API
            role: "assistant",
            timestamp: new Date(),
            isRead: false,
          };

          return {
            ...old,
            messages: [...updatedMessages, assistantMessage],
            total: old.total + 1,
          };
        }
      );

      // Store conversation state from API response (needsInfo, isComplete, suggestions)
      queryClient.setQueryData(
        [...chatKeys.messages(data.actualSessionId), "state"],
        {
          needsInfo: data.needs_info || null,
          isComplete: data.complete || false,
          suggestions: data.suggestions || [],
        }
      );

      // Update suggestions cache if provided in API response
      if (data.suggestions && data.suggestions.length > 0) {
        queryClient.setQueryData(chatKeys.suggestions(data.actualSessionId), {
          suggestions: data.suggestions,
          session_id: data.actualSessionId,
          message_count: 0,
        });
      } else {
        // If no suggestions in response, invalidate to trigger API call
        queryClient.invalidateQueries({ 
          queryKey: chatKeys.suggestions(data.actualSessionId),
          refetchType: 'active' // Only refetch if query is active
        });
      }

      // CRITICAL: Do NOT invalidate or refetch getChatHistory API
      // We have all required data from the chat API response:
      // - message_id: User message ID
      // - response_id: Assistant message ID  
      // - response: Assistant message content
      // - needs_info, complete, suggestions: Conversation state
      // The cache is updated optimistically - no need to call messages API
    },
    onSettled: () => {
      // Don't invalidate after mutation - optimistic update handles everything
      // Invalidating causes unnecessary refetches and potential flickering
      // The cache is already updated with real message IDs from the API response
    },
  });
}

/**
 * Query hook for fetching chat list (sessions) - Legacy, use useChatsInfiniteQuery instead
 */
export function useChatsQuery(visitorId: string | null) {
  return useQuery({
    queryKey: visitorId ? chatKeys.list(visitorId) : ["chats", "null"],
    queryFn: async () => {
      if (!visitorId) return [];
      const { sessions } = await listSessions(visitorId);
      return sessions;
    },
    enabled: !!visitorId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Infinite query hook for fetching chat list (sessions) with pagination
 * Initial load: 10 sessions, then loads more on scroll
 * Follows TanStack Query infinite query pattern: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
 */
export function useChatsInfiniteQuery(visitorId: string | null) {
  return useInfiniteQuery({
    queryKey: visitorId ? [...chatKeys.list(visitorId), "infinite"] : ["chats", "null", "infinite"],
    queryFn: async ({ pageParam = 0 }) => {
      if (!visitorId) {
        return { sessions: [], hasMore: false, total: 0 };
      }
      const limit = pageParam === 0 ? 10 : 20; // First page: 10, subsequent: 20
      const { sessions, hasMore, total } = await listSessions(visitorId, undefined, limit, pageParam);
      // Return page data directly (sessions array) - TanStack Query will wrap it in pages array
      return {
        sessions,
        hasMore,
        total,
      };
    },
    enabled: !!visitorId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // Return undefined when there's no more data (per TanStack Query docs)
      if (!lastPage.hasMore) {
        return undefined;
      }
      // Calculate next offset: use lastPageParam (current offset) + last page size
      const lastPageSize = lastPage.sessions.length;
      return (lastPageParam as number) + lastPageSize;
    },
    staleTime: 0, // Always consider stale - refetch on mount
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when component mounts
  });
}

/**
 * Mutation hook for creating a session
 * Only adds session to chat list after successful creation (no optimistic updates)
 */
export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  const { visitorId } = useSessionStore();

  return useMutation({
    mutationFn: async () => {
      if (!visitorId) {
        throw new Error("Visitor ID is required");
      }
      return await createSession(visitorId);
    },
    onMutate: async () => {
      if (!visitorId) return;

      // Cancel ongoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [...chatKeys.list(visitorId), "infinite"] });
    },
    onError: (_err) => {
      // No rollback needed since we don't optimistically update
      // Session creation failed, so it won't appear in the list
    },
    onSuccess: (session) => {
      // Only add session to chat list after successful creation
      if (visitorId) {
        queryClient.setQueryData<{
          pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
          pageParams: number[];
        }>([...chatKeys.list(visitorId), "infinite"], (old) => {
          if (!old) {
            // If no existing data, create new structure with the session
            return {
              pages: [{ sessions: [session], hasMore: false, total: 1 }],
              pageParams: [0],
            };
          }
          // Add new session to the beginning of the first page
          const firstPage = old.pages[0] || { sessions: [], hasMore: false, total: 0 };
          // Check if session already exists (avoid duplicates)
          const sessionExists = firstPage.sessions.some((s) => s.id === session.id);
          if (sessionExists) {
            return old;
          }
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                sessions: [session, ...firstPage.sessions],
                total: (firstPage.total || 0) + 1,
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }
    },
    onSettled: () => {
      // Invalidate to ensure sync with server after mutation completes
      if (visitorId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.list(visitorId) });
      }
    },
  });
}

/**
 * Query hook for fetching suggestions
 * Only fetches if session is active (is_active: true)
 */
export function useSuggestionsQuery(sessionId: string | null, enabled: boolean = true) {
  const { visitorId } = useSessionStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: sessionId ? chatKeys.suggestions(sessionId) : ["suggestions", "null"],
    queryFn: async () => {
      if (!sessionId || !visitorId || sessionId.startsWith("temp_new_chat_")) {
        return { suggestions: [], session_id: sessionId || "", message_count: 0 };
      }
      
      // Check if session is active from sessions cache
      const sessionsData = queryClient.getQueryData<{
        pages: Array<{ sessions: Array<{ id: string; is_active: boolean }> }>;
      }>([...chatKeys.list(visitorId), "infinite"]);
      
      // Find session in all pages
      let isSessionActive = true; // Default to true if not found in cache
      if (sessionsData?.pages) {
        const allSessions = sessionsData.pages.flatMap((page) => page.sessions);
        const session = allSessions.find((s) => s.id === sessionId);
        if (session) {
          isSessionActive = session.is_active;
        }
      }
      
      // Don't call API if session is not active
      if (!isSessionActive) {
        return { suggestions: [], session_id: sessionId, message_count: 0 };
      }
      
      // Check if suggestions are in conversation state cache
      const cachedState = queryClient.getQueryData<{ suggestions: string[] }>([
        ...chatKeys.messages(sessionId),
        "state",
      ]);
      if (cachedState?.suggestions && cachedState.suggestions.length > 0) {
        return {
          suggestions: cachedState.suggestions,
          session_id: sessionId,
          message_count: 0,
        };
      }
      
      return await getSuggestions(sessionId, visitorId);
    },
    enabled: enabled && !!sessionId && !!visitorId && !sessionId.startsWith("temp_new_chat_"),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get conversation state (needsInfo, isComplete) for a session
 */
export function useConversationState(sessionId: string | null) {
  const queryClient = useQueryClient();
  
  if (!sessionId || sessionId.startsWith("temp_new_chat_")) {
    return { needsInfo: null, isComplete: false, suggestions: [] };
  }

  const state = queryClient.getQueryData<{
    needsInfo: "name" | "email" | "phone" | "issue" | null;
    isComplete: boolean;
    suggestions: string[];
  }>([...chatKeys.messages(sessionId), "state"]);

  return state || { needsInfo: null, isComplete: false, suggestions: [] };
}

/**
 * Hook to get session data (including is_active) reactively
 * Uses useQuery to ensure reactivity when cache updates
 */
export function useSessionData(sessionId: string | null) {
  const { visitorId } = useSessionStore();
  const queryClient = useQueryClient();

  interface SessionItem {
    id: string;
    is_active: boolean;
  }

  interface SessionsPage {
    sessions: SessionItem[];
  }

  interface SessionsCacheData {
    pages: SessionsPage[];
  }

  // Use useQuery to subscribe to cache changes
  const sessionsQuery = useQuery<SessionsCacheData | undefined>({
    queryKey: visitorId ? [...chatKeys.list(visitorId), "infinite"] : ["sessions", "null"],
    queryFn: (): SessionsCacheData | undefined => {
      // This won't actually fetch - we're just subscribing to cache
      if (!visitorId) return undefined;
      const queryKey = [...chatKeys.list(visitorId), "infinite"];
      return queryClient.getQueryData<SessionsCacheData>(queryKey);
    },
    enabled: !!visitorId && !!sessionId && !sessionId.startsWith("temp_new_chat_"),
    staleTime: Infinity, // Never stale - we're just reading from cache
    gcTime: Infinity,
  });

  const allSessions: SessionItem[] = sessionsQuery.data?.pages?.flatMap((page: SessionsPage) => page.sessions) || [];
  const currentSession = allSessions.find((s: SessionItem) => s.id === sessionId);
  
  return {
    isActive: currentSession?.is_active ?? true,
    session: currentSession,
  };
}

