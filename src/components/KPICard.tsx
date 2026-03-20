import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface KPICardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    subtitle?: string
    color?: "primary" | "purple" | "green" | "blue" | "red" | "amber"
}

export function KPICard({ title, value, icon: Icon, trend, subtitle, color = "primary" }: KPICardProps) {
    const colorClass = color === "primary" ? "text-[#D4AF37]" : 
                      color === "amber" ? "text-amber-500" :
                      `text-${color}-400`
    
    const bgClass = color === "primary" ? "bg-[#D4AF37]/10" : 
                   color === "amber" ? "bg-amber-500/10" :
                   `bg-${color}-500/10`
    
    const borderClass = color === "primary" ? "border-[#D4AF37]/20" : 
                       color === "amber" ? "border-amber-500/20" :
                       `border-${color}-500/20`

    return (
        <Card className="bg-[#141414]/80 backdrop-blur-xl border-white/5 overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300 relative">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-black text-white tracking-tighter">
                                {value}
                            </h3>
                            {trend && (
                                <span className={`text-[10px] font-bold ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trend.isPositive ? '↑' : '↓'}{Math.abs(trend.value)}%
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-[10px] text-white/30 font-medium">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center border ${borderClass} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                
                {/* Subtle progress line or accent */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
        </Card>
    )
}
