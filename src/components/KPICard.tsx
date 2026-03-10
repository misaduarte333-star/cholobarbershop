'use client'

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
    Calendar,
    CheckCircle2,
    DollarSign,
    XCircle,
    Users,
    TrendingUp,
    TrendingDown
} from "lucide-react"

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
            icon: 'text-purple-400',
            iconBg: 'bg-purple-500/20'
        },
        green: {
            icon: 'text-emerald-400',
            iconBg: 'bg-emerald-500/20'
        },
        blue: {
            icon: 'text-blue-400',
            iconBg: 'bg-blue-500/20'
        },
        red: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/20'
        },
        amber: {
            icon: 'text-primary',
            iconBg: 'bg-primary/20'
        }
    }

    const config = colorConfig[color]

    const IconComponent = {
        calendar: Calendar,
        check: CheckCircle2,
        money: DollarSign,
        x: XCircle,
        users: Users
    }[icon]

    const isPositive = trendInverse ? (trend || 0) < 0 : (trend || 0) > 0

    return (
        <Card className={cn(
            "glass-card p-3 md:p-4 border-primary/10",
            "transition-all duration-500 hover:scale-[1.03] hover:border-primary/30",
            "hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group relative overflow-hidden"
        )}>
            {/* Ambient Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-16 h-16 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-primary" />

            <div className="flex items-start justify-between mb-3">
                <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border border-white/5 shadow-inner scale-100 group-hover:scale-110 transition-transform duration-500",
                    config.iconBg
                )}>
                    {IconComponent && <IconComponent className={cn("w-4 h-4", config.icon)} />}
                </div>

                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl border appearance-none backdrop-blur-md",
                        isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    )}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-white/40 text-[7px] md:text-[9px] mb-0.5 font-black uppercase tracking-[0.2em] font-display leading-tight">
                    {titulo}
                </p>
                <div className={cn(
                    "text-lg md:text-2xl font-black font-display uppercase tracking-tight leading-none drop-shadow-2xl truncate",
                    color === 'amber' ? 'text-gradient-gold' : 'text-white'
                )}>
                    {valor}
                </div>
            </div>

            {/* Interactive Bottom Accent */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-brand opacity-0 group-hover:opacity-40 transition-opacity" />
        </Card>
    )
}

