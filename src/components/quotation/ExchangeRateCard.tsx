import type { ExchangeRate } from '../../hooks/useExchangeRate'
import { RATE_MARKUP_INR, type DisplayCurrency } from '../../utils/exchangeRate'
import { Badge, Button, SectionCard } from '../ui'

const CURRENCY_OPTIONS: DisplayCurrency[] = ['USD', 'INR']

interface ExchangeRateCardProps {
  rate: ExchangeRate
  currency: DisplayCurrency
  onCurrencyChange: (currency: DisplayCurrency) => void
  /** When on, the printed quote shows every price in both USD and INR. */
  dualCurrency: boolean
  onDualCurrencyChange: (on: boolean) => void
}

function formatRate(value: number): string {
  return `₹${value.toFixed(2)} / USD`
}

function formatLastUpdated(date: Date): string {
  const day = date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} • ${time}`
}

/** Live USD → INR rate, the applied (+₹1) rate, and the display currency toggle. */
function ExchangeRateCard({
  rate,
  currency,
  onCurrencyChange,
  dualCurrency,
  onDualCurrencyChange,
}: ExchangeRateCardProps) {
  const {
    liveRate,
    appliedRate,
    lastUpdated,
    ratePublishedAt,
    refreshing,
    usingCachedRate,
    errorMessage,
  } = rate

  return (
    <SectionCard
      title="Exchange Rate"
      subtitle="Live USD → INR rate; conversions always use the applied rate."
      action={
        <div>
          <span className="block text-right text-[13px] font-medium text-slate-600">
            Display currency
          </span>
          <div
            role="group"
            aria-label="Display currency"
            className="mt-1.5 inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
          >
            {CURRENCY_OPTIONS.map((option) => {
              const disabled = option === 'INR' && appliedRate === null
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onCurrencyChange(option)}
                  aria-pressed={currency === option}
                  disabled={disabled}
                  title={disabled ? 'Waiting for an exchange rate' : undefined}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    currency === option
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
          <label
            className={`mt-2.5 flex items-center justify-end gap-2 text-[13px] font-medium ${
              appliedRate === null
                ? 'cursor-not-allowed text-slate-400'
                : 'cursor-pointer text-slate-600'
            }`}
            title={appliedRate === null ? 'Waiting for an exchange rate' : undefined}
          >
            Both currencies on quote
            <button
              type="button"
              role="switch"
              aria-checked={dualCurrency}
              disabled={appliedRate === null}
              onClick={() => onDualCurrencyChange(!dualCurrency)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                dualCurrency ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  dualCurrency ? 'translate-x-[18px]' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RateTile label="Live rate" value={liveRate === null ? '—' : formatRate(liveRate)} />
        <RateTile
          label="Applied rate"
          value={appliedRate === null ? '—' : formatRate(appliedRate)}
          note={`Live rate + ₹${RATE_MARKUP_INR.toFixed(2)}`}
          emphasis
        />
        <RateTile
          label="Last updated"
          value={lastUpdated === null ? '—' : formatLastUpdated(lastUpdated)}
          note={
            ratePublishedAt === null
              ? undefined
              : `Rate published ${formatLastUpdated(ratePublishedAt)}`
          }
        />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
          <div className="min-w-0">
            {usingCachedRate && <Badge tone="amber">Using cached exchange rate.</Badge>}
            {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
            {!usingCachedRate && !errorMessage && (
              <Badge tone="emerald">{refreshing ? 'Updating…' : 'Live'}</Badge>
            )}
          </div>
          <Button size="sm" onClick={rate.refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}

interface RateTileProps {
  label: string
  value: string
  note?: string
  emphasis?: boolean
}

function RateTile({ label, value, note, emphasis = false }: RateTileProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasis ? 'border-sky-100 bg-sky-50' : 'border-slate-200/70 bg-slate-50/80'
      }`}
    >
      <p
        className={`text-xs font-medium tracking-wide uppercase ${
          emphasis ? 'text-sky-700' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${
          emphasis ? 'text-sky-900' : 'text-primary'
        }`}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>}
    </div>
  )
}

export default ExchangeRateCard
