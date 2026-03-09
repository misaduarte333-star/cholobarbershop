'use client'

import Link from 'next/link'

// Iconos SVG de barberia para el fondo
const ScissorsIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
    </svg>
)

const RazorIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 3L20.34 3.03L15 5.1L9 3L3.36 4.9C3.15 4.97 3 5.15 3 5.38V20.5C3 20.78 3.22 21 3.5 21L3.66 20.97L9 18.9L15 21L20.64 19.1C20.85 19.03 21 18.85 21 18.62V3.5C21 3.22 20.78 3 20.5 3M10 5.47L14 6.87V18.53L10 17.13V5.47M5 6.46L8 5.45V17.15L5 18.31V6.46M19 17.54L16 18.55V6.86L19 5.7V17.54Z"/>
    </svg>
)

const CombIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 2H6V22H4V2M8 2H10V11H8V2M8 13H10V22H8V13M12 2H14V8H12V2M12 10H14V22H12V10M16 2H18V6H16V2M16 8H18V22H16V8M20 2H22V4H20V2M20 6H22V22H20V6Z"/>
    </svg>
)

const BarberPoleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 3V5H6V3H8M6 7H8V9H6V7M6 11H8V13H6V11M6 15H8V17H6V15M6 19H8V21H6V19M16 3H18V5H16V3M16 7H18V9H16V7M16 11H18V13H16V11M16 15H18V17H16V15M16 19H18V21H16V19M10 5H14V7H10V5M10 9H14V11H10V9M10 13H14V15H10V13M10 17H14V19H10V17"/>
    </svg>
)

export default function Home() {
    return (
        <main className="fixed inset-0 flex flex-col overflow-hidden bg-bg-dark selection:bg-primary selection:text-black">
            {/* Watermark Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(15,12,8,0.95)_70%)]" />
                
                {/* Pattern de iconos de barberia */}
                <div className="absolute inset-0 opacity-[0.04]">
                    {/* Fila 1 */}
                    <ScissorsIcon className="absolute w-24 h-24 text-primary -top-4 left-[5%] rotate-[-15deg]" />
                    <RazorIcon className="absolute w-16 h-16 text-primary top-8 left-[25%] rotate-[20deg]" />
                    <CombIcon className="absolute w-20 h-20 text-primary -top-2 left-[45%] rotate-[-30deg]" />
                    <BarberPoleIcon className="absolute w-14 h-14 text-primary top-12 left-[65%] rotate-[10deg]" />
                    <ScissorsIcon className="absolute w-28 h-28 text-primary -top-6 left-[85%] rotate-[45deg]" />
                    
                    {/* Fila 2 */}
                    <CombIcon className="absolute w-18 h-18 text-primary top-[20%] left-[10%] rotate-[25deg]" />
                    <BarberPoleIcon className="absolute w-20 h-20 text-primary top-[18%] left-[35%] rotate-[-20deg]" />
                    <ScissorsIcon className="absolute w-16 h-16 text-primary top-[22%] left-[55%] rotate-[35deg]" />
                    <RazorIcon className="absolute w-24 h-24 text-primary top-[15%] left-[78%] rotate-[-10deg]" />
                    
                    {/* Fila 3 */}
                    <RazorIcon className="absolute w-20 h-20 text-primary top-[40%] left-[2%] rotate-[15deg]" />
                    <ScissorsIcon className="absolute w-32 h-32 text-primary top-[38%] left-[20%] rotate-[-25deg]" />
                    <BarberPoleIcon className="absolute w-16 h-16 text-primary top-[42%] left-[75%] rotate-[30deg]" />
                    <CombIcon className="absolute w-24 h-24 text-primary top-[35%] left-[90%] rotate-[-15deg]" />
                    
                    {/* Fila 4 */}
                    <BarberPoleIcon className="absolute w-22 h-22 text-primary top-[58%] left-[8%] rotate-[-35deg]" />
                    <CombIcon className="absolute w-16 h-16 text-primary top-[62%] left-[30%] rotate-[20deg]" />
                    <RazorIcon className="absolute w-28 h-28 text-primary top-[55%] left-[50%] rotate-[-5deg]" />
                    <ScissorsIcon className="absolute w-20 h-20 text-primary top-[60%] left-[72%] rotate-[40deg]" />
                    
                    {/* Fila 5 */}
                    <ScissorsIcon className="absolute w-24 h-24 text-primary top-[78%] left-[5%] rotate-[25deg]" />
                    <RazorIcon className="absolute w-18 h-18 text-primary top-[82%] left-[28%] rotate-[-30deg]" />
                    <BarberPoleIcon className="absolute w-26 h-26 text-primary top-[75%] left-[48%] rotate-[15deg]" />
                    <CombIcon className="absolute w-20 h-20 text-primary top-[80%] left-[68%] rotate-[-20deg]" />
                    <ScissorsIcon className="absolute w-16 h-16 text-primary top-[85%] left-[88%] rotate-[50deg]" />
                </div>

                {/* Light leaks */}
                <div className="absolute inset-0 light-leak-top opacity-60" />
                <div className="absolute inset-0 light-leak-bottom opacity-40" />
                
                {/* Vignette effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_20%,rgba(0,0,0,0.6)_100%)]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-5 py-6 animate-fade-in">
                
                {/* Logo Section */}
                <header className="flex flex-col items-center mb-8">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-5 glow-logo rounded-full">
                        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-20 blur-xl" />
                        <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                        <span className="relative z-10 font-display font-black text-2xl gradient-text-gold select-none">CB</span>
                    </div>

                    <h1 className="text-center font-display font-black leading-[0.9] mb-3"
                        style={{ fontSize: 'clamp(2.5rem, 12vw, 5rem)' }}>
                        <span className="block text-white tracking-tight">CHOLO</span>
                        <span className="block gradient-text-gold tracking-tight">BARBER</span>
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-primary/40" />
                        <p className="text-[10px] tracking-[0.4em] text-primary/50 font-semibold uppercase">
                            Experiencia Premium
                        </p>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-primary/40" />
                    </div>
                </header>

                {/* Navigation Cards */}
                <nav className="w-full max-w-md flex flex-col gap-3">
                    
                    {/* Barberos Card */}
                    <Link
                        href="/tablet"
                        className="group glass-card glow-gold p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-200"
                    >
                        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/30">
                            <span className="material-icons-round text-primary text-2xl">content_cut</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-base tracking-wide uppercase leading-none mb-1">Barberos</p>
                            <p className="text-primary/50 text-xs font-medium tracking-wide">Estacion de Trabajo</p>
                        </div>
                        
                        <span className="material-icons-round text-primary/40 text-xl group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                            chevron_right
                        </span>
                    </Link>

                    {/* Admin Card */}
                    <Link
                        href="/admin/login"
                        className="group glass-card p-4 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 hover:ring-1 hover:ring-white/20"
                    >
                        <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10 border border-white/20">
                            <span className="material-icons-round text-white text-2xl">admin_panel_settings</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-base tracking-wide uppercase leading-none mb-1">Admin</p>
                            <p className="text-white/40 text-xs font-medium tracking-wide">Gestion y Control</p>
                        </div>
                        
                        <span className="material-icons-round text-white/30 text-xl group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-200">
                            chevron_right
                        </span>
                    </Link>
                </nav>
            </div>

            {/* Footer */}
            <footer className="relative z-10 pb-6 flex justify-center">
                <p className="text-[9px] tracking-[0.4em] text-white/20 font-medium uppercase">
                    Luxury Grooming Standards
                </p>
            </footer>
        </main>
    )
}
