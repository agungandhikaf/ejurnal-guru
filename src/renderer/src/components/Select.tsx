import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectValue = string | number

export interface SelectOption {
  value: SelectValue
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: SelectValue
  options: SelectOption[]
  onChange: (value: SelectValue) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface Position {
  left: number
  top: number
  width: number
  openUpward: boolean
}

const MAX_MENU_HEIGHT = 280
const VIEWPORT_MARGIN = 12

export default function Select({
  value,
  options,
  onChange,
  placeholder = 'Pilih data',
  disabled = false,
  className = ''
}: SelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, width: 0, openUpward: false })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const selected = options.find((option) => option.value === value)

  const updatePosition = (): void => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setOpen(false)
      return
    }

    const longestLabel = options.reduce((length, option) => Math.max(length, option.label.length), placeholder.length)
    const contentWidth = longestLabel * 8.5 + 58
    const menuWidth = Math.min(
      window.innerWidth - VIEWPORT_MARGIN * 2,
      Math.max(rect.width, contentWidth)
    )
    const estimatedHeight = Math.min(options.length * 42 + 16, MAX_MENU_HEIGHT)
    const roomBelow = window.innerHeight - rect.bottom
    const openUpward = roomBelow < estimatedHeight + 16 && rect.top > roomBelow
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - menuWidth - VIEWPORT_MARGIN
    )

    setPosition({
      left,
      top: openUpward ? rect.top - 8 : rect.bottom + 8,
      width: menuWidth,
      openUpward
    })
  }

  const schedulePositionUpdate = (): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      updatePosition()
    })
  }

  useLayoutEffect(() => {
    if (open) updatePosition()
  }, [open, options.length])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (!target) return
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }

    const onScroll = (event: Event): void => {
      const target = event.target as Node | null
      // Trackpad/mouse scrolling inside the option list must not close it.
      if (target && panelRef.current?.contains(target)) return
      schedulePositionUpdate()
    }

    const onResize = (): void => schedulePositionUpdate()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }

    // Capture phase is intentional: a Modal stops bubbling mouse events.
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

  const choose = (option: SelectOption): void => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`field flex items-center justify-between gap-3 text-left ${open ? 'border-indigo-500 bg-white ring-2 ring-indigo-100' : ''} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          className="popover-enter fixed z-[1000] max-h-[280px] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15"
          style={{
            left: position.left,
            top: position.openUpward ? undefined : position.top,
            bottom: position.openUpward ? window.innerHeight - position.top : undefined,
            width: position.width
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-400">Belum ada pilihan</div>
          ) : options.map((option) => {
            const active = option.value === value
            return (
              <button
                key={`${typeof option.value}-${option.value}`}
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                onClick={() => choose(option)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                {active && <Check size={16} className="shrink-0" />}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
