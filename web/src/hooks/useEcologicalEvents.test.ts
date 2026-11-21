import { describe, expect, it } from 'vitest'
import { buildChronicle, momentEntry } from './useEcologicalEvents'
import type { MomentInfo } from '../types'

const moment = (over: Partial<MomentInfo>): MomentInfo => ({
  generation: 100,
  kind: 'extinction',
  species: 'Xiphophorus hellerii',
  relatedSpecies: '',
  biologicalType: 1,
  gridX: 3,
  gridY: 5,
  individualId: 0,
  before: 2,
  after: 0,
  cause: 'oldAge',
  importance: 0.8,
  ...over
})

describe('chronicle of moments', () => {
  it('says the measured cause and place, and nothing when no cause was measured', () => {
    expect(momentEntry(moment({}), 0).message).toBe(
      "« Xiphophorus hellerii » s'est éteinte (case 3, 5), 2 individu(s) au tick précédent. Derniers morts : la vieillesse."
    )
    const unknown = momentEntry(moment({ kind: 'collapse', cause: '', before: 80, after: 30, importance: 0.5 }), 1)
    expect(unknown.type).toBe('decline')
    expect(unknown.message).not.toMatch(/surtout/)
  })

  it('names the lost group and the last survivor', () => {
    expect(momentEntry(moment({ kind: 'group_extinct', importance: 1 }), 0).message).toMatch(/^Plus aucun poisson/)
    const last = momentEntry(moment({ kind: 'last_survivor', before: 4, after: 1, cause: 'eaten', individualId: 42 }), 0)
    expect(last.message).toContain('ils étaient 4, il est seul')
    expect(last.message).toContain('les prédateurs')
  })

  it('tells each speciation and extinction once, keeping those of saves made before moments', () => {
    const speciation = { parentSpecies: 'Serinus canaria', newSpecies: 'Serinus 1', generation: 50, geneticDistanceAtSplit: 0.12 }
    const oldSpeciation = { ...speciation, newSpecies: 'Serinus 0', generation: 10 }
    const extinction = { species: 'Xiphophorus hellerii', generation: 100, lastPopulation: 2 }
    const neverLived = { species: 'Solenopsis invicta', generation: 1, lastPopulation: 0 }
    const moments = [
      moment({ kind: 'new_species', species: 'Serinus 1', relatedSpecies: 'Serinus canaria', generation: 50, after: 12, importance: 0.65 }),
      moment({})
    ]
    const chronicle = buildChronicle([oldSpeciation, speciation], [extinction, neverLived], [], moments)
    expect(chronicle.filter((e) => e.type === 'speciation')).toHaveLength(2)
    expect(chronicle.filter((e) => e.type === 'extinction')).toHaveLength(1)
    expect(chronicle.find((e) => e.message.includes('Serinus 1'))?.message).toContain('distance génétique 0.120')

    // Une partie d'avant les moments garde toute son histoire.
    expect(buildChronicle([speciation], [extinction, neverLived], [], [])).toHaveLength(3)
  })
})
