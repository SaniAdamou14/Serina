import { useEffect, useRef, useState } from 'react'

const SHOW_DELAY_MS = 200
const MARGIN_PX = 14

/**
 * Infobulle du jeu, à la place de celle du navigateur. Elle s'applique à tout élément
 * portant `title` ou `data-tip` : il suffit de renseigner l'un des deux, partout.
 */
export function GameTooltip() {
  const [tip, setTip] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const timer = useRef<number>()

  useEffect(() => {
    const place = () => {
      const el = box.current
      if (!el) return
      const { x, y } = pointer.current
      const flipX = x + MARGIN_PX + el.offsetWidth > window.innerWidth
      const flipY = y + MARGIN_PX + el.offsetHeight > window.innerHeight
      el.style.left = `${flipX ? x - MARGIN_PX - el.offsetWidth : x + MARGIN_PX}px`
      el.style.top = `${flipY ? y - MARGIN_PX - el.offsetHeight : y + MARGIN_PX}px`
    }

    const hide = () => {
      window.clearTimeout(timer.current)
      setTip(null)
    }

    const onOver = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return
      const el = e.target.closest('[title], [data-tip]')
      window.clearTimeout(timer.current)
      if (!el) {
        setTip(null)
        return
      }
      // Retiré de `title`, sinon le navigateur afficherait aussi la sienne. React le
      // repose si le texte change : il est alors repris ici au survol suivant.
      const title = el.getAttribute('title')
      if (title !== null) {
        el.setAttribute('data-tip', title)
        el.removeAttribute('title')
      }
      const text = el.getAttribute('data-tip')
      if (!text) {
        setTip(null)
        return
      }
      timer.current = window.setTimeout(() => setTip(text), SHOW_DELAY_MS)
    }

    const onMove = (e: MouseEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      place()
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', hide)
    window.addEventListener('blur', hide)
    return () => {
      window.clearTimeout(timer.current)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', hide)
      window.removeEventListener('blur', hide)
    }
  }, [])

  useEffect(() => {
    const el = box.current
    if (!tip || !el) return
    const { x, y } = pointer.current
    el.style.left = `${Math.min(x + MARGIN_PX, window.innerWidth - el.offsetWidth - 4)}px`
    el.style.top = `${Math.min(y + MARGIN_PX, window.innerHeight - el.offsetHeight - 4)}px`
  }, [tip])

  if (!tip) return null
  return (
    <div
      ref={box}
      role="tooltip"
      className="game-panel fixed z-[100] max-w-xs px-2 py-1 text-xs whitespace-pre-line pointer-events-none"
    >
      {tip}
    </div>
  )
}
