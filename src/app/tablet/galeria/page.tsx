'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface Servicio {
    id: string
    nombre: string
    precio: number
}

interface FotoCorte {
    id?: string
    servicio_id: string
    url: string
}

export default function GalleryPage() {
    const router = useRouter()
    const [barbero, setBarbero] = useState<{ id: string, nombre: string } | null>(null)
    const [servicios, setServicios] = useState<Servicio[]>([])
    const [fotosMap, setFotosMap] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<string | null>(null)

    const supabase = createClient()

    // Auth & Load Data
    useEffect(() => {
        const sessionStr = localStorage.getItem('barbero_session')
        if (!sessionStr) {
            router.push('/tablet/login')
            return
        }
        const session = JSON.parse(sessionStr)
        setBarbero(session)
        loadData(session.id)
    }, [router])

    const loadData = async (barberoId: string) => {
        setLoading(true)
        try {
            // 1. Cargar servicios disponibles
            const { data: servs } = await (supabase
                .from('servicios') as any)
                .select('*')
                .eq('activo', true)

            setServicios(servs || [])

            // 2. Cargar fotos ya subidas
            const { data: fotos } = await (supabase
                .from('fotos_cortes') as any)
                .select('servicio_id, url')
                .eq('barbero_id', barberoId)

            const map: Record<string, string> = {}
            fotos?.forEach((f: FotoCorte) => {
                map[f.servicio_id] = f.url
            })
            setFotosMap(map)
        } catch (err) {
            console.error('Error loading gallery data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (servicioId: string, file: File) => {
        if (!barbero) return
        setUploading(servicioId)

        try {
            // 1. Subir a Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${barbero.id}/${servicioId}.${fileExt}`
            const filePath = `cortes/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('cortes')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('cortes')
                .getPublicUrl(filePath)

            // 3. Guardar/Actualizar en base de datos
            const { error: dbError } = await (supabase
                .from('fotos_cortes') as any)
                .upsert({
                    barbero_id: barbero.id,
                    servicio_id: servicioId,
                    url: publicUrl
                }, { onConflict: 'barbero_id,servicio_id' })

            if (dbError) throw dbError

            setFotosMap(prev => ({ ...prev, [servicioId]: publicUrl }))
        } catch (err: any) {
            alert('Error al subir imagen: ' + err.message)
        } finally {
            setUploading(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/tablet" className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase">Mi <span className="text-[var(--primary)]">Galería</span></h1>
                            <p className="text-slate-500 text-sm">Gestiona las fotos de tus trabajos por servicio</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {servicios.map((servicio) => (
                            <div key={servicio.id} className="glass-card overflow-hidden group border-slate-800/50 hover:border-[var(--primary)]/30 transition-all">
                                <div className="aspect-video relative bg-slate-100 flex items-center justify-center">
                                    {fotosMap[servicio.id] ? (
                                        <img
                                            src={fotosMap[servicio.id]}
                                            alt={servicio.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center p-6">
                                            <svg className="w-12 h-12 text-slate-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-xs text-slate-600">Sin foto actual</p>
                                        </div>
                                    )}

                                    {/* Uploading Overlay */}
                                    {uploading === servicio.id && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                            <div className="spinner" />
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <label className="absolute bottom-4 right-4 cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handleUpload(servicio.id, e.target.files[0])}
                                            disabled={!!uploading}
                                        />
                                        <div className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            {fotosMap[servicio.id] ? 'Cambiar Foto' : 'Subir Foto'}
                                        </div>
                                    </label>
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-white">
                                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">{servicio.nombre}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Sube tu mejor trabajo de este servicio</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-10 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex gap-3">
                        <span className="text-xl">🤖</span>
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            Estas fotos serán visibles automáticamente por el bot de WhatsApp (n8n).
                            Asegúrate de que tus trabajos luzcan impecables para atraer más clientes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
