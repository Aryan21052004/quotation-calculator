import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
}

function Card({ title, children }: CardProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 shadow-soft">
      {title && <h2 className="text-base font-semibold text-primary">{title}</h2>}
      <div className={title ? 'mt-4' : undefined}>{children}</div>
    </div>
  )
}

export default Card
