import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
}

/** Label + control + validation message, stacked with consistent spacing. */
function FormField({ label, htmlFor, error, hint, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-600">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}

export default FormField
