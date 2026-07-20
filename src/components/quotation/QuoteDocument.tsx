import { excelCoerceNumber } from '../../utils/quotationFormulas'
import { isError, type CostRollupResults } from '../../utils/costRollupFormulas'
import {
  calculateSellingPrice,
  type ProfitRate,
  type ProfitTotals,
} from '../../utils/profitFormulas'
import type { WorksheetRow } from './types'

interface QuoteDocumentProps {
  quoteName: string
  items: { row: WorksheetRow; rollup: CostRollupResults }[]
  profitRate: ProfitRate
  totals: ProfitTotals
}

/**
 * Customer-facing quotation, rendered only when printing (the "Download
 * PDF" button opens the browser's print dialog). Shows final prices only -
 * no costs, freight internals, or profit margin ever appear here.
 */
function QuoteDocument({ quoteName, items, profitRate, totals }: QuoteDocumentProps) {
  // Only lines a customer should see: anything identified or priced.
  const visibleItems = items.filter(
    ({ row, rollup }) => row.partNumber.trim() !== '' || !isError(rollup.unitCost),
  )

  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white p-2 text-primary">
      <header className="flex items-start justify-between border-b-2 border-primary pb-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white"
          >
            A
          </span>
          <div>
            <p className="text-xl font-bold tracking-tight">Aerostratus</p>
            <p className="text-xs text-slate-500">Aviation parts &amp; services</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight uppercase">Quotation</p>
          <p className="mt-1 text-sm text-slate-500">{quoteName.trim() || 'Untitled quotation'}</p>
          <p className="text-sm text-slate-500">{issuedOn}</p>
        </div>
      </header>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs tracking-wide text-slate-500 uppercase">
            <th className="py-2 pr-3 font-semibold">#</th>
            <th className="py-2 pr-3 font-semibold">Part number</th>
            <th className="py-2 pr-3 font-semibold">Condition</th>
            <th className="py-2 pr-3 text-right font-semibold">Qty</th>
            <th className="py-2 pr-3 font-semibold">Lead time</th>
            <th className="py-2 pr-3 text-right font-semibold">Unit price (USD)</th>
            <th className="py-2 text-right font-semibold">Amount (USD)</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map(({ row, rollup }, index) => {
            const price = calculateSellingPrice(rollup.unitCost, profitRate)
            const moq = excelCoerceNumber(row.moq)
            const priced = !isError(price) && typeof moq === 'number' && moq > 0
            return (
              <tr key={row.id} className="border-b border-slate-200">
                <td className="py-2.5 pr-3 text-slate-400">{index + 1}</td>
                <td className="py-2.5 pr-3 font-medium">{row.partNumber || '—'}</td>
                <td className="py-2.5 pr-3">{row.condition || '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {row.moq !== '' ? row.moq : '—'}
                </td>
                <td className="py-2.5 pr-3">{row.leadTime !== '' ? row.leadTime : '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {isError(price) ? '—' : `$${price.toFixed(2)}`}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {priced ? `$${(price * moq).toFixed(2)}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} />
            <td className="py-3 pr-3 text-right text-sm font-bold uppercase">Total</td>
            <td className="py-3 text-right text-base font-bold tabular-nums">
              ${totals.grandTotal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default QuoteDocument
