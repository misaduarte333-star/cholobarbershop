'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data: admins, error: dbError } = await supabase
                .from('usuarios_admin')
                .select('*')
                .eq('email', email)
                .limit(1)

            if (dbError) throw dbError

            const admin = admins?.[0] as any

            // In a real app we would use proper hash comparison
            // Matching the pattern used in the barber login for now
            if (admin && admin.password_hash === password) {
                localStorage.setItem('admin_session', JSON.stringify(admin))
                router.push('/admin')
            } else {
                setError('Credenciales incorrectas')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050608] text-white selection:bg-primary selection:text-black antialiased">
            {/* Background elements - Same as Home for consistency */}
            <div className="absolute inset-0 z-0 bg-shop-premium opacity-40 scale-105"></div>
            <div className="absolute inset-0 z-0 vignette-overlay opacity-80"></div>

            {/* Light Leaks */}
            <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-primary pointer-events-none animate-pulse-glow" />
            <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 bg-primary pointer-events-none" />

            {/* Back Button */}
            <div className="absolute top-8 left-8 z-30">
                <Link href="/" className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-card text-white/70 hover:text-primary transition-all group border-primary/20">
                    <span className="material-icons-round text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span className="text-xs font-black uppercase tracking-[0.2em] font-display">Regresar</span>
                </Link>
            </div>

            {/* Login Card Container */}
            <div className="relative z-10 w-full max-w-xl px-4 py-8">
                <div className="glass-card p-8 md:p-10 rounded-[2.5rem] animate-slide-in relative overflow-hidden border-primary/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    {/* Interior Glow Overlay */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-brand blur-sm opacity-50" />

                    {/* Logo & Header */}
                    <div className="text-center mb-8 relative">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/60 border-2 border-primary/40 glow-logo mb-6 relative group scale-110">
                            <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl group-hover:bg-primary/25 transition-all duration-500" />
                            <span className="text-3xl font-black text-primary relative z-10 font-display">CB</span>
                        </div>
                        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tight flex flex-col items-center leading-none">
                            <span className="text-white drop-shadow-2xl">MASTER</span>
                            <span className="text-gradient-gold uppercase">Panel Admin</span>
                        </h1>
                        <div className="mt-6 flex items-center justify-center space-x-4">
                            <div className="h-[1px] w-10 bg-primary/30"></div>
                            <p className="text-[9px] tracking-[0.5em] text-white/50 font-black uppercase">Administración Central</p>
                            <div className="h-[1px] w-10 bg-primary/30"></div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Correo Corporativo</label>
                            <div className="group flex items-center gap-4 px-5 py-4 bg-black/40 border border-white/10 rounded-2xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                                <span className="material-icons-round text-white/30 group-focus-within:text-primary transition-colors">alternate_email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-sm"
                                    placeholder="admin@cholobarber.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Clave Maestra</label>
                            <div className="group flex items-center gap-4 px-5 py-4 bg-black/40 border border-white/10 rounded-2xl focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                                <span className="material-icons-round text-white/30 group-focus-within:text-primary transition-colors">vpn_key</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-transparent border-none outline-none w-full text-white placeholder:text-white/20 font-bold text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-sm flex items-center gap-4 animate-shake">
                                <span className="material-icons-round text-sm">error_outline</span>
                                <span className="font-bold tracking-wide uppercase text-[10px]">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-5 flex items-center justify-center gap-4 text-base group shadow-[0_10px_30px_rgba(234,179,8,0.2)] font-display uppercase tracking-[0.2em] relative overflow-hidden active:scale-95 transition-all"
                        >
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    <span className="font-black">Entrar al Sistema</span>
                                    <span className="material-icons-round group-hover:translate-x-2 transition-transform">login</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-black">
                            Propiedad Privada de Cholo Barber
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
