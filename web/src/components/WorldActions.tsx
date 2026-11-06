import { useEffect, useState } from 'react'
import { apiService } from '@services/ApiService'
import { useSimulation } from '@services/SimulationContext'

interface WorldActionsProps {
  gridX: number
  gridY: number
}

/** Groupes qu'on peut introduire, avec le numéro de groupe du moteur. */
const GROUPS: { label: string; group: number }[] = [
  { label: 'Canaris', group: 0 },
  { label: 'Poissons', group: 1 },
  { label: 'Grillons', group: 2 },
  { label: 'Escargots', group: 3 }
]

/**
 * Agir sur le monde depuis la case choisie. Le moteur dit ce qui s'est vraiment passé, et
 * chaque action réussie reste dans la chronique. La météorite demande un second clic.
 */
export function WorldActions({ gridX, gridY }: WorldActionsProps) {
  const { currentSimulationId } = useSimulation()
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null)
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  // Une autre case : la confirmation et le dernier résultat ne la concernent pas.
  useEffect(() => {
    setArmed(false)
    setOutcome(null)
  }, [gridX, gridY])

  if (!currentSimulationId) return null

  const act = async (kind: string, value = 0, group = 0) => {
    setBusy(true)
    try {
      const response = await apiService.intervene(currentSimulationId, { kind, gridX, gridY, value, group })
      setOutcome({ ok: response.success, text: response.outcome || response.error || '' })
    } catch (e) {
      setOutcome({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
      setArmed(false)
    }
  }

  const button = 'game-button py-1 text-xs disabled:opacity-50'
  return (
    <div className="border-t border-slate-600 p-2 space-y-1">
      <div className="text-slate-400 font-semibold">Agir sur le monde</div>
      <div className="grid grid-cols-3 gap-1">
        <button className={button} disabled={busy} onClick={() => act('storm')} title="Fait naître un orage sur cette case">Orage</button>
        <button className={button} disabled={busy} onClick={() => act('fire')} title="Met le feu, s'il y a de quoi brûler">Feu</button>
        <button
          className={`${button} ${armed ? 'text-red-300 game-button-active' : ''}`}
          disabled={busy}
          onClick={() => (armed ? act('meteor', 1.5) : setArmed(true))}
          title="Météorite : tue autour de l'impact, brûle et refroidit le climat un temps"
        >
          {armed ? 'Confirmer' : 'Météorite'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button className={button} disabled={busy} onClick={() => act('climate', -3)} title="Pousse tout le climat de 3 °C vers le froid">Refroidir le monde</button>
        <button className={button} disabled={busy} onClick={() => act('climate', 3)} title="Pousse tout le climat de 3 °C vers le chaud">Réchauffer le monde</button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {GROUPS.map((g) => (
          <button key={g.group} className={button} disabled={busy} onClick={() => act('introduce', 20, g.group)} title={`Introduit 20 ${g.label.toLowerCase()} sur cette case, s'ils peuvent y vivre`}>
            + {g.label}
          </button>
        ))}
      </div>
      {outcome && <p className={outcome.ok ? 'text-slate-300' : 'text-amber-300'}>{outcome.text}</p>}
    </div>
  )
}
