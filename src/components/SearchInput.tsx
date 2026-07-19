interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

function SearchInput({ value, onChange, placeholder, ariaLabel }: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-primary placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:outline-none"
    />
  )
}

export default SearchInput
