'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function ConnectionStatus() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'error' | 'demo'>('loading')
    const [message, setMessage] = useState('')
    const [details, setDetails] = useState<any>(null)

    useEffect(() => {
        const checkConnection = async () => {
            const supabase = createClient()

            // Check if we are in demo mode (client-side check in lib/supabase.ts)
            // We can infer this if the client is essentially a mock, but let's try a real query.
            // If the query fails with a specific "Demo mode" error or similar, we know.
            // Actually, let's just try to fetch the sucursal or services.

            try {
                const start = performance.now()
                // Check basic connection
                const { data, error } = await (supabase.from('sucursales') as any).select('count').single()
                const end = performance.now()

                if (error) {
                    console.error('Supabase Connection Error:', error)
                    if (error.message?.includes('Demo mode')) {
                        setStatus('demo')
                        setMessage('Modo Demo (Sin Conexión)')
                    } else {
                        setStatus('error')
                        setMessage(`Error de Conexión: ${error.message}`)
                        setDetails(error)
                    }
                } else {
                    // Connection successful, let's get some stats to help debugging
                    const { count: citasCount } = await (supabase.from('citas') as any).select('*', { count: 'exact', head: true })

                    setStatus('connected')
                    setMessage(`Conectado (${(end - start).toFixed(0)}ms) • ${citasCount} citas encontradas`)
                }
            } catch (err: any) {
                console.error('Connection Exception:', err)
                setStatus('error')
                setMessage(`Error Inesperado: ${err.message}`)
            }
        }

        checkConnection()
    }, [])

    if (status === 'loading') return <div className="fixed bottom-4 right-4 z-50 text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded">Verificando...</div>

    return (
        <div className={`
            fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all flex flex-col gap-1
            ${status === 'connected' ? 'bg-slate-900/90 border-emerald-500/30 shadow-emerald-900/20' : ''}
            ${status === 'error' ? 'bg-slate-900/90 border-red-500/30 shadow-red-900/20' : ''}
            ${status === 'demo' ? 'bg-slate-900/90 border-primary/30 shadow-primary/20' : ''}
        `}>
            <div className="flex items-center gap-3">
                <span className={`relative flex h-2.5 w-2.5`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
                    ${status === 'connected' ? 'bg-emerald-400' : ''}
                    ${status === 'error' ? 'bg-red-400' : ''}
                    ${status === 'demo' ? 'bg-amber-400' : ''}
                  `}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5
                    ${status === 'connected' ? 'bg-emerald-500' : ''}
                    ${status === 'error' ? 'bg-red-500' : ''}
                    ${status === 'demo' ? 'bg-primary' : ''}
                  `}></span>
                </span>
                <span className={`text-sm font-semibold
                    ${status === 'connected' ? 'text-emerald-400' : ''}
                    ${status === 'error' ? 'text-red-400' : ''}
                    ${status === 'demo' ? 'text-amber-400' : ''}
                `}>{message}</span>
            </div>
            {status === 'error' && details && (
                <div className="mt-1 text-[10px] text-red-300 opacity-75 max-w-[250px] overflow-hidden text-ellipsis">
                    {details.message || JSON.stringify(details)}
                </div>
            )}
        </div>
    )
}
