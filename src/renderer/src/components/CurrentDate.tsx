import { CalendarDays } from 'lucide-react'

export default function CurrentDate({ variant = 'light' }: { variant?: 'light' | 'dark' | 'surface' }): JSX.Element {
  const currentDate = new Date()
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(currentDate)
  const shortDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentDate)
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentDate)

  const colorClass = variant === 'dark'
    ? 'border-white/10 bg-white/[0.07] text-slate-200'
    : variant === 'surface'
      ? 'border-slate-200 bg-slate-50 text-slate-600'
    : 'border-white/20 bg-white/15 text-white'

  if (variant === 'surface') {
    return (
      <div className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 ${colorClass}`}>
        <CalendarDays size={16} className="text-indigo-500" aria-hidden="true" />
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{weekday}</p>
          <time className="text-xs font-semibold" dateTime={currentDate.toISOString().slice(0, 10)}>{shortDate}</time>
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold backdrop-blur-sm ${colorClass}`}>
      <CalendarDays size={15} aria-hidden="true" />
      <time dateTime={currentDate.toISOString().slice(0, 10)}>{formattedDate}</time>
    </div>
  )
}
