# WhipSmart Chat API - Frontend Implementation Guide

## Overview

The WhipSmart Chat API supports three conversation types:
1. **Sales** - Answers questions AND collects name, email, phone number
2. **Support** - Answers questions AND collects issue, name, email
3. **Knowledge** - Pure Q&A about WhipSmart services

## API Base URL

```
Production: https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com
Development: http://localhost:8000
```

## Authentication

All chat endpoints require API Key authentication:

**Header:**
```
X-API-Key: your-api-key-here
```

**OR**

```
Authorization: Bearer your-api-key-here
```

## API Flow

### Step 1: Create Visitor

**Endpoint:** `POST /api/chats/visitors/`

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-12-10T10:00:00Z",
    "last_seen_at": "2025-12-10T10:00:00Z",
    "metadata": {}
  }
}
```

**JavaScript Example:**
```javascript
const createVisitor = async () => {
  const response = await fetch('https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com/api/chats/visitors/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  return data.data.id; // visitor_id
};
```

### Step 2: Create Session

**Endpoint:** `POST /api/chats/sessions/`

**Request:**
```json
{
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "conversation_type": "sales"  // Optional: "sales", "support", or "knowledge". Defaults to "routing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_type": "sales",
    "conversation_data": {},
    "created_at": "2025-12-10T10:00:00Z",
    "expires_at": "2025-12-11T10:00:00Z",
    "is_active": true
  }
}
```

**JavaScript Example:**
```javascript
const createSession = async (visitorId, conversationType = 'knowledge') => {
  const response = await fetch('https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com/api/chats/sessions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key-here'
    },
    body: JSON.stringify({
      visitor_id: visitorId,
      conversation_type: conversationType
    })
  });
  const data = await response.json();
  return data.data.id; // session_id
};
```

### Step 3: Send Chat Message

**Endpoint:** `POST /api/chats/messages/chat`

**Request:**
```json
{
  "message": "What is a novated lease?",
  "session_id": "456e7890-e89b-12d3-a456-426614174001",
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "conversation_type": "sales"  // Optional: Uses session's conversation_type if not provided
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "A novated lease is an agreement between an employee, their employer, WhipSmart and a finance company...",
    "session_id": "456e7890-e89b-12d3-a456-426614174001",
    "conversation_type": "sales",
    "conversation_data": {
      "step": "chatting",
      "name": null,
      "email": null,
      "phone": null
    },
    "complete": false,
    "needs_info": "name",
    "suggestions": [
      "What are the tax benefits?",
      "How do I apply?",
      "What vehicles qualify?"
    ],
    "message_id": "789e0123-e89b-12d3-a456-426614174002",
    "response_id": "789e0123-e89b-12d3-a456-426614174003"
  }
}
```

**JavaScript Example:**
```javascript
const sendMessage = async (message, sessionId, visitorId, conversationType) => {
  const response = await fetch('https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com/api/chats/messages/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key-here'
    },
    body: JSON.stringify({
      message: message,
      session_id: sessionId,
      visitor_id: visitorId,
      conversation_type: conversationType
    })
  });
  const data = await response.json();
  return data.data;
};
```

## Conversation Types & Flows

### 1. Sales Flow (`conversation_type: "sales"`)

**Purpose:** Answer questions AND collect contact information for sales team.

**Information Collected:**
1. Name
2. Email
3. Phone Number

**Flow:**
- Bot answers questions about WhipSmart services using knowledge base
- Bot naturally asks for name, email, and phone when appropriate
- User can provide information naturally in conversation
- Once all info is collected, `complete: true` is returned

**Example Conversation:**
```
User: "What is a novated lease?"
Bot: "A novated lease is..." [answers question]
Bot: "To connect you with our sales team, could you please provide your name?"

User: "John Doe"
Bot: "Thank you, John! Could you please provide your email address?"

User: "john@example.com"
Bot: "Perfect! Now, could you please provide your contact number?"

User: "+1234567890"
Bot: "Excellent! I've collected your information. Our sales team will contact you shortly."
[complete: true]
```

**Response Fields:**
- `needs_info`: `"name"`, `"email"`, `"phone"`, or `null` (when complete)
- `complete`: `true` when all information is collected
- `conversation_data`: Contains collected information

### 2. Support Flow (`conversation_type: "support"`)

**Purpose:** Answer questions AND collect issue details and contact information.

**Information Collected:**
1. Issue Description
2. Name
3. Email

**Flow:**
- Bot asks about the issue first
- Then collects name and email
- Answers questions about support-related topics

**Example Conversation:**
```
User: "I'm having trouble with my account"
Bot: "I'm sorry to hear that. Could you please describe the issue in more detail?"

User: "I can't log into my account"
Bot: "Thank you for describing the issue. Could you please provide your name?"

User: "Jane Smith"
Bot: "Thank you, Jane! Could you please provide your email address?"

User: "jane@example.com"
Bot: "Perfect! Our support team will contact you shortly at jane@example.com."
[complete: true]
```

**Response Fields:**
- `needs_info`: `"issue"`, `"name"`, `"email"`, or `null` (when complete)
- `complete`: `true` when all information is collected

### 3. Knowledge Flow (`conversation_type: "knowledge"`)

**Purpose:** Pure Q&A about WhipSmart services.

**Flow:**
- Bot answers questions using knowledge base
- Provides contextual suggestions
- No information collection

**Example Conversation:**
```
User: "What is a novated lease?"
Bot: "A novated lease is..." [detailed answer]
Bot: [suggestions: "What are the tax benefits?", "How do I apply?", ...]

