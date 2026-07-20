import type { InputHTMLAttributes } from 'react'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  align?: 'left' | 'right'
}

/** Shared text input; numeric fields right-align, invalid fields ring rose. */
function TextInput({ invalid = false, align = 'left', className = '', ...rest }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`block w-full rounded-xl border bg-white px-3 py-2 text-sm text-primary transition-colors placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
        align === 'right' ? 'text-right tabular-nums' : ''
      } ${
        invalid
          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
          : 'border-slate-300 focus:border-accent focus:ring-accent/30'
      } ${className}`}
      {...rest}
    />
  )
}

export default TextInput
