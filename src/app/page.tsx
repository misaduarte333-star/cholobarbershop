'use client'

import Link from 'next/link'

export default function Home() {
    return (
        <main className="relative min-h-[100dvh] flex flex-col items-center justify-between overflow-hidden selection:bg-primary selection:text-black antialiased">
            {/* Background elements */}
            <div className="fixed inset-0 z-0 h-screen">
                <div className="absolute inset-0 bg-shop-premium scale-105 brightness-50"></div>
                <div className="absolute inset-0 vignette-overlay opacity-90"></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-4xl min-h-[100dvh] flex flex-col items-center justify-between px-6 md:px-8 py-8 md:py-10 mx-auto">
                {/* Logo & Header */}
                <div className="flex flex-col items-center space-y-6 mt-2 animate-slide-in">
                    <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center border-2 border-primary/40 glow-logo relative scale-110">
                        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl"></div>
                        <span className="text-primary font-black text-3xl tracking-tighter relative z-10 font-display">CB</span>
                    </div>
                    <div className="text-center">
                        <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tight flex flex-col items-center leading-[0.85] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                            <span className="text-white">CHOLO</span>
                            <span className="text-gradient-gold uppercase">Barber</span>
                        </h1>
                        <div className="mt-6 flex items-center justify-center space-x-6">
                            <div className="h-[1.5px] w-12 bg-primary/30"></div>
                            <p className="text-[10px] tracking-[0.6em] text-white font-black uppercase opacity-90">Experiencia Premium</p>
                            <div className="h-[1.5px] w-12 bg-primary/30"></div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons - Full Container Clickable */}
                <div className="w-full flex flex-col sm:flex-row items-stretch gap-6 md:gap-12 mb-8">
                    {/* Barber Support */}
                    <div className="relative pt-10 flex-1 animate-slide-in delay-200 group">
                        <Link href="/tablet" className="block relative w-full h-full group">
                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center border-primary/70 shadow-[0_0_30px_rgba(234,179,8,0.2)] glow-gold group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all duration-500">
                                    <span className="material-icons-round text-primary text-3xl">content_cut</span>
                                </div>
                            </div>
                            <div className="glass-card w-full h-full pt-12 pb-8 px-5 rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 active:scale-[0.96] group-hover:border-primary group-hover:bg-white/10 group-hover:shadow-[0_0_50px_rgba(234,179,8,0.15)]">
                                <h2 className="text-sm md:text-base font-black tracking-[0.2em] uppercase text-white mb-1 font-display text-center leading-tight group-hover:text-primary transition-colors duration-300">Barberos</h2>
                                <p className="text-[9px] text-primary font-black tracking-[0.25em] uppercase opacity-60 group-hover:opacity-100 transition-opacity">Estación de Trabajo</p>
                                <div className="mt-4 w-12 h-1 bg-primary/20 rounded-full group-hover:w-20 group-hover:bg-primary/80 transition-all duration-500"></div>
                            </div>
                        </Link>
                    </div>

                    {/* Admin Access */}
                    <div className="relative pt-10 flex-1 animate-slide-in delay-300 group">
                        <Link href="/admin/login" className="block relative w-full h-full group">
                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center border-primary/70 shadow-[0_0_30px_rgba(234,179,8,0.2)] glow-gold group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all duration-500">
                                    <span className="material-icons-round text-primary text-3xl">admin_panel_settings</span>
                                </div>
                            </div>
                            <div className="glass-card w-full h-full pt-12 pb-8 px-5 rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 active:scale-[0.96] group-hover:border-primary group-hover:bg-white/10 group-hover:shadow-[0_0_50px_rgba(234,179,8,0.15)]">
                                <h2 className="text-sm md:text-base font-black tracking-[0.2em] uppercase text-white mb-1 font-display text-center leading-tight group-hover:text-primary transition-colors duration-300">Admin</h2>
                                <p className="text-[9px] text-primary font-black tracking-[0.25em] uppercase opacity-60 group-hover:opacity-100 transition-opacity">Gestión y Control</p>
                                <div className="mt-4 w-12 h-1 bg-primary/20 rounded-full group-hover:w-20 group-hover:bg-primary/80 transition-all duration-500"></div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center animate-fade-in delay-500 mb-2">
                    <div className="mb-3 h-[1px] w-16 bg-white/10 mx-auto"></div>
                    <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-black">
                        Luxury Grooming Standards
                    </p>
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="fixed bottom-2 w-36 h-1 bg-white/20 rounded-full left-1/2 -translate-x-1/2 pointer-events-none z-50"></div>
        </main>
    )
}
