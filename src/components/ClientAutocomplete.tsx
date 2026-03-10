'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Cliente } from '@/lib/types'
import { User, Phone, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ClientAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onSelect: (cliente: { nombre: string; telefono: string | null }) => void
    placeholder?: string
    className?: string
}

export function ClientAutocomplete({ value, onChange, onSelect, placeholder, className }: ClientAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    const supabase = createClient()
    const containerRef = useRef<HTMLDivElement>(null)

    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([])
            setOpen(false)
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
                .order('total_citas', { ascending: false })
                .limit(5)

            if (error) throw error
            setSuggestions(data || [])
            setOpen(data && data.length > 0)
            setSelectedIndex(-1)
        } catch (err) {
            console.error('Error fetching suggestions:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        const timer = setTimeout(() => {
            // Only fetch if the current value is different from the last selection or if we are typing
            fetchSuggestions(value)
        }, 300)
        return () => clearTimeout(timer)
    }, [value, fetchSuggestions])

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault()
            const chosen = suggestions[selectedIndex]
            onSelect({ nombre: chosen.nombre, telefono: chosen.telefono })
            setOpen(false)
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="group relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => {
                        if (value.length >= 2) setOpen(true)
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl text-sm font-bold focus-visible:ring-primary/50 focus-visible:bg-black/40 transition-all placeholder:text-white/10"
                    placeholder={placeholder || "Nombre del Cliente"}
                />
                {loading && <Loader2 className="absolute right-4 w-4 h-4 text-primary animate-spin" />}
            </div>

            {open && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0C10] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                        {suggestions.map((cliente, index) => (
                            <button
                                key={cliente.id}
                                type="button"
                                onClick={() => {
                                    onSelect({ nombre: cliente.nombre, telefono: cliente.telefono })
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all group/item",
                                    selectedIndex === index ? "bg-primary/20 text-primary" : "hover:bg-white/5"
                                )}
                            >
                                <div className="flex flex-col items-start px-2">
                                    <span className={cn(
                                        "text-sm font-black uppercase tracking-tight",
                                        selectedIndex === index ? "text-primary" : "text-white group-hover/item:text-primary"
                                    )}>
                                        {cliente.nombre}
                                    </span>
                                    {cliente.telefono && (
                                        <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                                            <Phone className="w-3 h-3" />
                                            <span>{cliente.telefono}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                    {cliente.total_citas} Citas
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="bg-white/5 px-4 py-2 border-t border-white/5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic">
                            Resultados encontrados en base de datos
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
