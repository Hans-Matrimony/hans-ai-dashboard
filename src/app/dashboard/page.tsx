'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
    const [health, setHealth] = useState<'online' | 'offline' | 'checking'>('checking');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const proxyUrl = '/api/gateway';

    useEffect(() => {
        fetch(`${proxyUrl}/health`)
            .then((res) => {
                setHealth(res.ok ? 'online' : 'offline');
            })
            .catch(() => {
                setHealth('offline');
            });
    }, [apiUrl]);

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Overview of your AI assistant system</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-sm">Gateway</span>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${health === 'online' ? 'text-emerald-400' : health === 'offline' ? 'text-red-400' : 'text-slate-500'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${health === 'online' ? 'bg-emerald-400' : health === 'offline' ? 'bg-red-400' : 'bg-slate-500 animate-pulse'
                                }`} />
                            {health === 'online' ? 'Online' : health === 'offline' ? 'Offline' : 'Checking'}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-white">OpenClaw</p>
                    <p className="text-xs text-slate-500 mt-1">{apiUrl}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-sm">Active Agent</span>
                    </div>
                    <p className="text-2xl font-bold text-white">Acharya Sharma</p>
                    <p className="text-xs text-slate-500 mt-1">Vedic Astrologer</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-400 text-sm">Channels</span>
                    </div>
                    <p className="text-2xl font-bold text-white">Telegram + WhatsApp</p>
                    <p className="text-xs text-slate-500 mt-1">Both active</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        href="/chat"
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Open Chat</h3>
                                <p className="text-slate-500 text-sm">Talk to Acharya Sharma directly</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/memory"
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-purple-500/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Browse Memories</h3>
                                <p className="text-slate-500 text-sm">View stored user memories in Mem0</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* System Info */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">System</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {[
                        ['Gateway', apiUrl],
                        ['Mem0 Server', process.env.NEXT_PUBLIC_MEM0_URL || 'http://localhost:8002'],
                        ['Qdrant', process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333'],
                        ['Framework', 'Next.js 14 + TypeScript'],
                    ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between px-5 py-3">
                            <span className="text-sm text-slate-400">{label}</span>
                            <span className="text-sm text-slate-300 font-mono">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
