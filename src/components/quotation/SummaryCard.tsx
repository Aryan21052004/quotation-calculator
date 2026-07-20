import type { PricingTotals, ProfitRate } from '../../utils/pricingFormulas'
import {
  convertForDisplay,
  currencySymbol,
  type CurrencyDisplay,
} from '../../utils/exchangeRate'
import { Badge, SectionCard } from '../ui'

interface SummaryCardProps {
  totals: PricingTotals
  profitRate: ProfitRate
  display: CurrencyDisplay
}

/** Bottom card: color-coded totals across all priced line items. */
function SummaryCard({ totals, profitRate, display }: SummaryCardProps) {
  // Totals stay in USD; conversion (applied rate) happens at display only.
  const money = (value: number) =>
    `${currencySymbol(display)}${(convertForDisplay(value, display) as number).toFixed(2)}`

  return (
    <SectionCard
      title="Summary"
      subtitle="Totals across all priced line items."
      action={<Badge tone="sky">{profitRate * 100}% profit margin</Badge>}
    >
      <div aria-live="polite" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Priced line items"
          value={String(totals.lineItemCount)}
          className="border-slate-200/70 bg-slate-50/80"
          valueClassName="text-primary"
        />
        <SummaryTile
          label="Total cost"
          value={money(totals.totalCost)}
          className="border-slate-200/70 bg-slate-50/80"
          valueClassName="text-primary"
        />
        <SummaryTile
          label="Total profit"
          value={money(totals.totalProfit)}
          className="border-emerald-100 bg-emerald-50"
          valueClassName="text-emerald-700"
        />
        <SummaryTile
          label="Grand total"
          value={money(totals.grandTotal)}
          className="border-primary bg-primary"
          labelClassName="text-sky-200"
          valueClassName="text-white"
        />
      </div>
    </SectionCard>
  )
}

interface SummaryTileProps {
  label: string
  value: string
  className: string
  labelClassName?: string
  valueClassName: string
}

function SummaryTile({
  label,
  value,
  className,
  labelClassName = 'text-slate-500',
  valueClassName,
}: SummaryTileProps) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <p className={`text-xs font-medium tracking-wide uppercase ${labelClassName}`}>{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  )
}

export default SummaryCard
