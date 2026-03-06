'use client'

import Link from 'next/link'

export default function Home() {
    return (
        <main className="relative h-[100dvh] flex flex-col overflow-hidden bg-[#0f0c08] selection:bg-primary selection:text-black antialiased">

            {/* ── Ambient background ─────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* radial warm center glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(177,120,20,0.12)_0%,transparent_70%)]" />
                {/* bottom vignette */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
                {/* top vignette */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
                {/* subtle horizontal scan lines texture */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 3px)' }}
                />
            </div>

            {/* ── Header ─────────────────────────────── */}
            <header className="relative z-10 flex items-center justify-between px-5 pt-safe-top">

                {/* Logo mark */}
                <div className="flex items-center gap-3 py-4">
                    <div className="relative w-9 h-9 flex items-center justify-center">
                        {/* outer ring */}
                        <div className="absolute inset-0 rounded-full border border-primary/30" />
                        {/* inner glow */}
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
                        <span className="relative z-10 font-black text-xs text-primary tracking-tighter leading-none select-none">CB</span>
                    </div>
                    <div>
                        <p className="text-white font-black text-sm tracking-[0.12em] uppercase leading-none">Cholo</p>
                        <p className="text-primary font-black text-sm tracking-[0.12em] uppercase leading-none">Barber</p>
                    </div>
                </div>

                {/* Eyebrow tag */}
                <div className="flex items-center gap-2">
                    <div className="h-px w-6 bg-primary/30" />
                    <p className="text-[9px] tracking-[0.45em] text-white/40 font-black uppercase">Premium</p>
                </div>
            </header>

            {/* ── Central Content Wrapper ──────────────── */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full max-w-4xl mx-auto px-4 gap-12 md:gap-16 pb-8 md:pb-16">

                {/* ── Hero text ─────────────────────────── */}
                <div className="flex flex-col items-center">
                    <h1 className="text-center font-black leading-[0.88] drop-shadow-[0_4px_24px_rgba(177,120,20,0.3)]"
                        style={{ fontSize: 'clamp(3rem,18vw,7rem)', fontFamily: 'inherit' }}>
                        <span className="block text-white tracking-tight">CHOLO</span>
                        <span className="block tracking-tight"
                            style={{ background: 'linear-gradient(135deg,#f5c842 0%,#d4941a 45%,#f5c842 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            BARBER
                        </span>
                    </h1>

                    {/* Divider rule */}
                    <div className="flex items-center gap-4 mt-4 w-full justify-center">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30 max-w-[60px]" />
                        <p className="text-[9px] tracking-[0.55em] text-white/35 font-black uppercase whitespace-nowrap">Experiencia Premium</p>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30 max-w-[60px]" />
                    </div>
                </div>

                {/* ── Navigation blades ─────────────────── */}
                <nav className="flex flex-col md:flex-row justify-center gap-4 w-full">

                    {/* ─ Barberos blade ─ */}
                    <Link
                        href="/tablet"
                        className="group relative flex items-center gap-4 px-5 py-5 rounded-2xl overflow-hidden
                            border border-white/8 active:scale-[0.97] transition-all duration-200 flex-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(177,120,20,0.06) 100%)' }}>

                        {/* hover glow layer */}
                        <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-150"
                            style={{ background: 'radial-gradient(ellipse at center,rgba(245,200,66,0.1) 0%,transparent 70%)' }} />

                        {/* left accent stripe */}
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl bg-gradient-to-b from-primary/80 via-primary/40 to-transparent" />

                        {/* icon */}
                        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)' }}>
                            <span className="material-icons-round text-primary text-2xl">content_cut</span>
                        </div>

                        {/* text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-base tracking-[0.1em] uppercase leading-none mb-1">Barberos</p>
                            <p className="text-primary/60 text-[10px] font-bold tracking-[0.25em] uppercase">Estación de Trabajo</p>
                        </div>

                        {/* chevron */}
                        <div className="flex-shrink-0 opacity-30 group-active:opacity-80 transition-opacity">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
                            </svg>
                        </div>
                    </Link>

                    {/* ─ Admin blade ─ */}
                    <Link
                        href="/admin/login"
                        className="group relative flex items-center gap-4 px-5 py-5 rounded-2xl overflow-hidden
                            border border-white/20 bg-white/5 active:scale-[0.97] transition-all duration-200 flex-1 shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
                        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.02) 100%)' }}>

                        {/* hover glow layer */}
                        <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-150"
                            style={{ background: 'radial-gradient(ellipse at center,rgba(255,255,255,0.15) 0%,transparent 70%)' }} />

                        {/* left accent stripe - more prominent for admin */}
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl bg-gradient-to-b from-white/60 via-white/20 to-transparent" />

                        {/* icon */}
                        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}>
                            <span className="material-icons-round text-white text-2xl drop-shadow-md">admin_panel_settings</span>
                        </div>

                        {/* text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-base tracking-[0.1em] uppercase leading-none mb-1">Admin</p>
                            <p className="text-white/50 text-[10px] font-bold tracking-[0.25em] uppercase">Gestión y Control</p>
                        </div>

                        {/* chevron */}
                        <div className="flex-shrink-0 opacity-40 group-active:opacity-80 transition-opacity">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </Link>
                </nav>
            </div>

            {/* ── Footer rule ───────────────────────── */}
            <footer className="relative z-10 pb-safe-bottom pb-3 flex justify-center">
                <p className="text-[8px] tracking-[0.5em] text-white/20 font-black uppercase">Luxury Grooming Standards</p>
            </footer>

            {/* home-indicator strip */}
            <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-28 h-[3px] rounded-full bg-white/15 pointer-events-none z-50" />
        </main>
    )
}
