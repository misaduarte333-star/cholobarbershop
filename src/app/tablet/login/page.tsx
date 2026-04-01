'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function TabletLoginPage() {
    const router = useRouter()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)


    useEffect(() => {
        const session = localStorage.getItem('barbero_session')
        if (session) {
            try {
                const parsed = JSON.parse(session)
                if (parsed?.id) {
                    router.replace('/tablet')
                }
            } catch {
                localStorage.removeItem('barbero_session')
            }
        }
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (loading) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login-barbero', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Usuario o contraseña incorrectos')
                return
            }

            if (data.success && data.user) {
                localStorage.setItem('barbero_session', JSON.stringify(data.user))
                router.replace('/tablet')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexión. Verifica tu red.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-background selection:bg-primary selection:text-black">
            {/* Watermark Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,hsl(var(--background)/0.95)_70%)]" />
                
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

            {/* Main Content - Compacto para evitar scroll */}
            <div className="relative z-10 w-full max-w-sm px-5 animate-fade-in">
                
                {/* Logo Section - Compacto */}
                <header className="flex flex-col items-center mb-6">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-4 glow-logo rounded-full overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-20 blur-xl" />
                        <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                        <img 
                            src="/logo-cholo.jpg" 
                            alt="Cholo Barbers Shop" 
                            className="relative z-10 w-full h-full object-cover transform scale-110"
                        />
                    </div>

                    <h1 className="text-center font-display font-black text-3xl mb-2 leading-tight">
                        <span className="text-foreground tracking-tight">Acceso </span>
                        <span className="gradient-text-gold tracking-tight">Barberos</span>
                    </h1>

                    <p className="text-[10px] tracking-[0.3em] text-primary/50 font-semibold uppercase">
                        Estacion de Trabajo
                    </p>
                </header>

                {/* Login Card - Compacto */}
                <section className="glass-card glow-gold p-5">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        
                        {/* Usuario Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="usuario" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-foreground/50'
                                }`}
                            >
                                Usuario
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'usuario' 
                                    ? 'bg-card/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-card/50 ring-1 ring-foreground/10 hover:ring-foreground/20'
                            }`}>
                                <span className={`material-icons-round text-lg pl-3 transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-foreground/30'
                                }`}>
                                    person
                                </span>
                                <input
                                    id="usuario"
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    onFocus={() => setFocusedField('usuario')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-foreground placeholder:text-foreground/25 font-medium text-sm"
                                    placeholder="Ingresa tu usuario"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="password" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-foreground/50'
                                }`}
                            >
                                Clave
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'password' 
                                    ? 'bg-card/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-card/50 ring-1 ring-foreground/10 hover:ring-foreground/20'
                            }`}>
                                <span className={`material-icons-round text-lg pl-3 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-foreground/30'
                                }`}>
                                    lock
                                </span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-foreground placeholder:text-foreground/25 font-medium text-sm"
                                    placeholder="Ingresa tu clave"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg animate-slide-in">
                                <span className="material-icons-round text-red-400 text-base">error_outline</span>
                                <span className="text-xs font-medium text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full py-3.5 mt-1 rounded-lg font-bold text-sm uppercase tracking-wider overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group bg-gradient-gold text-black hover:shadow-lg hover:shadow-primary/30"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <span>Ingresar</span>
                                        <span className="material-icons-round text-base group-hover:translate-x-1 transition-transform duration-200">
                                            login
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </section>

                {/* Footer - Compacto */}
                <footer className="flex items-center justify-between mt-5">
                    <div className="flex items-center gap-1.5 text-foreground/25">
                        <span className="material-icons-round text-xs">verified_user</span>
                        <span className="text-[10px] font-medium">Seguro</span>
                    </div>
                    
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-foreground/10 bg-foreground/5 text-xs font-medium text-foreground/50 hover:bg-foreground/10 hover:text-foreground hover:border-foreground/20 transition-all duration-200 active:scale-95"
                    >
                        <span className="material-icons-round text-sm">arrow_back</span>
                        Inicio
                    </Link>
                </footer>
            </div>
        </main>
    )
}
