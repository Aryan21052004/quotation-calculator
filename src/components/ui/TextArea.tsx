import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

/** Shared multi-line input, styled to match TextInput. */
function TextArea({ invalid = false, rows = 3, className = '', ...rest }: TextAreaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`block w-full resize-y rounded-xl border bg-white px-3 py-2 text-sm text-primary transition-colors placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
        invalid
          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
          : 'border-slate-300 focus:border-accent focus:ring-accent/30'
      } ${className}`}
      {...rest}
    />
  )
}

export default TextArea
