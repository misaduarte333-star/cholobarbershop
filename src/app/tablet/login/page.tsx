'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function TabletLoginPage() {
    const router = useRouter()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Check credentials against barberos table
            // Note: Currently using plain comparison to match database state
            const providedPassword = password

            const { data: barberos, error: dbError } = await supabase
                .from('barberos')
                .select('*')
                .eq('usuario_tablet', usuario)
                .limit(1)

            if (dbError) throw dbError

            const barbero = barberos?.[0] as any

            if (barbero && barbero.password_hash === providedPassword) {
                // Success
                localStorage.setItem('barbero_session', JSON.stringify(barbero))
                router.push('/tablet')
            } else {
                setError('Usuario o contraseña incorrectos')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error al conectar con el servidor. Verifica tu conexión.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-[#050608] text-white selection:bg-primary selection:text-black antialiased">
            {/* Background elements - Consistent with Brand Identity */}
            <div className="absolute inset-0 z-0 bg-shop-premium opacity-40 scale-105"></div>
            <div className="absolute inset-0 z-0 vignette-overlay opacity-80"></div>

            {/* Light Leaks & Ambient Glows - Reduced intensity for mobile */}
            <div className="absolute -top-24 -right-24 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full blur-[100px] md:blur-[120px] opacity-10 md:opacity-20 bg-primary pointer-events-none animate-pulse-glow" />
            <div className="absolute -bottom-24 -left-24 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full blur-[100px] md:blur-[120px] opacity-5 md:opacity-10 bg-primary pointer-events-none" />

            {/* Back Button - Responsive positioning */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-30">
                <Link href="/" className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl glass-card text-white/70 hover:text-primary transition-all group border-primary/20">
                    <span className="material-icons-round text-base md:text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] font-display">Volver</span>
                </Link>
            </div>

            {/* Login Card Container */}
            <div className="relative z-10 w-full max-w-xl px-4 py-4 md:py-8">
                <div className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] animate-slide-in relative overflow-hidden border-primary/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    {/* Interior Glow Overlay */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-48 h-1 bg-gradient-brand blur-sm opacity-50" />

                    {/* Logo & Header */}
                    <div className="text-center mb-6 md:mb-8 relative">
                        <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full bg-black/60 border-2 border-primary/40 glow-logo mb-4 md:mb-6 relative group scale-100 md:scale-110">
                            <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all duration-500" />
                            <span className="text-2xl md:text-3xl font-black text-primary relative z-10 font-display">CB</span>
                        </div>
                        <h1 className="font-display font-black text-2xl md:text-5xl tracking-tight flex flex-col items-center leading-tight md:leading-none">
                            <span className="text-white drop-shadow-2xl">ACCESO</span>
                            <span className="text-gradient-gold uppercase">Barberos</span>
                        </h1>
                        <div className="mt-4 md:mt-6 flex items-center justify-center space-x-3 md:space-x-4">
                            <div className="h-[1px] w-6 md:w-10 bg-primary/30"></div>
                            <p className="text-[7px] md:text-[9px] tracking-[0.3em] md:tracking-[0.5em] text-white/50 font-black uppercase">Estación de Trabajo</p>
                            <div className="h-[1px] w-6 md:w-10 bg-primary/30"></div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                        <div className="space-y-1 md:space-y-2">
                            <label htmlFor="usuario" className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">ID de Usuario</label>
                            <div className="group flex items-center gap-3 md:gap-4 px-4 py-3 md:px-5 md:py-4 bg-black/40 border border-white/10 rounded-xl md:rounded-2xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                                <span className="material-icons-round text-white/30 text-sm md:text-base group-focus-within:text-primary transition-colors">badge</span>
                                <input
                                    id="usuario"
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-xs md:text-sm"
                                    placeholder="NOMBRE_USUARIO"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1 md:space-y-2">
                            <label htmlFor="password" className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Clave Maestra</label>
                            <div className="group flex items-center gap-3 md:gap-4 px-4 py-3 md:px-5 md:py-4 bg-black/40 border border-white/10 rounded-xl md:rounded-2xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                                <span className="material-icons-round text-white/30 text-sm md:text-base group-focus-within:text-primary transition-colors">lock_person</span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-xs md:text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl md:rounded-2xl px-3 py-2 md:px-4 md:py-3 text-red-400 text-xs md:text-sm flex items-center gap-3 md:gap-4 animate-shake">
                                <span className="material-icons-round text-red-400 text-sm">warning_amber</span>
                                <span className="font-bold tracking-wide uppercase text-[8px] md:text-[10px]">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 md:py-5 flex items-center justify-center gap-3 md:gap-4 text-sm md:text-base group shadow-[0_10px_30px_rgba(234,179,8,0.2)] font-display uppercase tracking-[0.2em] relative overflow-hidden active:scale-95 transition-all"
                        >
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    <span className="font-black italic">Entrar al Sistema</span>
                                    <span className="material-icons-round text-lg md:text-xl group-hover:translate-x-2 transition-transform">auto_awesome</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Help Link */}
                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/5 text-center">
                        <p className="text-[7px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-white/30 font-black flex items-center justify-center gap-2 md:gap-3">
                            <span className="material-icons-round text-xs md:text-sm">headset_mic</span>
                            Contacto Soporte
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
