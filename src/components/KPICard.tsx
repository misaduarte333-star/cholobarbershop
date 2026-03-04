'use client'

interface KPICardProps {
    titulo: string
    valor: number | string
    color: 'purple' | 'green' | 'blue' | 'red' | 'amber'
    icon: 'calendar' | 'check' | 'money' | 'x' | 'users'
    trend?: number
    trendInverse?: boolean
}

export function KPICard({ titulo, valor, color, icon, trend, trendInverse }: KPICardProps) {
    const colorConfig = {
        purple: {
            bg: 'bg-slate-800/40',
            border: 'border-purple-500/30',
            icon: 'text-purple-400',
            iconBg: 'bg-purple-500/20'
        },
        green: {
            bg: 'bg-slate-800/40',
            border: 'border-emerald-500/30',
            icon: 'text-emerald-400',
            iconBg: 'bg-emerald-500/20'
        },
        blue: {
            bg: 'bg-slate-800/40',
            border: 'border-blue-500/30',
            icon: 'text-blue-400',
            iconBg: 'bg-blue-500/20'
        },
        red: {
            bg: 'bg-slate-800/40',
            border: 'border-red-500/30',
            icon: 'text-red-400',
            iconBg: 'bg-red-500/20'
        },
        amber: {
            bg: 'bg-white/5',
            border: 'border-primary/20',
            icon: 'text-primary',
            iconBg: 'bg-primary/20'
        }
    }

    const config = colorConfig[color]

    const getIcon = () => {
        switch (icon) {
            case 'calendar':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            case 'check':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            case 'money':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            case 'x':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            case 'users':
                return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            default:
                return null
        }
    }

    // Determine if trend is positive based on trendInverse
    const isPositive = trendInverse ? (trend || 0) < 0 : (trend || 0) > 0

    return (
        <div className={`
            glass-card p-7 sm:p-9 rounded-[2rem] border-primary/10
            transition-all duration-500 hover:scale-[1.03] hover:border-primary/30
            hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group relative overflow-hidden
        `}>
            {/* Ambient Background Glow */}
            <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-primary`} />

            <div className="flex items-start justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center border border-white/5 shadow-inner scale-110 group-hover:scale-125 transition-transform duration-500`}>
                    <svg className={`w-7 h-7 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {getIcon()}
                    </svg>
                </div>

                {trend !== undefined && (
                    <div className={`
                        flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl border appearance-none backdrop-blur-md
                        ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}
                    `}>
                        <span className="material-icons-round text-xs">
                            {isPositive ? 'trending_up' : 'trending_down'}
                        </span>
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-white/40 text-[10px] sm:text-xs mb-3 font-black uppercase tracking-[0.3em] font-display leading-tight">
                    {titulo}
                </p>
                <p className={`text-4xl sm:text-5xl font-black font-display uppercase tracking-tight leading-none drop-shadow-2xl ${color === 'amber' ? 'text-gradient-gold' : 'text-white'}`}>
                    {valor}
                </p>
            </div>

            {/* Interactive Bottom Accent */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-brand opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>
    )
}
