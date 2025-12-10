import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-8">
          <h1 className="text-3xl font-bold mb-4">Chat Widget Demo</h1>
          <p className="text-muted-foreground mb-8">
            This is a demo page for the embedded chat widget. The chat button
            should appear in the bottom right corner.
          </p>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Features</h2>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Floating chat button with unread badge</li>
                <li>Chat list with unread indicators</li>
                <li>Message rendering with markdown support</li>
                <li>Infinite scroll for message history</li>
                <li>Smooth animations and transitions</li>
                <li>Mock data - ready for API integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
