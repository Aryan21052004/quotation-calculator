import type { ReactNode } from 'react'
import { SectionCard, Switch } from '../ui'

interface QuoteOptionsCardProps {
  /** When on (and a rate exists), every price is shown in both USD and INR. */
  dualCurrency: boolean
  onDualCurrencyChange: (on: boolean) => void
  /** Dual currency needs an exchange rate, so it stays off until one loads. */
  exchangeRateReady: boolean
  /** When on, the payment term reads "Net 15 days" instead of "In advance". */
  net15Payment: boolean
  onNet15PaymentChange: (on: boolean) => void
  /** When on, the cost term reads "DAP MOW" instead of "Ex-Delhi (India)". */
  dapMowCost: boolean
  onDapMowCostChange: (on: boolean) => void
}

/**
 * Every on/off choice that changes the printed quotation, gathered in one
 * card so the settings that alter the customer-facing document are read
 * together rather than hunted for across the worksheet.
 */
function QuoteOptionsCard({
  dualCurrency,
  onDualCurrencyChange,
  exchangeRateReady,
  net15Payment,
  onNet15PaymentChange,
  dapMowCost,
  onDapMowCostChange,
}: QuoteOptionsCardProps) {
  return (
    <SectionCard title="Quote Options" subtitle="Settings that only change the printed quotation.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <OptionTile
          label="Payment terms"
          value={net15Payment ? 'Net 15 days' : 'In advance'}
          note="Prints as term 1"
          checked={net15Payment}
          onChange={onNet15PaymentChange}
          ariaLabel="Net 15 days payment terms"
        />
        <OptionTile
          label="Cost terms"
          value={dapMowCost ? 'DAP MOW' : 'Ex-Delhi (India)'}
          note="Prints as term 2"
          checked={dapMowCost}
          onChange={onDapMowCostChange}
          ariaLabel="DAP MOW cost terms"
        />
        <OptionTile
          label="Both currencies"
          value={dualCurrency ? 'USD and INR' : 'Selected currency only'}
          note={exchangeRateReady ? 'Adds a second line per price' : 'Waiting for an exchange rate'}
          checked={dualCurrency}
          onChange={onDualCurrencyChange}
          ariaLabel="Both currencies on quote"
          disabled={!exchangeRateReady}
        />
      </div>
    </SectionCard>
  )
}

interface OptionTileProps {
  label: string
  /** What this option prints right now, so the card reads without the preview. */
  value: ReactNode
  note: string
  checked: boolean
  onChange: (on: boolean) => void
  ariaLabel: string
  disabled?: boolean
}

function OptionTile({
  label,
  value,
  note,
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: OptionTileProps) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={disabled ? 'Waiting for an exchange rate' : undefined}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        <p
          className={`mt-1 truncate text-sm font-semibold ${
            disabled ? 'text-slate-400' : 'text-primary'
          }`}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={ariaLabel} disabled={disabled} />
    </label>
  )
}

export default QuoteOptionsCard
