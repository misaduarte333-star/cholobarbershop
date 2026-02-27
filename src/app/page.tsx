'use client'

import Link from 'next/link'

export default function Home() {
    return (
        <main className="min-h-screen relative overflow-hidden bg-white text-slate-900">
            {/* Elegant Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20 animate-fade-in">
                {/* Logo */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border-2 border-slate-900 shadow-xl shadow-slate-200 mb-6">
                        <span className="text-3xl font-black text-slate-900">CB</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter uppercase text-slate-900">
                        CHOLO<span className="text-[var(--primary)]">BARBER</span>
                    </h1>
                    <p className="text-slate-500 text-lg uppercase tracking-[0.3em] font-bold">Classic & Elegant</p>
                </div>

                {/* Navigation Cards */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
                    <Link
                        href="/tablet"
                        className="group glass-card px-8 py-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-slate-900">App Tablet</h3>
                                <p className="text-sm text-slate-500 font-bold">Vista para barberos</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/admin"
                        className="group glass-card px-8 py-6 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-slate-900">Panel Admin</h3>
                                <p className="text-sm text-slate-500 font-bold">Gestión y reportes</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <p className="mt-16 text-sm text-slate-600">
                    Desarrollado con Next.js, Supabase y OpenAI GPT-4o
                </p>
            </div>
        </main>
    )
}
