import type { SelectHTMLAttributes } from 'react'

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: string[]
  /** Label shown for the empty-string option. */
  emptyLabel?: string
}

/** Shared select styled to match TextInput. */
function SelectInput({ options, emptyLabel = '—', className = '', ...rest }: SelectInputProps) {
  return (
    <select
      className={`block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-primary transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none ${className}`}
      {...rest}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === '' ? emptyLabel : option}
        </option>
      ))}
    </select>
  )
}

export default SelectInput
