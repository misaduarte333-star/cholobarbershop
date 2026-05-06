'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
    user: User | null
    loading: boolean
    authLoading: boolean   // true while session + sucursalId are being resolved
    sucursalId: string
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    authLoading: true,
    sucursalId: '',
    isAdmin: false
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [authLoading, setAuthLoading] = useState(true) // true until sucursalId is resolved
    const [isAdmin, setIsAdmin] = useState(false)
    const [sucursalId, setSucursalId] = useState<string>('')

    const supabase = createClient()

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const currentUser = session?.user ?? null
                setUser(currentUser)

                if (currentUser?.email) {
                    const { data } = await supabase
                        .from('usuarios_admin')
                        .select('rol, sucursal_id')
                        .eq('email', currentUser.email)
                        .maybeSingle() as { data: any }

                    if (data) {
                        setIsAdmin(true)
                        if (data.sucursal_id) {
                            setSucursalId(data.sucursal_id)
                        }
                    }
                }
            } catch (err) {
                console.error('AuthContext initAuth error:', err)
            } finally {
                setLoading(false)
                setAuthLoading(false)
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user ?? null
            setUser(newUser)

            if (!newUser?.email) {
                setIsAdmin(false)
                setSucursalId('')
                setLoading(false)
                setAuthLoading(false)
                return
            }

            try {
                const { data } = await supabase
                    .from('usuarios_admin')
                    .select('rol, sucursal_id')
                    .eq('email', newUser.email)
                    .maybeSingle() as { data: any }

                if (data) {
                    setIsAdmin(true)
                    if (data.sucursal_id) {
                        setSucursalId(data.sucursal_id)
                    }
                } else {
                    setIsAdmin(false)
                    setSucursalId('')
                }
            } catch (err) {
                console.error('AuthContext onAuthStateChange error:', err)
            } finally {
                setLoading(false)
                setAuthLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    return (
        <AuthContext.Provider value={{ user, loading, authLoading, sucursalId, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
