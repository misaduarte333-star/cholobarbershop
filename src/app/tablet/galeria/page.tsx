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
        <div className="min-h-screen bg-[var(--background-dark)] text-white p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 light-leak-top opacity-20" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/tablet" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                            <span className="material-icons-round text-slate-400">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase font-display">Mi <span className="text-gradient-gold">Galería</span></h1>
                            <p className="text-primary mt-1 font-bold text-[10px] uppercase tracking-[0.2em]">Gestiona las fotos de tus trabajos por servicio</p>
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
                            <div key={servicio.id} className="glass-card overflow-hidden group border-white/5 hover:border-primary/30 transition-all">
                                <div className="aspect-video relative bg-[#0B0D11] flex items-center justify-center">
                                    {fotosMap[servicio.id] ? (
                                        <img
                                            src={fotosMap[servicio.id]}
                                            alt={servicio.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center p-6 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                            <span className="material-icons-round text-5xl text-slate-700 mb-2">add_a_photo</span>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sin foto actual</p>
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
                                        <div className="btn-primary py-2 px-4 text-[10px] font-black flex items-center gap-2 font-display uppercase tracking-widest shadow-xl">
                                            <span className="material-icons-round text-sm">upload</span>
                                            {fotosMap[servicio.id] ? 'Cambiar Foto' : 'Subir Foto'}
                                        </div>
                                    </label>
                                </div>
                                <div className="p-4 border-t border-white/5 bg-[#0B0D11]/50">
                                    <h3 className="font-black text-white uppercase tracking-wider text-sm font-display">{servicio.nombre}</h3>
                                    <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Sube tu mejor trabajo de este servicio</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-10 p-5 rounded-2xl bg-primary/5 border border-primary/20 backdrop-blur-sm glow-gold">
                    <div className="flex gap-4">
                        <span className="material-icons-round text-primary">psychology</span>
                        <p className="text-[10px] text-primary leading-relaxed font-black uppercase tracking-[0.1em]">
                            Estas fotos serán visibles automáticamente por el bot de WhatsApp (n8n).
                            Asegúrate de que tus trabajos luzcan impecables para atraer más clientes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
