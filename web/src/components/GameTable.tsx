import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface GameColumn<T> {
  key: string
  label: string
  /** Explication affichée au survol de l'en-tête. */
  title?: string
  align?: 'left' | 'right'
  width?: string
  /** Valeur de tri. */
  value: (row: T) => number | string
  render?: (row: T) => ReactNode
}

interface GameTableProps<T> {
  columns: GameColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  defaultSort?: { key: string; descending: boolean }
  emptyMessage?: string
}

/** Tableau dense façon RimWorld : une ligne par sujet, tri en cliquant sur une colonne. */
export function GameTable<T>({ columns, rows, rowKey, onRowClick, defaultSort, emptyMessage }: GameTableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? { key: columns[0].key, descending: false })

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows
    const direction = sort.descending ? -1 : 1
    return [...rows].sort((a, b) => {
      const va = column.value(a)
      const vb = column.value(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * direction
      return String(va).localeCompare(String(vb), 'fr') * direction
    })
  }, [rows, columns, sort])

  if (rows.length === 0) return <p className="text-xs text-slate-400 p-2">{emptyMessage ?? 'Rien à afficher.'}</p>

  return (
    <table className="w-full text-xs border-collapse">
      <thead className="sticky top-0 bg-slate-800 z-10">
        <tr>
          {columns.map((column) => {
            const active = column.key === sort.key
            return (
              <th
                key={column.key}
                scope="col"
                title={column.title}
                aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : 'none'}
                style={{ width: column.width }}
                className={`px-2 py-1 font-semibold border-b border-slate-600 whitespace-nowrap ${column.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                <button
                  className="inline-flex items-center gap-0.5 hover:text-primary-300"
                  onClick={() => setSort({ key: column.key, descending: active ? !sort.descending : true })}
                >
                  {column.label}
                  {active && (sort.descending ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`border-b border-slate-700 odd:bg-slate-950/25 ${onRowClick ? 'cursor-pointer hover:bg-primary-900/50' : ''}`}
          >
            {columns.map((column) => (
              <td key={column.key} className={`px-2 py-1 whitespace-nowrap ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                {column.render ? column.render(row) : column.value(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
