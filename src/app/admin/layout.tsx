'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { cn } from '@/lib/utils'
import { isLowEndDevice } from '@/lib/performance'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
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

    const isLinkActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin'
        return pathname === href || pathname.startsWith(href + '/')
    }

    const [isLowPerformance, setIsLowPerformance] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLowPerformance(isLowEndDevice())
        }
    }, [])

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-glow-gold"></div>
            </div>
        )
    }

    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    return (
        <div className={cn(
            "dark bg-[#0A0A0A] text-slate-100 min-h-screen flex flex-col lg:flex-row font-display relative selection:bg-primary selection:text-black antialiased",
            isLowPerformance && "efficiency-mode"
        )}>
            {/* Material Symbols Outlined stylesheet */}
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

            {/* Mobile Header (Elite Style) */}
            <header className="lg:hidden h-14 px-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-30">
                <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 bg-black">
                        <img src="/logo-cholo.jpg" alt="Logo" className="w-full h-full object-cover transform scale-110" />
                    </div>
                    <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase italic">CHOLO<span className="text-primary">BARBER</span></h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg overflow-hidden border border-white/10">
                        <Image 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAupJ0NN2FAFZ6tI6RCShLVEdmHhuGCITlUKRL6_nXpmUHJwgFD5gdYKHv4rgGoTTyZjfhMPhOizJfi_Wr0I8ScGatKToDD6OoSBPCK216hMjcwbbVW8ECH4_42v7X7UxdAc0iJnJ3ZYaVfVubqC5ggr2alR3AGRmXpmgpnox1TvJ_LjpECls_bxd51pd4_A9JwUKRWndND9sgtx_KrQo6V3Ish93C9evXJpme6TaCkAOstX_qONuWfqoJ4uYZWK8CxXjC5OmTd8Wg" 
                            alt="Avatar"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </header>

            <aside className={`
                w-72 bg-card-dark border-r border-primary/20 flex-col h-screen sticky top-0 z-50 overflow-hidden
                hidden lg:flex transition-transform duration-500
            `}>
                <div className="p-6 flex items-center gap-3.5">
                    <div className="size-12 rounded-xl overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 bg-black transition-transform hover:scale-110">
                        <img src="/logo-cholo.jpg" alt="Logo" className="w-full h-full object-cover transform scale-110" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-[0.2em] text-white leading-none">CHOLO<span className="text-primary italic">BARBER</span></h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black mt-1">Panel Elite v2.0</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto custom-scrollbar pt-2">
                    <NavItem href="/admin" icon="dashboard" label="Panel Control" active={isLinkActive('/admin')} />
                    <NavItem href="/admin/citas" icon="calendar_month" label="Agenda Global" active={isLinkActive('/admin/citas')} />
                    <NavItem href="/admin/clientes" icon="badge" label="Clientes" active={isLinkActive('/admin/clientes')} />
                    <NavItem href="/admin/barberos" icon="engineering" label="Gestión Staff" active={isLinkActive('/admin/barberos')} />
                    <NavItem href="/admin/servicios" icon="brush" label="Servicios" active={isLinkActive('/admin/servicios')} />
                    <NavItem href="/admin/reportes" icon="monitoring" label="Reportes" active={isLinkActive('/admin/reportes')} />
                    <NavItem href="/admin/finanzas" icon="account_balance_wallet" label="Finanzas" active={isLinkActive('/admin/finanzas')} />
                    <NavItem href="/admin/configuracion" icon="settings" label="Ajustes" active={isLinkActive('/admin/configuracion')} />
                </nav>

                <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
                    <div className="bg-[#141414]/50 rounded-2xl p-3 border border-white/5 hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl overflow-hidden border border-primary/20 group-hover:scale-105 transition-transform">
                                <img 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAupJ0NN2FAFZ6tI6RCShLVEdmHhuGCITlUKRL6_nXpmUHJwgFD5gdYKHv4rgGoTTyZjfhMPhOizJfi_Wr0I8ScGatKToDD6OoSBPCK216hMjcwbbVW8ECH4_42v7X7UxdAc0iJnJ3ZYaVfVubqC5ggr2alR3AGRmXpmgpnox1TvJ_LjpECls_bxd51pd4_A9JwUKRWndND9sgtx_KrQo6V3Ish93C9evXJpme6TaCkAOstX_qONuWfqoJ4uYZWK8CxXjC5OmTd8Wg" 
                                    alt="Admin"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-white leading-none uppercase tracking-wider truncate">Administrador</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">Master Access</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => { localStorage.removeItem('admin_session'); router.push('/admin/login'); }}
                            className="w-full mt-3 py-2 text-[10px] font-black text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all uppercase tracking-widest border border-white/5"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/90 border-t border-white/5 py-2 z-40 backdrop-blur-xl">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-6 relative">
                    {/* Shadow indicators for scrolling */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                    
                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin') ? 'text-primary' : 'text-slate-500'}`} href="/admin">
                        <span className="material-symbols-outlined text-xl leading-none">dashboard</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Inicio</span>
                        {isLinkActive('/admin') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>
                    
                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/citas') ? 'text-primary' : 'text-slate-500'}`} href="/admin/citas">
                        <span className="material-symbols-outlined text-xl leading-none">calendar_month</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Agenda</span>
                        {isLinkActive('/admin/citas') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/clientes') ? 'text-primary' : 'text-slate-500'}`} href="/admin/clientes">
                        <span className="material-symbols-outlined text-xl leading-none">badge</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Clientes</span>
                        {isLinkActive('/admin/clientes') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/barberos') ? 'text-primary' : 'text-slate-500'}`} href="/admin/barberos">
                        <span className="material-symbols-outlined text-xl leading-none">engineering</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Staff</span>
                        {isLinkActive('/admin/barberos') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/servicios') ? 'text-primary' : 'text-slate-500'}`} href="/admin/servicios">
                        <span className="material-symbols-outlined text-xl leading-none">brush</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Servicios</span>
                        {isLinkActive('/admin/servicios') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/reportes') ? 'text-primary' : 'text-slate-500'}`} href="/admin/reportes">
                        <span className="material-symbols-outlined text-xl leading-none">monitoring</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Reportes</span>
                        {isLinkActive('/admin/reportes') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/finanzas') ? 'text-primary' : 'text-slate-500'}`} href="/admin/finanzas">
                        <span className="material-symbols-outlined text-xl leading-none">account_balance_wallet</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Finanzas</span>
                        {isLinkActive('/admin/finanzas') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>

                    <Link className={`flex flex-col items-center gap-1 min-w-[72px] py-1 transition-all ${isLinkActive('/admin/configuracion') ? 'text-primary' : 'text-slate-500'}`} href="/admin/configuracion">
                        <span className="material-symbols-outlined text-xl leading-none">settings</span>
                        <span className="text-[9px] font-black tracking-widest uppercase">Ajustes</span>
                        {isLinkActive('/admin/configuracion') && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full shadow-glow-gold" />}
                    </Link>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 relative z-10">
                <ConnectionStatus />
                <div className="max-w-7xl mx-auto w-full animate-fade-in relative flex-1 p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                ${active
                    ? 'bg-primary text-black font-black shadow-[0_0_20px_-5px_rgba(212,175,55,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                }
            `}
        >
            {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20" />
            )}
            <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${!active && 'group-hover:scale-110 group-hover:rotate-6 opacity-70 group-hover:opacity-100'} ${active ? 'font-black' : ''}`}>
                {icon}
            </span>
            <span className={`text-[11px] uppercase tracking-[0.15em] transition-all ${active ? 'font-black' : 'font-bold'}`}>
                {label}
            </span>
            
            {!active && (
                <div className="absolute right-2 translate-x-4 group-hover:translate-x-0 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[10px] text-primary/40">chevron_right</span>
                </div>
            )}
        </Link>
    )
}
