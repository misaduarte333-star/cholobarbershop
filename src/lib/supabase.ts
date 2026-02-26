import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Check if Supabase is configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Flag to check if we're in demo mode
// Stricter check to avoid "Invalid URL" errors during build
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes('your-project') ||
    SUPABASE_URL === '' ||
    SUPABASE_URL === 'undefined' ||
    !SUPABASE_URL.startsWith('http')

// Power-mock: A proxy that returns dummy functions for everything
// This prevents "X is not a function" errors in demo mode
const createPowerMock = () => {
    const dummyFn = () => ({
        data: null,
        error: null,
        select: dummyFn,
        insert: dummyFn,
        update: dummyFn,
        delete: dummyFn,
        eq: dummyFn,
        neq: dummyFn,
        gte: dummyFn,
        lte: dummyFn,
        or: dummyFn,
        order: dummyFn,
        limit: dummyFn,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (onfulfilled: any) => onfulfilled({ data: null, error: null }),
        on: dummyFn,
        subscribe: dummyFn,
        unsubscribe: dummyFn,
        channel: dummyFn,
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signIn: () => Promise.resolve({ data: null, error: null }),
            signOut: () => Promise.resolve({ error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null })
        }
    })

    const handler: ProxyHandler<any> = {
        get(target, prop) {
            if (prop === 'auth') return target.auth
            if (prop === 'from') return () => new Proxy(dummyFn(), handler)
            if (prop in target) return target[prop]
            return dummyFn
        }
    }

    return new Proxy(dummyFn(), handler)
}

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
    // During build or if missing, use mock to prevent crash
    if (isDemoMode) {
        if (typeof window !== 'undefined') {
            console.warn('🎭 BarberCloud: Using Demo Mode (Incomplete/Missing Supabase Config)')
        }
        return createPowerMock() as any
    }

    try {
        return createBrowserClient<Database>(
            SUPABASE_URL!,
            SUPABASE_ANON_KEY!
        )
    } catch (e) {
        console.error('Supabase Init Error:', e)
        return createPowerMock() as any
    }
}

// Server-side client for API routes
export function createServerClient(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
        return createPowerMock() as any
    }
    return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
