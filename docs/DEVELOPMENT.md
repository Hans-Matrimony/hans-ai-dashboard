# Hans AI Dashboard - Development Guide

## Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-username/hans-ai-dashboard.git
cd hans-ai-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev
```

## Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run type-check  # Run TypeScript check
```

## Project Structure Overview

### Pages (App Router)

- `/` - Home page with hero section
- `/dashboard` - Main dashboard
- `/agents` - Agent management
- `/memory` - Memory browser
- `/settings` - Settings

### Components

- `ui/` - Reusable UI components (Button, Input, Modal, Card, Badge)
- `layout/` - Layout components (Header, Sidebar, Footer)
- `chat/` - Chat interface components
- `agents/` - Agent-related components
- `memory/` - Memory-related components

### Utilities

- `lib/utils.ts` - Helper functions (cn, formatDate, truncate)
- `lib/api.ts` - API client (agentsApi, chatApi, memoryApi, healthApi)
- `lib/hooks/` - Custom React hooks

## API Communication

All API calls go through the configured API client:

```typescript
import { agentsApi, chatApi, memoryApi } from '@/lib/api';

// List agents
const agents = await agentsApi.list();

// Send message
const response = await chatApi.send({ message: 'Hello', agent: 'main' });

// Search memories
const results = await memoryApi.search({ query: 'Python', user_id: 'user123' });
```

## Styling Guide

This project uses Tailwind CSS with a custom design system:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles',
  'conditional-styles',
  className
)}>
```

### Color System

- Primary: Blue scale (50-900)
- Dark: Slate scale (50-950)
- Semantic: success (green), warning (yellow), danger (red), info (blue)

## TypeScript Types

All components are fully typed. Use the existing types as reference:

```typescript
interface Agent {
  id: string;
  name: string;
  identity: {
    name?: string;
    emoji?: string;
    theme?: string;
  };
  model: string;
  workspace: string;
}
```

## Deployment

### Coolify

1. Push code to GitHub
2. In Coolify, create new service from Git repository
3. Select "Static Site" or "Dockerfile"
4. Configure environment variables
5. Deploy

### Docker

```bash
docker build -t hans-ai-dashboard .
docker run -p 3000:3000 --env-file .env.local hans-ai-dashboard
```

### Vercel

```bash
vercel deploy
```
