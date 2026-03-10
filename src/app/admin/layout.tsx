'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { ConnectionStatus } from '@/components/ConnectionStatus'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const active = pathname.split('/').pop() || 'admin'

    useEffect(() => {
        // Skip check if we are on the login page (though login has its own page.tsx in subfolder,
        // layout applies to all /admin/*)
        if (pathname === '/admin/login') {
            setIsCheckingAuth(false)
            return
        }

        const session = localStorage.getItem('admin_session')
        if (!session) {
            router.push('/admin/login')
        } else {
            setIsCheckingAuth(false)
        }
    }, [pathname, router])

    // Helper for active state
    const isLinkActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin'
        return pathname === href || pathname.startsWith(href + '/')
    }

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050608] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)]"></div>
            </div>
        )
    }

    // Exempt login page from the admin layout wrapper
    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    return (
        <div className="min-h-[100dvh] bg-shop-premium bg-fixed flex text-white relative font-sans selection:bg-primary selection:text-black antialiased">
            {/* Design Overlays */}
            <div className="fixed inset-0 vignette-overlay pointer-events-none z-0" />
            <div className="fixed top-0 left-0 w-full h-1 bg-gradient-brand z-[100]" />

            {/* Mobile Header (Premium) */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-3xl border-b border-white/5 z-[60] px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-gold p-[1px]">
                        <div className="w-full h-full rounded-lg bg-black flex items-center justify-center">
                            <span className="text-sm font-black text-gradient-gold">CB</span>
                        </div>
                    </div>
                    <span className="font-black text-xs tracking-tight text-white font-display uppercase">CHOLO<span className="text-primary font-black">BARBER</span></span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 active:scale-95 transition-transform"
                >
                    <span className="material-icons-round text-xl">
                        {isSidebarOpen ? 'close' : 'menu'}
                    </span>
                </button>
            </header>

            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Premium Glassmorphism) */}
            <aside className={`
                w-64 glass-card border-r border-white/5 flex-shrink-0 fixed h-[calc(100dvh-1rem)] m-2 z-[80] shadow-[30px_0_60px_rgba(0,0,0,0.5)]
                transition-all duration-500 ease-out lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-5 h-full flex flex-col relative z-10">
                    {/* Logo Section */}
                    <Link href="/admin" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-all group">
                        <div className="relative group-hover:scale-110 transition-transform duration-500">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover:bg-primary/40 transition-all" />
                            <div className="relative w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
                                <span className="text-xl font-black text-gradient-gold">CB</span>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-black text-lg leading-none tracking-tight text-white drop-shadow-md font-display uppercase">CHOLO<span className="text-primary">BARBER</span></h1>
                            <p className="text-[8px] uppercase tracking-[0.3em] text-white/30 font-black mt-1.5 leading-none">Admin Panel</p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <NavItem href="/admin" icon="dashboard" label="Dashboard" active={isLinkActive('/admin')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/citas" icon="event_note" label="Agenda" active={isLinkActive('/admin/citas')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/clientes" icon="person_search" label="Clientes" active={isLinkActive('/admin/clientes')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/barberos" icon="groups" label="Barberos" active={isLinkActive('/admin/barberos')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/servicios" icon="content_cut" label="Servicios" active={isLinkActive('/admin/servicios')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/reportes" icon="analytics" label="Análisis" active={isLinkActive('/admin/reportes')} onClick={() => setIsSidebarOpen(false)} />
                        <NavItem href="/admin/configuracion" icon="tune" label="Ajustes" active={isLinkActive('/admin/configuracion')} onClick={() => setIsSidebarOpen(false)} />
                    </nav>

                    {/* Footer / Logout */}
                    <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3">
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl flex items-center gap-3 group/profile hover:border-primary/20 transition-all">
                            <div className="w-9 h-9 rounded-lg bg-gradient-gold text-black flex items-center justify-center text-[10px] font-black shadow-lg">
                                AD
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-white truncate uppercase tracking-widest font-display">Administrador</p>
                                <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.1em] mt-0.5">Master</p>
                            </div>
                        </div>

                        <button
                            onClick={() => { localStorage.removeItem('admin_session'); router.push('/admin/login'); }}
                            className="flex items-center gap-3 px-5 py-3 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 font-black text-[9px] uppercase tracking-[0.2em] w-full border border-transparent hover:border-red-500/10 active:scale-95"
                        >
                            <span className="material-icons-round text-lg">logout</span>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
                {/* Visual Glass Accents */}
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 px-6 sm:px-12 md:px-20 py-6 min-h-[100dvh] overflow-y-auto relative z-10 pt-20 lg:pt-6 flex flex-col">
                <ConnectionStatus />
                <div className="max-w-7xl mx-auto w-full animate-fade-in relative flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`
                flex items-center gap-4 px-5 py-3 rounded-[1.2rem] transition-all duration-500 relative group w-full
                ${active
                    ? 'bg-gradient-gold text-black shadow-[0_10px_25px_rgba(234,179,8,0.3)] scale-[1.02] border-primary'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 hover:translate-x-1'
                }
            `}
        >
            <span className={`material-icons-round text-2xl ${active ? 'text-black' : 'group-hover:text-primary transition-colors'}`}>
                {icon}
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] font-display">
                {label}
            </span>
            {active && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-black shadow-inner" />
            )}
        </Link>
    )
}
