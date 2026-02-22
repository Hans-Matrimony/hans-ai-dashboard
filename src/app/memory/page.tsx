'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';

interface Memory {
    id: string;
    memory: string;
    hash?: string;
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

const MEM0_PROXY = '/api/mem0';

export default function MemoryPage() {
    const [userId, setUserId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');

    const fetchMemories = async () => {
        if (!userId.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${MEM0_PROXY}/memories/${encodeURIComponent(userId.trim())}?limit=100`);
            const data = await res.json();
            if (data.success) {
                setMemories(data.memories || []);
            } else {
                setError(data.detail || 'Failed to fetch memories');
                setMemories([]);
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
            setMemories([]);
        } finally {
            setIsLoading(false);
        }
    };

    const searchMemories = async () => {
        if (!userId.trim() || !searchQuery.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${MEM0_PROXY}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery.trim(),
                    user_id: userId.trim(),
                    limit: 20,
                }),
            });
            const data = await res.json();
            if (data.success) {
                const mapped = (data.results || []).map((r: any, i: number) => ({
                    id: r.id || `search-${i}`,
                    memory: r.memory || r.text || '',
                    metadata: { ...r.metadata, score: r.score },
                }));
                setMemories(mapped);
            } else {
                setError(data.detail || 'Search failed');
                setMemories([]);
            }
        } catch (err: any) {
            setError(err.message || 'Connection error');
            setMemories([]);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteMemory = async (memoryId: string) => {
        if (!confirm('Delete this memory?')) return;
        try {
            await fetch(`${MEM0_PROXY}/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' });
            setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const deleteAllMemories = async () => {
        if (!userId.trim()) return;
        if (!confirm(`Delete ALL memories for user "${userId}"? This cannot be undone.`)) return;
        try {
            await fetch(`${MEM0_PROXY}/memories/user/${encodeURIComponent(userId.trim())}`, { method: 'DELETE' });
            setMemories([]);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Memory Browser</h1>
                <p className="text-slate-500 text-sm mt-1">Browse, search, and manage Mem0 memories by user</p>
            </div>

            {/* User ID Input */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
                <label className="text-sm text-slate-500 font-medium mb-2 block">User ID</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'browse' ? fetchMemories() : searchMemories())}
                        placeholder="Enter user ID (e.g., +919876543210 or telegram ID)"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('browse')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'browse'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                >
                    Browse All
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'search'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                >
                    Semantic Search
                </button>
            </div>

            {/* Search bar (search tab) */}
            {activeTab === 'search' && (
                <div className="flex gap-3 mb-6">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchMemories()}
                        placeholder="Search query (e.g., birth details, marriage, career)"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-sm"
                    />
                    <button
                        onClick={searchMemories}
                        disabled={!userId.trim() || !searchQuery.trim() || isLoading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                        Search
                    </button>
                </div>
            )}

            {/* Browse button */}
            {activeTab === 'browse' && (
                <div className="flex gap-3 mb-6 flex-wrap">
                    <button
                        onClick={fetchMemories}
                        disabled={!userId.trim() || isLoading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                        {isLoading ? 'Loading...' : 'Fetch Memories'}
                    </button>
                    {memories.length > 0 && (
                        <button
                            onClick={deleteAllMemories}
                            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-all border border-red-100"
                        >
                            Delete All ({memories.length})
                        </button>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6 text-red-600 text-sm shadow-sm">
                    {error}
                </div>
            )}

            {/* Results */}
            {memories.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-slate-500 font-medium">{memories.length} memories found</p>
                    {memories.map((mem) => (
                        <div
                            key={mem.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-all group shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 leading-relaxed">{mem.memory}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        {mem.created_at && (
                                            <span className="text-xs text-slate-400">{formatDate(mem.created_at)}</span>
                                        )}
                                        {mem.metadata?.score !== undefined && (
                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium border border-indigo-100/50">
                                                Score: {(mem.metadata.score * 100).toFixed(1)}%
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-300 font-mono break-all group-hover:text-slate-400 transition-colors">{mem.id}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteMemory(mem.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"
                                    title="Delete memory"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && memories.length === 0 && userId && !error && (
                <div className="text-center py-16">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">No memories found. Try fetching or searching.</p>
                </div>
            )}
        </div>
    );
}
