import { useMessagesQuery } from "../useQueries";

/**
 * Custom hook for loading messages using TanStack Query
 * Single Responsibility: Provide messages data from TanStack Query
 * React Query handles deduplication automatically
 */
export function useMessageLoader(chatId: string | null) {
  // React Query automatically deduplicates requests with the same queryKey
  // No need for manual tracking - the queryKey includes sessionId
  const { data, isLoading, isFetching } = useMessagesQuery(chatId, !!chatId);

  return {
    hasLoaded: !isLoading && !!data,
    chatMessages: data?.messages || [],
    isLoading: isLoading || isFetching,
  };
}

