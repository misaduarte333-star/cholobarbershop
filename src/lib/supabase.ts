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

// Fallback Mock Object (Plain Structure - avoid Proxy issues)
const createFallbackMock = () => {
    const mockResponse = { data: null, error: null, count: 0 }
    const mockPromise = Promise.resolve(mockResponse)

    // Function that returns itself for chaining
    const chainer: any = () => chainer
    chainer.select = chainer
    chainer.insert = chainer
    chainer.update = chainer
    chainer.delete = chainer
    chainer.eq = chainer
    chainer.neq = chainer
    chainer.gte = chainer
    chainer.lte = chainer
    chainer.in = chainer
    chainer.or = chainer
    chainer.order = chainer
    chainer.limit = chainer
    chainer.range = chainer
    chainer.single = () => mockPromise
    chainer.maybeSingle = () => mockPromise
    chainer.then = (onfulfilled: any) => mockPromise.then(onfulfilled)

    return {
        from: () => chainer,
        channel: () => ({ on: chainer, subscribe: chainer, unsubscribe: () => { } }),
        removeChannel: () => { },
        removeAllChannels: () => { },
        auth: {
            getUser: () => mockPromise,
            getSession: () => mockPromise,
            signInWithPassword: () => mockPromise,
            signInWithOAuth: () => mockPromise,
            signOut: () => mockPromise,
            onAuthStateChange: (cb: any) => {
                // Call callback immediately to avoid hanging loading states
                // but wrapped in setTimeout to not block during init
                if (typeof window !== 'undefined') {
                    setTimeout(() => cb('INITIAL_SESSION', null), 0)
                }
                return { data: { subscription: { unsubscribe: () => { } } } }
            }
        }
    }
}

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
    const isBrowser = typeof window !== 'undefined'

    if (isDemoMode) {
        if (isBrowser) {
            console.warn('⚠️ PROYECTO EN MODO DEMO: No se detectó configuración de Supabase.')
            console.log('DEBUG INFO:', {
                url_present: !!SUPABASE_URL,
                url_type: typeof SUPABASE_URL,
                url_starts_with_http: SUPABASE_URL?.startsWith('http')
            })
        }
        return createFallbackMock() as any
    }

    try {
        return createBrowserClient<Database>(
            SUPABASE_URL!,
            SUPABASE_ANON_KEY!
        )
    } catch (e) {
        if (isBrowser) console.error('❌ Error al inicializar Supabase:', e)
        return createFallbackMock() as any
    }
}

// Server-side client for API routes
export function createServerClient(supabaseUrl: string, supabaseKey: string) {
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
        return createFallbackMock() as any
    }
    return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
