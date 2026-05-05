import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const { usuario, password } = await request.json()

        if (!usuario || !password) {
            return NextResponse.json(
                { error: 'Usuario y contraseña son requeridos' },
                { status: 400 }
            )
        }

        const supabase = createClient()
        
        // Buscar el barbero por su usuario_tablet
        const { data: barberos, error } = await supabase
            .from('barberos')
            .select('*')
            .eq('usuario_tablet', usuario)
            .limit(1)

        if (error) {
            console.error('Error fetching barbero:', error)
            return NextResponse.json(
                { error: 'Error del servidor al buscar el usuario' },
                { status: 500 }
            )
        }

        const barbero = barberos?.[0] as any

        if (!barbero) {
            return NextResponse.json(
                { error: 'Usuario o contraseña incorrectos' },
                { status: 401 }
            )
        }

        // Si por alguna razón el campo de base de datos no es password_hash, ajusta esto:
        if (!barbero.password_hash) {
            return NextResponse.json(
                { error: 'El usuario no tiene una contraseña configurada' },
                { status: 401 }
            )
        }

        // Comparar la contraseña ingresada con el hash bcrypt guardado
        const isValid = await bcrypt.compare(password, barbero.password_hash)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Usuario o contraseña incorrectos' },
                { status: 401 }
            )
        }

        // Remover de la data a devolver el password para no compartirlo
        const { password_hash, ...barberoData } = barbero

        // Devolver la información para ser almacenada en la sesión del app
        return NextResponse.json({
            success: true,
            user: barberoData
        })

    } catch (err: any) {
        console.error('[POST /api/auth/login-barbero] Full Error:', {
            message: err.message,
            details: err.details,
            hint: err.hint,
            code: err.code,
            stack: err.stack
        })
        const errorMessage = err.details || err.message || 'Error interno del servidor durante el login'
        return NextResponse.json(
            { error: 'ServerError', message: errorMessage },
            { status: 500 }
        )
    }
}
