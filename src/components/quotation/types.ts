import type { WorksheetRowSeed } from '../../types'

/** Editable fields map 1:1 to the persisted row-seed fields (minus S/N). */
export type EditableField = keyof Omit<WorksheetRowSeed, 'sn'>

/** One line item in UI state: the persisted seed plus a stable render id. */
export interface WorksheetRow extends WorksheetRowSeed {
  id: string
}
