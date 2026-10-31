import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { ErrorBoundary } from './ErrorBoundary'

interface GameWindowProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Fenêtre posée sur la carte, façon RimWorld : déplaçable par sa barre de titre,
 * sans jamais masquer l'interface autour. Une erreur dans son contenu reste
 * contenue dans la fenêtre.
 */
export function GameWindow({ title, onClose, children }: GameWindowProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { pointerX: e.clientX, pointerY: e.clientY, x: offset.x, y: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setOffset({
      x: drag.current.x + e.clientX - drag.current.pointerX,
      y: drag.current.y + e.clientY - drag.current.pointerY
    })
  }

  return (
    <section
      className="game-panel absolute left-2 bottom-11 z-30 flex flex-col"
      style={{
        width: 'min(960px, calc(100vw - 16px))',
        height: 'min(640px, calc(100vh - 64px))',
        transform: `translate(${offset.x}px, ${offset.y}px)`
      }}
      aria-label={title}
    >
      <div
        className="flex items-center justify-between px-3 h-8 shrink-0 border-b border-slate-600 bg-slate-800 cursor-move select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null }}
      >
        <h2 className="text-sm font-bold">{title}</h2>
        <button
          className="game-button px-1.5 py-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Fermer (Échap)"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        <ErrorBoundary fallbackLabel={title}>{children}</ErrorBoundary>
      </div>
    </section>
  )
}
