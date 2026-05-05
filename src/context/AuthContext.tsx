'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
    user: User | null
    loading: boolean
    sucursalId: string
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    sucursalId: '1',
    isAdmin: false
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [sucursalId, setSucursalId] = useState<string>('1') // Default to '1' as fallback

    const supabase = createClient()

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser?.email) {
                const { data } = await supabase
                    .from('usuarios_admin')
                    .select('rol, sucursal_id')
                    .eq('email', currentUser.email)
                    .maybeSingle()

                if (data) {
                    setIsAdmin(true)
                    if (data.sucursal_id) {
                        setSucursalId(data.sucursal_id)
                    }
                }
            }
            setLoading(false)
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user ?? null
            setUser(newUser)
            
            // Re-check admin if user changed
            if (newUser?.email) {
                const { data } = await supabase.from('usuarios_admin')
                    .select('rol, sucursal_id')
                    .eq('email', newUser.email)
                    .maybeSingle()
                
                if (data) {
                    setIsAdmin(true)
                    if (data.sucursal_id) {
                        setSucursalId(data.sucursal_id)
                    }
                } else {
                    setIsAdmin(false)
                }
            } else {
                setIsAdmin(false)
            }
            
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    return (
        <AuthContext.Provider value={{ user, loading, sucursalId, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
