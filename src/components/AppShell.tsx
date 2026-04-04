'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true); // Default to true for desktop
    const searchParams = useSearchParams();
    const isFullscreen = searchParams.get('fullscreen') === 'true';

    return (
        <>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={cn(
                "min-h-screen flex flex-col transition-all duration-300",
                sidebarOpen && !isFullscreen ? "md:ml-64" : "md:ml-0"
            )}>
                {/* Top header bar - hidden in fullscreen focusing mode */}
                {!isFullscreen && (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-sm">H</span>
                            </div>
                            <span className="text-slate-900 font-semibold">Hans AI Dashboard</span>
                        </div>
                    </div>
                )}

                {/* Page content — bottom padding for mobile bottom nav bar */}
                <div className={cn("flex-1", !isFullscreen && "pb-16 md:pb-0")}>
                    {children}
                </div>
            </main>
        </>
    );
}
