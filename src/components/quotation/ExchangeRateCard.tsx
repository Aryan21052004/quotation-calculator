import type { ExchangeRate } from '../../hooks/useExchangeRate'
import {
  DISPLAY_CURRENCIES,
  INR_QUOTED_CURRENCIES,
  RATE_MARKUP_INR,
  appliedRupeesPerUnit,
  rupeesPerUnit,
  type DisplayCurrency,
  type QuotedAgainstInr,
} from '../../utils/exchangeRate'
import { Badge, Button, SectionCard } from '../ui'

interface ExchangeRateCardProps {
  rate: ExchangeRate
  currency: DisplayCurrency
  onCurrencyChange: (currency: DisplayCurrency) => void
}

/** Rupee amounts: 2 decimals normally, 4 where one unit is worth about ₹1. */
function formatRupees(value: number, currency: DisplayCurrency): string {
  return `₹${value.toFixed(value < 10 ? 4 : 2)} / ${currency}`
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

/** Live and applied rupee rates per currency, plus the display-currency toggle. */
function ExchangeRateCard({ rate, currency, onCurrencyChange }: ExchangeRateCardProps) {
  const {
    liveRates,
    appliedRates,
    lastUpdated,
    ratePublishedAt,
    refreshing,
    usingCachedRate,
    errorMessage,
  } = rate

  return (
    <SectionCard
      title="Exchange Rate"
      subtitle="Live rates against the rupee; conversions always use the applied rate."
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
            {DISPLAY_CURRENCIES.map((option) => {
              const disabled = option !== 'USD' && appliedRates[option] === undefined
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onCurrencyChange(option)}
                  aria-pressed={currency === option}
                  disabled={disabled}
                  title={disabled ? 'Waiting for an exchange rate' : undefined}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
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
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INR_QUOTED_CURRENCIES.map((option) => (
          <RateTile
            key={option}
            currency={option}
            live={rupeesPerUnit(option, liveRates)}
            applied={appliedRupeesPerUnit(option, liveRates)}
            // Quoting in INR converts through the USD rate, so that tile
            // carries the highlight while rupees are shown.
            emphasis={option === currency || (currency === 'INR' && option === 'USD')}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Last updated</p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {lastUpdated === null ? '—' : formatLastUpdated(lastUpdated)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {ratePublishedAt === null
              ? 'Applied rate = live rate + this currency’s markup'
              : `Rate published ${formatLastUpdated(ratePublishedAt)}`}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
          <div className="min-w-0">
            {usingCachedRate && <Badge tone="amber">Using cached exchange rates.</Badge>}
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
  currency: QuotedAgainstInr
  live: number | null
  applied: number | null
  /** The currency the quote is currently shown in gets the accent treatment. */
  emphasis: boolean
}

function RateTile({ currency, live, applied, emphasis }: RateTileProps) {
  const markup = RATE_MARKUP_INR[currency]
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
        {currency}
      </p>
      <p
        className={`mt-1 text-lg font-bold tabular-nums ${emphasis ? 'text-sky-900' : 'text-primary'}`}
      >
        {applied === null ? '—' : formatRupees(applied, currency)}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {live === null
          ? 'Waiting for a rate'
          : `Live ${formatRupees(live, currency)} + ₹${markup.toFixed(2)}`}
      </p>
    </div>
  )
}

export default ExchangeRateCard
