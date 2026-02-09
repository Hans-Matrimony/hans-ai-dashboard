# Hans AI Dashboard

Modern AI dashboard for managing your personal AI assistant built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🤖 **Multi-Agent Management** - Manage multiple AI agents
- 💬 **Real-time Chat Interface** - Interact with your AI agents
- 🧠 **Memory Browser** - View and search conversation memories
- 📱 **Channel Management** - Configure messaging platforms
- 📊 **Activity Monitoring** - Track agent activity and performance
- 🎨 **Modern UI** - Clean, responsive design with dark mode

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Real-time:** WebSocket / Server-Sent Events

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MEM0_URL=http://localhost:8002
NEXT_PUBLIC_QDRANT_URL=http://localhost:6333
```

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/             # Utilities and API client
└── styles/          # Global styles
```

## Deployment

### Coolify

1. Create new service from Git repository
2. Configure as "Static Site" or "Dockerfile"
3. Set environment variables
4. Deploy

### Docker

```bash
docker build -t hans-ai-dashboard .
docker run -p 3000:3000 hans-ai-dashboard
```

## License

MIT License
