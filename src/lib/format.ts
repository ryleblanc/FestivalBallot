const TORONTO_TIME_ZONE = 'America/Toronto'

export function dayKey(isoDate: string): string {
  return isoDate.slice(0, 10)
}

export function torontoToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function formatDayTab(isoDate: string): { weekday: string; day: string } {
  const date = new Date(`${dayKey(isoDate)}T12:00:00-04:00`)
  return {
    weekday: new Intl.DateTimeFormat('en-CA', {
      timeZone: TORONTO_TIME_ZONE,
      weekday: 'short',
    }).format(date),
    day: new Intl.DateTimeFormat('en-CA', {
      timeZone: TORONTO_TIME_ZONE,
      day: 'numeric',
    }).format(date),
  }
}

export function formatDayHeading(isoDate: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoDate))
}

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

export function runtimeMinutes(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60_000)
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}m`
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}