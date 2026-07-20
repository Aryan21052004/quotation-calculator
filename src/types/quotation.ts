/** How an editable worksheet cell's raw string value should be validated. */
export type CellValueKind = 'text' | 'integer' | 'decimal' | 'currency'

/**
 * One worksheet row as persisted: raw input text only, no ids and no
 * calculated values - those are re-derived by the formula engine on load.
 */
export interface WorksheetRowSeed {
  sn: number
  partNumber: string
  description: string
  moq: string
  condition: string
  unitPrice: string
  leadTime: string
  freight: string
  clearance: string
}

export interface CalculationSummary {
  id: string
  name: string
  updatedAt: string
}

export interface SavedCalculation {
  id: string
  name: string
  profitRate: number
  rows: WorksheetRowSeed[]
}
