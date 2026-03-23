'use client'

import Link from 'next/link'

export default function Home() {
    return (
        <main className="fixed inset-0 flex flex-col overflow-hidden bg-black selection:bg-primary selection:text-black">
            
            {/* === LUXURY BACKGROUND === */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                
                {/* Base dark gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0806] via-[#0d0a07] to-black" />
                
                {/* Dramatic center spotlight */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(212,175,55,0.12)_0%,transparent_60%)]" />
                
                {/* Secondary warm glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,rgba(234,179,8,0.06)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_80%,rgba(153,101,21,0.08)_0%,transparent_50%)]" />
                
                {/* Art Deco geometric lines - Left */}
                <svg className="absolute left-0 top-0 h-full w-32 md:w-48 opacity-[0.06]" viewBox="0 0 100 400" preserveAspectRatio="none">
                    <line x1="20" y1="0" x2="20" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="35" y1="0" x2="35" y2="400" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="50" y1="0" x2="50" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="0" y1="200" x2="80" y2="200" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="0" y1="300" x2="100" y2="300" stroke="#D4AF37" strokeWidth="0.3"/>
                    {/* Decorative corner */}
                    <path d="M0,50 L50,50 L50,0" fill="none" stroke="#D4AF37" strokeWidth="0.5"/>
                    <path d="M0,350 L50,350 L50,400" fill="none" stroke="#D4AF37" strokeWidth="0.5"/>
                </svg>
                
                {/* Art Deco geometric lines - Right */}
                <svg className="absolute right-0 top-0 h-full w-32 md:w-48 opacity-[0.06]" viewBox="0 0 100 400" preserveAspectRatio="none">
                    <line x1="80" y1="0" x2="80" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="65" y1="0" x2="65" y2="400" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="50" y1="0" x2="50" y2="400" stroke="#D4AF37" strokeWidth="0.5"/>
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="20" y1="200" x2="100" y2="200" stroke="#D4AF37" strokeWidth="0.3"/>
                    <line x1="0" y1="300" x2="100" y2="300" stroke="#D4AF37" strokeWidth="0.3"/>
                    {/* Decorative corner */}
                    <path d="M100,50 L50,50 L50,0" fill="none" stroke="#D4AF37" strokeWidth="0.5"/>
                    <path d="M100,350 L50,350 L50,400" fill="none" stroke="#D4AF37" strokeWidth="0.5"/>
                </svg>
                
                {/* Central decorative scissors emblem */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] opacity-[0.03]">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Outer circle */}
                        <circle cx="50" cy="50" r="48" fill="none" stroke="#D4AF37" strokeWidth="0.3"/>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#D4AF37" strokeWidth="0.2"/>
                        {/* Inner decorative ring */}
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#D4AF37" strokeWidth="0.4"/>
                        {/* Scissors icon large */}
                        <g transform="translate(30, 30) scale(0.8)" fill="#D4AF37">
                            <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
                        </g>
                        {/* Radiating lines */}
                        {[...Array(12)].map((_, i) => (
                            <line 
                                key={i}
                                x1="50" y1="5" x2="50" y2="15"
                                stroke="#D4AF37" 
                                strokeWidth="0.3"
                                transform={`rotate(${i * 30} 50 50)`}
                            />
                        ))}
                    </svg>
                </div>
                
                {/* Floating barber elements - subtle */}
                <div className="absolute top-[15%] left-[10%] w-16 h-16 opacity-[0.04] animate-pulse-glow">
                    <svg viewBox="0 0 24 24" fill="#D4AF37">
                        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
                    </svg>
                </div>
                
                <div className="absolute top-[20%] right-[12%] w-12 h-12 opacity-[0.03] rotate-45">
                    <svg viewBox="0 0 24 24" fill="#D4AF37">
                        <path d="M4 2H6V22H4V2M8 2H10V11H8V2M8 13H10V22H8V13M12 2H14V8H12V2M12 10H14V22H12V10M16 2H18V6H16V2M16 8H18V22H16V8M20 2H22V4H20V2M20 6H22V22H20V6Z"/>
                    </svg>
                </div>
                
                <div className="absolute bottom-[25%] left-[8%] w-14 h-14 opacity-[0.03] -rotate-12">
                    <svg viewBox="0 0 24 24" fill="#D4AF37">
                        <path d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3M10 5.47L14 6.87V18.53L10 17.13V5.47M5 6.46L8 5.45V17.15L5 18.31V6.46M19 17.54L16 18.55V6.86L19 5.7V17.54Z"/>
                    </svg>
                </div>
                
                <div className="absolute bottom-[18%] right-[15%] w-10 h-10 opacity-[0.04] rotate-[30deg]">
                    <svg viewBox="0 0 24 24" fill="#D4AF37">
                        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64z"/>
                    </svg>
                </div>
                
                {/* Premium grain texture overlay */}
                <div className="absolute inset-0 opacity-[0.015]" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` 
                    }} 
                />
                
                {/* Top and bottom fade */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />
                
                {/* Dramatic vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.9)_100%)]" />
            </div>

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-8 animate-fade-in">
                
                {/* Logo & Title Section */}
                <header className="flex flex-col items-center mb-10">
                    {/* Premium Logo Badge */}
                    <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-20 blur-2xl scale-150" />
                        {/* Gold ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-primary/50" />
                        <div className="absolute inset-1 rounded-full border border-primary/20" />
                        {/* Inner glow */}
                        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-primary/10 to-transparent" />
                        <img src="/logo-cholo.jpg" alt="Logo" className="relative z-10 w-full h-full rounded-full object-cover transform scale-110" />
                    </div>

                    {/* Main Title */}
                    <h1 className="text-center font-display font-black leading-[0.85] mb-4"
                        style={{ fontSize: 'clamp(3rem, 14vw, 6rem)' }}>
                        <span className="block text-white tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">CHOLO</span>
                        <span className="block gradient-text-gold tracking-tight drop-shadow-[0_4px_30px_rgba(212,175,55,0.3)]">BARBER</span>
                    </h1>

                    {/* Tagline with decorative lines */}
                    <div className="flex items-center gap-5">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-primary/20" />
                        <p className="text-xs tracking-[0.5em] text-primary/60 font-semibold uppercase">
                            Premium
                        </p>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent via-primary/50 to-primary/20" />
                    </div>
                </header>

                {/* Navigation Cards */}
                <nav className="w-full max-w-sm flex flex-col gap-4">
                    
                    {/* Barberos Card - Primary */}
                    <Link
                        href="/tablet"
                        className="group relative p-5 rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(153,101,21,0.08) 100%)',
                            border: '1px solid rgba(212,175,55,0.3)',
                            boxShadow: '0 8px 32px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40">
                                <span className="material-icons-round text-primary text-3xl">content_cut</span>
                            </div>
                            
                            <div className="flex-1">
                                <p className="text-white font-bold text-lg tracking-wide uppercase leading-none mb-1">Barberos</p>
                                <p className="text-primary/60 text-sm font-medium">Estacion de Trabajo</p>
                            </div>
                            
                            <span className="material-icons-round text-primary/50 text-2xl group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
                                arrow_forward
                            </span>
                        </div>
                    </Link>

                    {/* Admin Card - Secondary */}
                    <Link
                        href="/admin/login"
                        className="group relative p-5 rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/10 border border-white/20">
                                <span className="material-icons-round text-white text-3xl">shield</span>
                            </div>
                            
                            <div className="flex-1">
                                <p className="text-white font-bold text-lg tracking-wide uppercase leading-none mb-1">Admin</p>
                                <p className="text-white/50 text-sm font-medium">Gestion y Control</p>
                            </div>
                            
                            <span className="material-icons-round text-white/30 text-2xl group-hover:text-white/70 group-hover:translate-x-1 transition-all duration-300">
                                arrow_forward
                            </span>
                        </div>
                    </Link>
                </nav>
            </div>

            {/* Footer */}
            <footer className="relative z-10 pb-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-primary/30" />
                    <span className="material-icons-round text-primary/30 text-sm">star</span>
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-primary/30" />
                </div>
                <p className="text-[10px] tracking-[0.5em] text-white/25 font-medium uppercase">
                    Luxury Grooming
                </p>
            </footer>
        </main>
    )
}
