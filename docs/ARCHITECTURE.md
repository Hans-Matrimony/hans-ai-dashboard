# Hans AI Dashboard - Architecture

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Real-time:** WebSocket / Server-Sent Events

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── (routes)/          # Page routes
│
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── chat/              # Chat components
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputBox.tsx
│   ├── agents/            # Agent management
│   │   ├── AgentCard.tsx
│   │   ├── AgentList.tsx
│   │   └── AgentForm.tsx
│   └── memory/            # Memory components
│       ├── MemorySearch.tsx
│       ├── MemoryCard.tsx
│       └── MemoryTimeline.tsx
│
├── lib/                   # Utilities
│   ├── utils.ts           # Helper functions
│   ├── api.ts             # API client
│   └── hooks/             # Custom hooks
│       └── useWebSocket.ts
│
└── styles/                # Additional styles
```

## API Integration

The dashboard communicates with the OpenClaw Gateway and other services:

```
Dashboard → OpenClaw Gateway (port 8000)
         → Mem0 Server (port 8002)
         → Qdrant MCP (port 8001)
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MEM0_URL=http://localhost:8002
NEXT_PUBLIC_QDRANT_URL=http://localhost:6333
```
