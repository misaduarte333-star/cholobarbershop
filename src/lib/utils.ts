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

/**
 * Extracts total minutes from a Hermosillo local timestamp string (YYYY-MM-DD HH:mm:ss)
 * bypassing browser timezone shifts.
 */
export function getMinsFromHermosilloString(dateStr: string): number {
    if (!dateStr) return 0;
    // Extract HH:mm from "YYYY-MM-DD HH:mm:ss"
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1];
    if (!timePart) return 0;
    const [h, m] = timePart.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
