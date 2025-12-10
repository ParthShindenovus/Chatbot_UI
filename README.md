# Chat Widget UI - Embedded Chat Widget

A fully functional UI-only embedded chat widget similar to Intercom/Crisp/HubSpot that can be inserted into any website using a script tag.

## 🛠 Tech Stack

- **React 19.2** + **Vite** - Modern React with fast build tooling
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn UI** - Beautiful, accessible component library
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state management (mocked for now)
- **React Router** - Client-side routing
- **react-markdown** - Markdown rendering for messages
- **TypeScript** - Type-safe development

## 🎯 Features

- ✅ Floating chat bubble button with unread badge
- ✅ Chat list screen with unread indicators
- ✅ Chat screen with message history
- ✅ Markdown message rendering (headings, lists, links, code blocks)
- ✅ Infinite scroll for message history
- ✅ Smooth animations and transitions
- ✅ Mobile-first responsive design
- ✅ Mock data - ready for API integration
- ✅ Fully typed with TypeScript

## 📁 Project Structure

```
src/
  features/
    chat/
      components/        # Chat-specific components
        ChatWidget.tsx
        ChatButton.tsx
        ChatList.tsx
        ChatScreen.tsx
        MessageBubble.tsx
        MessageRenderer.tsx
        MessageInput.tsx
      store/             # Zustand stores
        sessionStore.ts
        chatStore.ts
        messageStore.ts
      types.ts           # TypeScript types
  shared/
    components/          # Reusable components
      FloatingPanel.tsx
      InfiniteScrollContainer.tsx
      ScrollToBottom.tsx
  lib/
    axios.ts            # Axios instance (ready for API)
    utils.ts            # Utility functions
  components/
    ui/                 # Shadcn UI components
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Production Build & Deployment

```bash
# Build widget for production
npm run build:widget:prod

# Generate embed code for clients
npm run generate:embed -- --api-key=YOUR_KEY --api-url=https://api.example.com --widget-url=https://cdn.example.com
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production deployment guide.

## 📦 Usage

### As a Standalone App

Simply import and use the `ChatWidget` component:

```tsx
import { ChatWidget } from "./features/chat";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatWidget />
    </QueryClientProvider>
  );
}
```

### As an Embedded Widget (Future)

Once deployed, you can embed the widget in any website:

```html
<script 
  src="https://your-domain.com/widget-loader.js" 
  data-api-key="your-api-key">
</script>
```

## 🧩 Components

### ChatWidget
Main widget component that manages the chat UI state and routing.

### ChatButton
Floating button that opens the chat widget. Shows unread message count.

### ChatList
Displays all chats with preview, timestamp, and unread badges.

### ChatScreen
Shows individual chat with messages, infinite scroll, and message input.

### MessageRenderer
Renders markdown content with syntax highlighting for code blocks.

## 🗄 State Management

### sessionStore
Manages widget session data:
- `sessionId`: Unique session identifier
- `widgetApiKey`: API key for widget authentication
- `initialize()`: Initialize session

### chatStore
Manages chat list and active chat:
- `chats`: Array of chat summaries
- `activeChatId`: Currently selected chat ID
- `createChat()`: Create a new chat
- `selectChat(chatId)`: Select a chat
- `markAsRead(chatId)`: Mark chat as read

### messageStore
Manages messages for each chat:
- `messages`: Record of messages by chat ID
- `loadInitialMessages(chatId)`: Load first 20 messages
- `loadOlderMessages(chatId)`: Load older messages (infinite scroll)
- `sendMessage(chatId, content)`: Send a user message
- `addAiMessage(chatId, content)`: Add AI response

## 🎨 Styling

The project uses TailwindCSS with Shadcn UI components. All styling follows the design system defined in `src/index.css`.

## 🔌 API Integration (Future)

The widget is structured to easily integrate with a backend API:

1. **Axios Instance**: `src/lib/axios.ts` is ready for API calls
2. **TanStack Query**: Query hooks can be added in `src/features/chat/useQueries.ts`
3. **Stores**: Replace mock data in stores with API calls
4. **Session**: Use `sessionStore` to store API tokens

## 📝 Mock Data

All data is currently mocked:
- Initial chats are generated in `chatStore.ts`
- Messages are generated in `messageStore.ts`
- No real API calls are made

## 🧪 Testing

Run the linter:

```bash
npm run lint
```

## 📄 License

MIT

## 🤝 Contributing

This is a UI-only implementation ready for backend integration. When integrating APIs:

1. Update `src/lib/axios.ts` with your API base URL
2. Create API functions in `src/features/chat/api.ts`
3. Create query hooks in `src/features/chat/useQueries.ts`
4. Replace mock data in stores with API calls
5. Update session initialization to handle authentication
