import { Metadata, Viewport } from 'next'
import { Inter, Montserrat, Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { cn } from "@/lib/utils";
import { MotionConfig } from 'framer-motion';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="es" className={cn(inter.variable, montserrat.variable, "font-sans", geist.variable, "dark")}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round&display=swap" rel="stylesheet" />
            </head>
            <body className="bg-background-dark text-slate-100 dark:bg-background-dark dark:text-slate-100 min-h-screen font-display antialiased">
                <MotionConfig reducedMotion="user">
                    <AuthProvider>
                        {children}
                        <Toaster position="top-right" richColors closeButton />
                    </AuthProvider>
                </MotionConfig>
            </body>
        </html>
    )
}
