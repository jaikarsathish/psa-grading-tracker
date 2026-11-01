export const STATUSES = [
  'prepping',
  'shipped',
  'received',
  'research',
  'grading',
  'assembly',
  'shipped-back',
  'returned',
] as const
export type PsaStatus = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<string, string> = {
  prepping: 'Prepping',
  shipped: 'Shipped',
  received: 'Received',
  research: 'Research & ID',
  grading: 'Grading',
  assembly: 'Assembly',
  'shipped-back': 'Shipped Back',
  returned: 'Returned',
}

export const SERVICE_LEVELS = [
  'Value Bulk',
  'Value TCG Bulk',
  'Regular',
  'Express',
  'Super Express',
  'Walk-Through',
]
