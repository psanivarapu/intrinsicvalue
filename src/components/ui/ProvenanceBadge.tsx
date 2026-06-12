import type { FieldSource } from '../../types'

interface Props {
  source: FieldSource
  asOf?: string
  screenerHref?: string
}

const LABELS: Record<FieldSource, string> = {
  fetched: 'Y',
  edited:  '✓',
  manual:  '?',
  sample:  'S',
}

const STYLES: Record<FieldSource, string> = {
  fetched: 'bg-blue-100 text-blue-700 border-blue-200',
  edited:  'bg-green-100 text-green-700 border-green-200',
  manual:  'bg-amber-100 text-amber-700 border-amber-200',
  sample:  'bg-purple-100 text-purple-700 border-purple-200',
}

const TITLE: Record<FieldSource, string> = {
  fetched: 'Fetched from Yahoo Finance',
  edited:  'Edited by you',
  manual:  'Enter manually',
  sample:  'Sample data',
}

export function ProvenanceBadge({ source, asOf, screenerHref }: Props) {
  const title = asOf ? `${TITLE[source]} (${asOf})${screenerHref ? ' — verify on screener.in' : ''}` : TITLE[source]
  return (
    <a
      href={screenerHref || undefined}
      target={screenerHref ? '_blank' : undefined}
      rel="noopener noreferrer"
      title={title}
      className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded border cursor-help flex-shrink-0 ${STYLES[source]} ${screenerHref ? 'hover:opacity-80' : ''}`}
      onClick={e => { if (!screenerHref) e.preventDefault() }}
    >
      {LABELS[source]}
    </a>
  )
}
