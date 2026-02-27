'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-blue-600 to-red-600" />
            <div
                className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 bg-blue-600"
            />
            <div
                className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-10 bg-red-600"
            />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-6">
                <div className="glass-card p-8 animate-slide-in bg-white shadow-2xl border-slate-200">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 shadow-xl mb-6">
                            <span className="text-3xl font-black text-white italic tracking-tighter">CB</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acceso Tablet</h1>
                        <p className="text-slate-500 mt-2 font-medium">Estación de Trabajo CholoBarber</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="usuario" className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">
                                Usuario
                            </label>
                            <input
                                id="usuario"
                                type="text"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                className="input-field border-slate-200"
                                placeholder="Tu usuario de estación"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field border-slate-200"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" />
                                    Ingresando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>

                    {/* Help Text */}
                    <p className="text-center text-slate-500 text-sm mt-6">
                        ¿Problemas para acceder? Contacta al administrador
                    </p>
                </div>
            </div>
        </div>
    )
}