User: "What are the tax benefits?"
Bot: "Novated leases offer several tax benefits..." [detailed answer]
```

**Response Fields:**
- `needs_info`: Always `null`
- `complete`: Always `false`
- `suggestions`: Array of contextual suggestion questions

## Complete Frontend Implementation

### React/JavaScript Example

```javascript
class WhipSmartChat {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com';
    this.visitorId = null;
    this.sessionId = null;
    this.conversationType = 'knowledge'; // 'sales', 'support', or 'knowledge'
  }

  async initialize(conversationType = 'knowledge') {
    try {
      // Step 1: Create visitor
      const visitorResponse = await fetch(`${this.baseUrl}/api/chats/visitors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const visitorData = await visitorResponse.json();
      this.visitorId = visitorData.data.id;

      // Step 2: Create session
      const sessionResponse = await fetch(`${this.baseUrl}/api/chats/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          visitor_id: this.visitorId,
          conversation_type: conversationType
        })
      });
      const sessionData = await sessionResponse.json();
      this.sessionId = sessionData.data.id;
      this.conversationType = sessionData.data.conversation_type;

      return {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        conversationType: this.conversationType
      };
    } catch (error) {
      console.error('Error initializing chat:', error);
      throw error;
    }
  }

  async sendMessage(message) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chats/messages/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          message: message,
          session_id: this.sessionId,
          visitor_id: this.visitorId,
          conversation_type: this.conversationType
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }

      return {
        response: data.data.response,
        suggestions: data.data.suggestions || [],
        complete: data.data.complete || false,
        needsInfo: data.data.needs_info,
        conversationData: data.data.conversation_data,
        conversationType: data.data.conversation_type
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getSuggestions() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/chats/messages/suggestions/?session_id=${this.sessionId}`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );
      const data = await response.json();
      return data.data.suggestions || [];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
}

// Usage Example
const chat = new WhipSmartChat('your-api-key-here');

// Initialize with conversation type
await chat.initialize('sales'); // or 'support' or 'knowledge'

// Send a message
const result = await chat.sendMessage('What is a novated lease?');
console.log('Bot:', result.response);
console.log('Suggestions:', result.suggestions);
console.log('Needs Info:', result.needsInfo); // 'name', 'email', 'phone', or null
console.log('Complete:', result.complete); // true/false

// Handle suggestions
result.suggestions.forEach(suggestion => {
  // Display as clickable buttons
  // On click: chat.sendMessage(suggestion)
});
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const ChatWidget = ({ apiKey, conversationType = 'knowledge' }) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [needsInfo, setNeedsInfo] = useState(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const initChat = async () => {
      const chatInstance = new WhipSmartChat(apiKey);
      await chatInstance.initialize(conversationType);
      setChat(chatInstance);
    };
    initChat();
  }, [apiKey, conversationType]);

  const sendMessage = async (messageText) => {
    if (!chat || !messageText.trim()) return;

    setLoading(true);
    
    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setInput('');

    try {
      const result = await chat.sendMessage(messageText);
      
      // Add bot response to UI
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      
      // Update state
      setSuggestions(result.suggestions || []);
      setNeedsInfo(result.needsInfo);
      setComplete(result.complete);
      
      // Show completion message if needed
      if (result.complete) {
        console.log('Conversation complete!', result.conversationData);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="loading">Typing...</div>}
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {needsInfo && (
        <div className="info-required">
          Please provide: {needsInfo}
        </div>
      )}

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={() => sendMessage(input)} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
```

## Response Fields Reference

### Chat Response (`/api/chats/messages/chat`)

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | Bot's response message |
| `session_id` | string (UUID) | Session ID |
| `conversation_type` | string | Current conversation type: "sales", "support", or "knowledge" |
| `conversation_data` | object | Collected information (name, email, phone, issue) |
| `complete` | boolean | `true` when all required info is collected (sales/support only) |
| `needs_info` | string\|null | What information is needed: "name", "email", "phone", "issue", or `null` |
| `suggestions` | array | Array of suggestion questions (max 5) |
| `message_id` | string (UUID) | User message ID |
| `response_id` | string (UUID) | Assistant message ID |

### Conversation Data Structure

**Sales:**
```json
{
  "step": "chatting|name|email|phone|complete",
  "name": "John Doe" or null,
  "email": "john@example.com" or null,
  "phone": "+1234567890" or null
}
```

**Support:**
```json
{
  "step": "issue|name|email|complete",
  "issue": "Can't log in" or null,
  "name": "Jane Smith" or null,
  "email": "jane@example.com" or null
}
```

**Knowledge:**
```json
{
  "step": "chatting"
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (missing required fields, invalid data)
- `401` - Unauthorized (missing or invalid API key)
- `403` - Forbidden (session expired, visitor mismatch)
- `404` - Not Found (session or visitor doesn't exist)
- `500` - Internal Server Error

## Best Practices

1. **Store IDs:** Save `visitor_id` and `session_id` in localStorage/sessionStorage
2. **Handle Completion:** Check `complete: true` to show success message
3. **Show Suggestions:** Display suggestion buttons for better UX
4. **Handle Needs Info:** Show helpful prompts when `needs_info` is set
5. **Error Handling:** Always handle errors gracefully
6. **Loading States:** Show loading indicators during API calls
7. **Conversation Type:** Set conversation type when creating session, not on every message

## Testing

Use Swagger UI for testing:
- Production: `https://whipsmart-admin-panel-921aed6c92cf.herokuapp.com/api/docs/`
- Development: `http://localhost:8000/api/docs/`

## Support

For issues or questions, contact the development team.

