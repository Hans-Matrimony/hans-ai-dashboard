'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
    name: string;
    url: string;
    status: 'online' | 'offline' | 'checking' | 'internal';
    envKey: string;
    note?: string;
}

export default function SettingsPage() {
    const [services, setServices] = useState<ServiceStatus[]>([
        {
            name: 'OpenClaw Gateway',
            url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            status: 'checking',
            envKey: 'NEXT_PUBLIC_API_URL',
        },
        {
            name: 'Mem0 Server',
            url: 'Internal (Docker Network)',
            status: 'internal',
            envKey: 'NEXT_PUBLIC_MEM0_URL',
            note: 'Accessible via Gateway internally',
        },
        {
            name: 'Qdrant',
            url: 'Internal (Docker Network)',
            status: 'internal',
            envKey: 'NEXT_PUBLIC_QDRANT_URL',
            note: 'Connected via Mem0 service',
        },
    ]);

    const [envVars, setEnvVars] = useState([
        { key: 'NEXT_PUBLIC_API_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_MEM0_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_QDRANT_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_GATEWAY_TOKEN', value: 'loading...' },
    ]);

    useEffect(() => {
        checkGateway();
        // Set env vars client-side only to avoid hydration mismatch
        const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || '';
        setEnvVars([
            { key: 'NEXT_PUBLIC_API_URL', value: process.env.NEXT_PUBLIC_API_URL || 'not set' },
            { key: 'NEXT_PUBLIC_MEM0_URL', value: process.env.NEXT_PUBLIC_MEM0_URL || 'not set' },
            { key: 'NEXT_PUBLIC_QDRANT_URL', value: process.env.NEXT_PUBLIC_QDRANT_URL || 'not set' },
            { key: 'NEXT_PUBLIC_GATEWAY_TOKEN', value: token ? `${token.slice(0, 8)}...${token.slice(-8)}` : 'not set' },
        ]);
    }, []);

    const checkGateway = async () => {
        try {
            const res = await fetch('/api/gateway/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.NEXT_PUBLIC_GATEWAY_TOKEN
                        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_GATEWAY_TOKEN}` }
                        : {}),
                },
                body: JSON.stringify({ model: 'openclaw', input: '' }),
            });
            setServices((prev) =>
                prev.map((s, i) =>
                    i === 0 ? { ...s, status: (res.status < 500 ? 'online' : 'offline') as any } : s
                )
            );
        } catch {
            try {
                await fetch('/api/gateway/', { method: 'GET' });
                setServices((prev) =>
                    prev.map((s, i) => (i === 0 ? { ...s, status: 'online' as any } : s))
                );
            } catch {
                setServices((prev) =>
                    prev.map((s, i) => (i === 0 ? { ...s, status: 'offline' as any } : s))
                );
            }
        }
    };

    const configItems = [
        { label: 'Agent ID', value: 'astrologer', desc: 'Primary agent for Acharya Sharma' },
        { label: 'Agent Name', value: 'Acharya Sharma', desc: 'Vedic Astrologer persona' },
        { label: 'Heartbeat Interval', value: '4 hours', desc: 'Proactive nudge check interval' },
        { label: 'Heartbeat Target', value: 'WhatsApp', desc: 'Channel for follow-up nudges' },
        { label: 'Active Hours', value: '08:00 – 22:00 IST', desc: 'Quiet hours enforced outside this window' },
        { label: 'Tool Profile', value: 'messaging + exec, read', desc: 'Allowed tool scope for the agent' },
    ];

    const statusColors: Record<string, { dot: string; text: string; label: string }> = {
        online: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Online' },
        offline: { dot: 'bg-red-400', text: 'text-red-400', label: 'Offline' },
        checking: { dot: 'bg-slate-500 animate-pulse', text: 'text-slate-500', label: 'Checking...' },
        internal: { dot: 'bg-blue-400', text: 'text-blue-400', label: 'Internal' },
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 text-sm mt-1">System configuration and service status</p>
            </div>

            {/* Service Status */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Service Status</h2>
                    <button
                        onClick={checkGateway}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:border-indigo-200"
                    >
                        Refresh
                    </button>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {services.map((service) => {
                        const colors = statusColors[service.status];
                        return (
                            <div key={service.name} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 break-all">{service.url}</p>
                                    {service.note && (
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            {service.note}
                                        </p>
                                    )}
                                </div>
                                <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${colors.text.replace('400', '600')}`}>
                                    <span className={`w-2 h-2 rounded-full ${colors.dot.replace('400', '500')}`} />
                                    {colors.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pl-1 leading-relaxed">
                    Mem0 &amp; Qdrant run inside Coolify&apos;s Docker network. They&apos;re accessible by the Gateway internally.
                </p>
            </div>

            {/* Agent Configuration */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Agent Configuration</h2>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {configItems.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                            </div>
                            <span className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-right break-all shadow-sm">
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Environment Variables */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Environment Variables</h2>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {envVars.map((v) => (
                        <div key={v.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                            <span className="text-xs text-slate-500 font-mono font-medium">{v.key}</span>
                            <span className="text-xs text-slate-900 font-mono break-all font-semibold">{v.value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pl-1 leading-relaxed">
                    Edit these in <code className="text-slate-600 px-1 py-0.5 bg-slate-100 rounded">hans-ai-dashboard/.env</code> and restart the dev server.
                </p>
            </div>

            {/* Guardrails Summary */}
            <div className="pb-12">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Guardrails</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-sm font-bold text-slate-900">Input</span>
                        </div>
                        <ul className="text-xs text-slate-600 space-y-2">
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Prompt injection defense</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Off-topic filtering</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> PII protection</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Abuse handling</li>
                        </ul>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-sm font-bold text-slate-900">Output</span>
                        </div>
                        <ul className="text-xs text-slate-600 space-y-2">
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> No medical/legal/fin</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> No death predictions</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> No fabricated facts</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Natural Vedic tone</li>
                        </ul>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-sm font-bold text-slate-900">Action</span>
                        </div>
                        <ul className="text-xs text-slate-600 space-y-2">
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Limited tool scope</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> No file system access</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> Data isolation</li>
                            <li className="flex items-center gap-2 italic font-medium"><span className="text-emerald-500">✓</span> exec + read only</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
