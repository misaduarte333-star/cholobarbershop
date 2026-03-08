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

    const supabase = createClient()

    // 1. Auto-login check (Atomic)
    useEffect(() => {
        const session = localStorage.getItem('barbero_session')
        if (session) {
            try {
                const parsed = JSON.parse(session)
                if (parsed?.id) {
                    console.log('⚡ Session detected, redirecting to dashboard...')
                    router.replace('/tablet')
                }
            } catch (e) {
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
            console.log('📡 Attempting login for:', usuario)
            const { data: barberos, error: dbError } = await supabase
                .from('barberos')
                .select('*')
                .eq('usuario_tablet', usuario)
                .limit(1)

            if (dbError) throw dbError

            const barbero = barberos?.[0] as any

            if (barbero && barbero.password_hash === password) {
                console.log('✅ Login successful, saving session...')
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
        <main className="relative h-[100dvh] flex flex-col justify-center items-center overflow-hidden bg-[#0f0c08] selection:bg-primary selection:text-black antialiased px-6">

            {/* ── Ambient background ─────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(177,120,20,0.08)_0%,transparent_70%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 3px)' }}
                />
            </div>

            {/* ── Header / Logo ──────────────────────── */}
            <div className="relative z-10 w-full max-w-sm mb-8 flex flex-col items-center">
                <div className="relative w-12 h-12 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 rounded-full border border-primary/30" />
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-sm" />
                    <span className="relative z-10 font-black text-sm text-primary tracking-tighter leading-none select-none">CB</span>
                </div>

                <h1 className="text-center font-black leading-[0.9] drop-shadow-[0_4px_24px_rgba(177,120,20,0.3)] text-4xl mb-3">
                    <span className="block text-white tracking-tight">ACCESO</span>
                    <span className="block tracking-tight"
                        style={{ background: 'linear-gradient(135deg,#f5c842 0%,#d4941a 45%,#f5c842 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        BARBEROS
                    </span>
                </h1>

                <div className="flex items-center gap-3">
                    <div className="h-px w-8 bg-primary/30" />
                    <p className="text-[9px] tracking-[0.45em] text-primary/50 font-black uppercase">Estación de Trabajo</p>
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                </div>
            </div>

            {/* ── Login Form Card ────────────────────── */}
            <div className="relative z-10 w-full max-w-sm p-6 rounded-3xl border border-primary/20 bg-[#14100b]/80 backdrop-blur-3xl shadow-[0_20px_80px_-20px_rgba(177,120,20,0.15)]">
                <form onSubmit={handleLogin} className="space-y-5">

                    <div className="space-y-2">
                        <label htmlFor="usuario" className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">ID de Usuario</label>
                        <div className="group flex items-center gap-3 px-4 py-3.5 bg-black/60 border border-primary/20 rounded-2xl focus-within:border-primary/60 focus-within:bg-black/80 transition-colors shadow-inner">
                            <span className="material-icons-round text-primary/40 text-sm group-focus-within:text-primary transition-colors">badge</span>
                            <input
                                id="usuario"
                                type="text"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-white placeholder:text-primary/30 font-bold text-sm"
                                placeholder="NOMBRE_USUARIO"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] ml-1">Clave Maestra</label>
                        <div className="group flex items-center gap-3 px-4 py-3.5 bg-black/60 border border-primary/20 rounded-2xl focus-within:border-primary/60 focus-within:bg-black/80 transition-colors shadow-inner">
                            <span className="material-icons-round text-primary/40 text-sm group-focus-within:text-primary transition-colors">lock</span>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-white placeholder:text-primary/30 font-bold text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                            <span className="material-icons-round text-red-400 text-sm">error</span>
                            <span className="font-bold uppercase tracking-widest text-[9px] text-red-400">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 rounded-2xl flex items-center justify-center gap-3 group transition-all duration-200 active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg,rgba(177,120,20,0.2) 0%,rgba(177,120,20,0.1) 100%)', border: '1px solid rgba(245,200,66,0.3)' }}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="font-black text-primary text-xs uppercase tracking-[0.2em]">Entrar al Sistema</span>
                                <span className="material-icons-round text-primary text-base group-hover:translate-x-1 transition-transform">east</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* ── Footer / Back ──────────────────────── */}
            <div className="relative z-10 mt-8 flex flex-col items-center gap-4">
                <p className="text-[8px] tracking-[0.4em] text-primary/40 font-black uppercase flex items-center gap-2">
                    <span className="material-icons-round text-[10px]">shield</span>
                    Panel Seguro
                </p>
                <Link href="/" className="px-6 py-2 rounded-full border border-primary/20 bg-primary/5 text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-primary/20 hover:text-primary transition-colors active:scale-95">
                    <span className="material-icons-round text-[12px]">keyboard_return</span>
                    Regresar
                </Link>
            </div>
        </main>
    )
}
