'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ConnectionStatus } from '@/components/ConnectionStatus'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const active = pathname.split('/').pop() || 'admin'

    // Helper for active state
    const isActive = (key: string) => {
        if (key === 'dashboard') return pathname === '/admin'
        return pathname.startsWith(`/admin/${key}`)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 fixed h-full z-50 shadow-sm">
                <div className="p-6 h-full flex flex-col">
                    {/* Logo */}
                    <Link href="/admin" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                            <span className="text-xl font-black text-white">CB</span>
                        </div>
                        <div>
                            <h1 className="font-black text-lg leading-none tracking-tighter text-slate-900">CHOLO<span className="text-[var(--primary)]">BARBER</span></h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Management</p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="space-y-1 flex-1">
                        <NavItem href="/admin" icon="dashboard" label="Dashboard" active={isActive('dashboard')} />
                        <NavItem href="/admin/citas" icon="calendar" label="Citas" active={isActive('citas')} />
                        <NavItem href="/admin/barberos" icon="users" label="Barberos" active={isActive('barberos')} />
                        <NavItem href="/admin/servicios" icon="scissors" label="Servicios" active={isActive('servicios')} />
                        <NavItem href="/admin/reportes" icon="chart" label="Reportes" active={isActive('reportes')} />
                        <NavItem href="/admin/configuracion" icon="settings" label="Configuración" active={isActive('configuracion')} />
                    </nav>

                    {/* User Profile & Logout */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                        <div className="p-3 flex items-center gap-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                A
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">Admin</p>
                                <p className="text-xs text-slate-500 font-medium">Sucursal Principal</p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors duration-200 font-bold text-sm w-full"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8 min-h-screen relative bg-slate-50/50">
                <ConnectionStatus />
                <div className="max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) {
    const getIcon = () => {
        switch (icon) {
            case 'dashboard': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            case 'calendar': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            case 'users': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            case 'scissors': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            case 'chart': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            case 'settings': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.31 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            default: return null
        }
    }

    return (
        <Link
            href={href}
            className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${active
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }
      `}
        >
            <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-[var(--primary)]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {getIcon()}
            </svg>
            <span className="font-bold">{label}</span>
            {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/50" />
            )}
        </Link>
    )
}
