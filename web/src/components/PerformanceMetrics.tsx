import { useEffect, useState } from 'react'
import { useSimulation } from '@services/SimulationContext'
import { apiService } from '@services/ApiService'
import { HealthCheckResponse } from '../types'

/**
 * Panneau d'état du moteur. L'ancien "PerformanceMetrics" affichait des
 * métriques (FPS, CPU, mémoire) et des mentions "SIMD ✓ Enabled" / "OpenMP
 * ✓ Active" qui n'ont jamais correspondu à quoi que ce soit de réel — le
 * backend ne rapporte aucune télémétrie de ce type, et l'audit du moteur
 * C++ a confirmé que ces optimisations ne sont pas branchées dans le
 * binaire qui tourne réellement (voir CONTRIBUTING.md). Ce composant
 * n'affiche donc que des informations vérifiables : la santé des services
 * backend et la progression réelle de la simulation en cours.
 */
export function EngineStatus() {
  const { simulationData, isConnected, currentSimulationId } = useSimulation()
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchHealth = async () => {
      try {
        const result = await apiService.healthCheck()
        if (!cancelled) {
          setHealth(result)
          setHealthError(null)
        }
      } catch (error) {
        if (!cancelled) setHealthError(error instanceof Error ? error.message : String(error))
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const StatusRow = ({ label, ok, okLabel, koLabel }: { label: string; ok: boolean; okLabel: string; koLabel: string }) => (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={ok ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {ok ? `✓ ${okLabel}` : `✗ ${koLabel}`}
      </span>
    </div>
  )

  return (
    <div className="card">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">État du Moteur</h3>
        <p className="text-sm text-gray-600">Santé réelle des services backend</p>
      </div>

      <div className="space-y-3">
        {healthError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
            {healthError}
          </div>
        )}

        {health && (
          <>
            <StatusRow label="API Backend" ok={health.status === 'healthy'} okLabel="En ligne" koLabel="Hors ligne" />
            <StatusRow
              label="Moteur C++ (serina_cli)"
              ok={health.services.simulationEngine}
              okLabel="Construit et disponible"
              koLabel="Non construit — voir README"
            />
            <StatusRow
              label="Base de données"
              ok={health.services.database}
              okLabel="Connectée (historique actif)"
              koLabel="Indisponible (pas d'historique)"
            />
            <StatusRow label="WebSocket" ok={health.services.websocket && isConnected} okLabel="Actif" koLabel="Inactif" />
          </>
        )}
      </div>

      {/* Progression réelle de la simulation en cours */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Simulation en cours</h4>
        {currentSimulationId && simulationData ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Génération</span>
              <span className="font-medium">{simulationData.status.ecosystem.generation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stabilité écosystème</span>
              <span className="font-medium">{(simulationData.status.ecosystem.ecosystem_stability * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Spéciations</span>
              <span className="font-medium">{simulationData.status.ecosystem.total_speciations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Extinctions</span>
              <span className="font-medium">{simulationData.status.ecosystem.total_extinctions}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucune simulation active</p>
        )}
      </div>
    </div>
  )
}
