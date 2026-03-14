import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHermosilloMins(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Hermosillo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(date);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
}

export function getHermosilloDateStr(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Hermosillo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

export function formatToHermosilloISO(d: Date): string {
    const dateStr = getHermosilloDateStr(d)
    const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Hermosillo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(d)
    return `${dateStr}T${timeStr}-07:00`
}
