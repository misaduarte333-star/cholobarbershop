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
        <main className="relative h-[100dvh] flex flex-col justify-center items-center overflow-hidden bg-[#0f0c08] selection:bg-white selection:text-black antialiased px-6">

            {/* ── Ambient background ─────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* radial warm center glow matching the app theme but slightly more structured */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(177,120,20,0.08)_0%,transparent_70%)]" />
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
                {/* subtle horizontal scan lines texture identical to landing */}
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
                    <span className="block text-primary/80 tracking-tight">
                        ADMIN
                    </span>
                </h1>

                <div className="flex items-center gap-3">
                    <div className="h-px w-8 bg-primary/30" />
                    <p className="text-[9px] tracking-[0.45em] text-primary/50 font-black uppercase">Gestión y Control</p>
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                </div>
            </div>

            {/* ── Login Form Card ────────────────────── */}
            <div className="relative z-10 w-full max-w-sm p-8 rounded-3xl border border-primary/20 bg-[#14100b]/80 backdrop-blur-3xl shadow-[0_20px_80px_-20px_rgba(177,120,20,0.2)]">
                {/* Inner light top edge */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                {/* Glow Overlay target for top center */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-primary/20 blur-xl rounded-full opacity-40 pointer-events-none" />
                <form onSubmit={handleLogin} className="space-y-6 relative z-10">

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] ml-2">Correo Corporativo</label>
                        <div className="group flex items-center gap-3 px-5 py-4 bg-black/60 border border-white/10 rounded-2xl focus-within:border-primary/40 focus-within:bg-black/80 transition-all shadow-inner">
                            <span className="material-icons-round text-white/30 text-base group-focus-within:text-primary transition-colors">alternate_email</span>
                            <input
                                id="email"
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
                        <label htmlFor="password" className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] ml-2">Clave Maestra</label>
                        <div className="group flex items-center gap-3 px-5 py-4 bg-black/60 border border-white/10 rounded-2xl focus-within:border-primary/40 focus-within:bg-black/80 transition-all shadow-inner">
                            <span className="material-icons-round text-white/30 text-base group-focus-within:text-primary transition-colors">vpn_key</span>
                            <input
                                id="password"
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
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 animate-shake">
                            <span className="material-icons-round text-red-400 text-sm">error</span>
                            <span className="font-bold uppercase tracking-widest text-[9px] text-red-300">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 mt-4 rounded-2xl flex items-center justify-center gap-3 group transition-all duration-200 active:scale-[0.98] shadow-[0_10px_30px_rgba(177,120,20,0.15)] hover:shadow-[0_10px_40px_rgba(177,120,20,0.25)] relative overflow-hidden"
                        style={{ border: '1px solid rgba(245,200,66,0.3)' }}
                    >
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(245,200,66,0.2) 0%,rgba(177,120,20,0.05) 100%)' }} />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg,rgba(245,200,66,0.3) 0%,rgba(177,120,20,0.1) 100%)' }} />

                        <div className="relative flex items-center gap-3 z-10">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="font-black text-white text-sm uppercase tracking-[0.2em] drop-shadow-md">Acceder a Control</span>
                                    <span className="material-icons-round text-primary text-lg group-hover:translate-x-1 transition-transform drop-shadow-md">admin_panel_settings</span>
                                </>
                            )}
                        </div>
                    </button>
                </form>
            </div>

            {/* ── Footer / Back ──────────────────────── */}
            <div className="relative z-10 mt-8 flex flex-col items-center gap-4">
                <p className="text-[8px] tracking-[0.4em] text-primary/40 font-black uppercase flex items-center gap-2">
                    <span className="material-icons-round text-[10px]">policy</span>
                    Acceso Restringido
                </p>
                <Link href="/" className="px-6 py-2 rounded-full border border-primary/20 bg-primary/5 text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-primary/20 hover:text-primary transition-colors active:scale-95">
                    <span className="material-icons-round text-[12px]">keyboard_return</span>
                    Regresar
                </Link>
            </div>
        </main>
    )
}
