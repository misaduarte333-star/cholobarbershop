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
    const SUCURSAL_ID = '1'

    const supabase = createClient()

    useEffect(() => {
        // PERF: Start auth check and subscription in parallel
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser?.email) {
                const { data } = await supabase
                    .from('usuarios_admin')
                    .select('rol')
                    .eq('email', currentUser.email)
                    .maybeSingle()

                if (data) setIsAdmin(true)
            }
            setLoading(false)
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const newUser = session?.user ?? null
            setUser(newUser)
            setLoading(false)

            // Re-check admin if user changed
            if (newUser?.email) {
                supabase.from('usuarios_admin')
                    .select('rol')
                    .eq('email', newUser.email)
                    .maybeSingle()
                    .then(({ data }) => setIsAdmin(!!data))
            }
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // PERF: Don't block the entire app tree if possible, 
    // but the layout needs the context to avoid flickering.
    return (
        <AuthContext.Provider value={{ user, loading, sucursalId: SUCURSAL_ID, isAdmin }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
