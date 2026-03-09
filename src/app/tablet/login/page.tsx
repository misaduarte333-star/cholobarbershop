'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function TabletLoginPage() {
    const router = useRouter()
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const supabase = createClient()

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
            const { data: barberos, error: dbError } = await supabase
                .from('barberos')
                .select('*')
                .eq('usuario_tablet', usuario)
                .limit(1)

            if (dbError) throw dbError

            const barbero = barberos?.[0] as any

            if (barbero && barbero.password_hash === password) {
                localStorage.setItem('barbero_session', JSON.stringify(barbero))
                router.replace('/tablet')
            } else {
                setError('Usuario o contraseña incorrectos')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Error de conexión. Verifica tu red.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="relative min-h-dvh flex flex-col justify-center items-center overflow-hidden bg-bg-dark selection:bg-primary selection:text-black">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 light-leak-top" />
                <div className="absolute inset-0 light-leak-bottom" />
                <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 to-transparent" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md px-6 py-12 animate-fade-in">
                
                {/* Logo Section */}
                <header className="flex flex-col items-center mb-10">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-6 glow-logo rounded-full">
                        <div className="absolute inset-0 rounded-full bg-gradient-gold opacity-20 blur-xl" />
                        <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                        <span className="relative z-10 font-display font-black text-2xl gradient-text-gold select-none">CB</span>
                    </div>

                    <h1 className="text-center font-display font-black text-4xl md:text-5xl mb-3 leading-tight">
                        <span className="block text-white tracking-tight">Acceso</span>
                        <span className="block gradient-text-gold tracking-tight">Barberos</span>
                    </h1>

                    <div className="flex items-center gap-4 mt-2">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
                        <p className="text-xs tracking-widest text-primary/60 font-semibold uppercase">
                            Estacion de Trabajo
                        </p>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
                    </div>
                </header>

                {/* Login Card */}
                <section className="glass-card glow-gold p-8">
                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        
                        {/* Usuario Field */}
                        <div className="flex flex-col gap-2">
                            <label 
                                htmlFor="usuario" 
                                className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-white/50'
                                }`}
                            >
                                ID de Usuario
                            </label>
                            <div className={`relative flex items-center gap-3 rounded-xl transition-all duration-300 ${
                                focusedField === 'usuario' 
                                    ? 'bg-black/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <span className={`material-icons-round text-xl pl-4 transition-colors duration-200 ${
                                    focusedField === 'usuario' ? 'text-primary' : 'text-white/30'
                                }`}>
                                    badge
                                </span>
                                <input
                                    id="usuario"
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    onFocus={() => setFocusedField('usuario')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-4 pr-4 text-white placeholder:text-white/25 font-semibold text-base"
                                    placeholder="Ingresa tu usuario"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-2">
                            <label 
                                htmlFor="password" 
                                className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-white/50'
                                }`}
                            >
                                Clave de Acceso
                            </label>
                            <div className={`relative flex items-center gap-3 rounded-xl transition-all duration-300 ${
                                focusedField === 'password' 
                                    ? 'bg-black/80 ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <span className={`material-icons-round text-xl pl-4 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-white/30'
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
                                    className="flex-1 bg-transparent border-none outline-none py-4 pr-4 text-white placeholder:text-white/25 font-semibold text-base"
                                    placeholder="Ingresa tu clave"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-slide-in">
                                <span className="material-icons-round text-red-400 text-lg">error_outline</span>
                                <span className="text-sm font-medium text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full py-4 mt-2 rounded-xl font-bold text-sm uppercase tracking-wider overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group bg-gradient-gold text-black hover:shadow-lg hover:shadow-primary/30"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <span>Ingresar</span>
                                        <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform duration-200">
                                            login
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </section>

                {/* Footer */}
                <footer className="flex flex-col items-center gap-5 mt-10">
                    <div className="flex items-center gap-2 text-white/30">
                        <span className="material-icons-round text-sm">verified_user</span>
                        <span className="text-xs font-medium tracking-wide">Conexion Segura</span>
                    </div>
                    
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 active:scale-95"
                    >
                        <span className="material-icons-round text-base">arrow_back</span>
                        Volver al Inicio
                    </Link>
                </footer>
            </div>
        </main>
    )
}
