import type { ReactNode } from 'react'

interface SectionCardProps {
  title?: string
  subtitle?: string
  /** Optional element rendered on the right side of the header (badge, button…). */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** White card with a 16px radius, soft shadow, and an optional titled header. */
function SectionCard({ title, subtitle, action, children, className = '' }: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-soft ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            {title && <h2 className="text-base font-semibold tracking-tight text-primary">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${title || action ? 'pt-4' : 'pt-5 sm:pt-6'}`}>
        {children}
      </div>
    </section>
  )
}

export default SectionCard
