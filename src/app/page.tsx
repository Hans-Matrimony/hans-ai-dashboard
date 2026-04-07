import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard (middleware will handle auth check)
  redirect('/dashboard');
}
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-white text-xl">🤖</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Hans AI Dashboard</h1>
                <p className="text-xs text-slate-500 font-medium">Personal AI Assistant</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/chat" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                Chat
              </Link>
              <Link href="/memory" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                Memory
              </Link>
              <Link href="/settings" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                Settings
              </Link>
              <Link href="/chat-logs" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                Chat Logs
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            SYSTEM ONLINE
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 tracking-tight">
            Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI Assistant</span>
          </h2>

          <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
            Manage your AI agents, browse conversation memories, and interact with your personal AI assistant across multiple platforms with a premium dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7-7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all hover:border-slate-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Open Chat
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-indigo-200 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-6 group">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2m2-4h.01M17 16H5m4 0h2m2 0h2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Agent</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Create and manage multiple AI agents with different personalities and purposes.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-purple-200 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Semantic Memory</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Browse and search through conversation history with vector-based semantic search.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-emerald-200 transition-all hover:shadow-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 4.5 13.574 4.5 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Channel</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Connect via WhatsApp, Telegram, Discord, and more messaging platforms.</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-20 max-w-6xl mx-auto border-t border-slate-100 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
              <div className="text-4xl font-black text-indigo-600 mb-1">3</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Agents</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
              <div className="text-4xl font-black text-indigo-600 mb-1">1.2K</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conversations</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
              <div className="text-4xl font-black text-indigo-600 mb-1">8.5K</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memories</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-100">
              <div className="text-4xl font-black text-indigo-600 mb-1">5</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Channels</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">H</span>
              </div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Hans AI Dashboard</span>
            </div>
            <p className="text-xs font-medium text-slate-400">
              © 2024 Hans AI Dashboard. Built with Next.js 14 and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
