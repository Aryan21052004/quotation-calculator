import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'sky' | 'emerald' | 'amber' | 'navy'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  navy: 'bg-primary text-white',
}

/** Small status pill used for conditions, live indicators, and counts. */
function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
