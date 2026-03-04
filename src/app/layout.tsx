import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
})

const montserrat = Montserrat({
    variable: '--font-montserrat',
    subsets: ['latin'],
    display: 'swap',
    weight: ['300', '400', '700', '900'],
})

export const metadata: Metadata = {
    title: 'CholoBarber AI',
    description: 'Sistema inteligente de gestión de citas para barberías',
    keywords: ['barbería', 'citas', 'gestión', 'IA', 'WhatsApp'],
    authors: [{ name: 'BarberCloud' }],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="es" className={`${inter.variable} ${montserrat.variable}`}>
            <head>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
            </head>
            <body className="antialiased">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
