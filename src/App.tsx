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
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
