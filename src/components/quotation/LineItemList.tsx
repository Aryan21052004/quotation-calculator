import { memo, useState } from 'react'
import {
  formatTwoDecimals,
  isError,
  type CostRollupResults,
} from '../../utils/costRollupFormulas'
import { calculateSellingPrice, type ProfitRate } from '../../utils/profitFormulas'
import SearchInput from '../SearchInput'
import { Badge, Button, SectionCard } from '../ui'
import type { WorksheetRow } from './types'

export interface LineItemEntry {
  row: WorksheetRow
  rollup: CostRollupResults
}

interface LineItemListProps {
  items: LineItemEntry[]
  profitRate: ProfitRate
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

/** Left panel: the quotation's line items as a filterable, selectable list. */
function LineItemList({
  items,
  profitRate,
  selectedId,
  onSelect,
  onRemove,
  onAdd,
}: LineItemListProps) {
  const [filter, setFilter] = useState('')
  const query = filter.trim().toLowerCase()
  const visible =
    query === ''
      ? items
      : items.filter(
          ({ row }) =>
            row.partNumber.toLowerCase().includes(query) || String(row.sn).includes(query),
        )

  return (
    <SectionCard
      title="Line Items"
      subtitle={`${items.length} item${items.length === 1 ? '' : 's'} in this quotation`}
      action={
        <Button size="sm" onClick={onAdd}>
          + Add item
        </Button>
      }
    >
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Filter by part number or #…"
        ariaLabel="Filter line items"
      />
      <ul aria-label="Line items" className="mt-3 max-h-[560px] space-y-1 overflow-y-auto pr-1">
        {visible.map(({ row, rollup }) => (
          <LineItemRow
            key={row.id}
            row={row}
            rollup={rollup}
            profitRate={profitRate}
            selected={row.id === selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
        {visible.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-slate-400">
            No items match your filter.
          </li>
        )}
      </ul>
    </SectionCard>
  )
}

interface LineItemRowProps {
  row: WorksheetRow
  /** The row's cost-rollup chain, from the parent's identity-stable cache. */
  rollup: CostRollupResults
  profitRate: ProfitRate
  selected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

/** Money display for the list: numbers get a $ prefix, errors show as a dash. */
function listPrice(result: ReturnType<typeof calculateSellingPrice>): string {
  return isError(result) ? '—' : `$${formatTwoDecimals(result)}`
}

// Memoized so typing in the editor re-renders only the edited item's row:
// row objects are immutable and the rollup comes from the parent's WeakMap
// cache, so untouched rows keep identical props.
const LineItemRow = memo(function LineItemRow({
  row,
  rollup,
  profitRate,
  selected,
  onSelect,
  onRemove,
}: LineItemRowProps) {
  const finalPrice = listPrice(calculateSellingPrice(rollup.unitCost, profitRate))
  const unitCost = isError(rollup.unitCost) ? '' : `cost $${formatTwoDecimals(rollup.unitCost)}`

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onSelect(row.id)}
        aria-current={selected || undefined}
        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none ${
          selected
            ? 'border-accent/40 bg-sky-50/80'
            : 'border-transparent hover:bg-slate-50'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="w-9 shrink-0 text-xs font-medium text-slate-400 tabular-nums">
            #{row.sn}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-medium ${
                row.partNumber ? 'text-primary' : 'text-slate-400 italic'
              }`}
            >
              {row.partNumber || 'Empty item'}
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              {row.condition !== '' && (
                <Badge tone={row.condition === 'NEW' ? 'emerald' : 'amber'}>{row.condition}</Badge>
              )}
              {row.moq !== '' && <span>MOQ {row.moq}</span>}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold text-primary tabular-nums">
              {finalPrice}
            </span>
            {unitCost !== '' && (
              <span className="block text-[11px] text-slate-400 tabular-nums">{unitCost}</span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        aria-label={`Remove item ${row.sn}`}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
      >
        ×
      </button>
    </li>
  )
})

export default LineItemList
