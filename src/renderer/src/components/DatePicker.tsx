import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  className?: string
}

interface Position {
  left: number
  top: number
  openUpward: boolean
}

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const PANEL_WIDTH = 320
const PANEL_HEIGHT = 390
const VIEWPORT_MARGIN = 12

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDisplay(value: string): string {
  const date = parseIsoDate(value)
  return date
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : ''
}

function buildCalendar(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayIndex = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayIndex)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  clearable = false,
  disabled = false,
  className = ''
}: DatePickerProps): JSX.Element {
  const selected = useMemo(() => parseIsoDate(value), [value])
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => selected ?? new Date())
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, openUpward: false })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const days = useMemo(() => buildCalendar(visibleMonth), [visibleMonth])

  const updatePosition = (): void => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setOpen(false)
      return
    }

    const roomBelow = window.innerHeight - rect.bottom
    const openUpward = roomBelow < PANEL_HEIGHT + 16 && rect.top > roomBelow
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
    )
    setPosition({ left, top: openUpward ? rect.top - 8 : rect.bottom + 8, openUpward })
  }

  const schedulePositionUpdate = (): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      updatePosition()
    })
  }

  useLayoutEffect(() => {
    if (open) {
      setVisibleMonth(selected ?? new Date())
      updatePosition()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (!target) return
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }

    const onScroll = (event: Event): void => {
      const target = event.target as Node | null
      if (target && panelRef.current?.contains(target)) return
      schedulePositionUpdate()
    }

    const onResize = (): void => schedulePositionUpdate()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKeyDown)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [open])

  const selectDate = (date: Date): void => {
    onChange(toIsoDate(date))
    setOpen(false)
  }

  const changeMonth = (offset: number): void => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const today = new Date()
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(visibleMonth)

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={`field flex items-center gap-3 text-left ${open ? 'border-indigo-500 bg-white ring-2 ring-indigo-100' : ''}`}
        >
          <CalendarDays size={17} className={open ? 'text-indigo-600' : 'text-slate-400'} />
          <span className={`min-w-0 flex-1 truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
        {clearable && value && (
          <button
            type="button"
            aria-label="Hapus tanggal"
            onClick={(event) => { event.stopPropagation(); onChange('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pilih tanggal"
          className="popover-enter fixed z-[1000] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15"
          style={{
            left: position.left,
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined
          }}
        >
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold capitalize text-slate-800">{monthLabel}</p>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {dayNames.map((day) => <div key={day} className="py-1 text-center text-[11px] font-bold uppercase text-slate-400">{day}</div>)}
            {days.map((date) => {
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
              const isSelected = selected ? sameDay(date, selected) : false
              const isToday = sameDay(date, today)
              // When the field is empty, today becomes the visual focus only;
              // the value remains empty until the user clicks a date.
              const isFocusedToday = !selected && isToday
              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => selectDate(date)}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                    isSelected || isFocusedToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isCurrentMonth
                        ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                        : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {date.getDate()}
                  {isToday && selected && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500" />}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            {clearable ? (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Hapus</button>
            ) : <span />}
            <button type="button" onClick={() => selectDate(today)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">Hari ini</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
