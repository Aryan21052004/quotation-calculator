interface SwitchProps {
  checked: boolean
  onChange: (on: boolean) => void
  /** Accessible name, since the visible label sits outside the control. */
  ariaLabel: string
  disabled?: boolean
}

/** Small pill toggle used for the on/off options that affect the printed quote. */
function Switch({ checked, onChange, ariaLabel, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default Switch
