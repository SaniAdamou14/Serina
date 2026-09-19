# Unified engine design (Phase 7+)

Status: **in progress**. This document is the design for merging the
project's two previously-separate simulation models into one: individuals
with real diploid genomes, living on a real spatial grid, with speciation
that emerges from geography and measured genetic divergence instead of a
random draw. It exists so the (large, hard to reverse) architectural
decisions are written down once and built on consistently across sessions,
rather than re-derived or drifted from turn to turn.

## Why a merge, not a third engine

Two real, working subsystems already exist and neither is sufficient alone:

- **`Evolution::PopulationManager`** (`PopulationManager.hpp`, used by
  `SimulationAPI::enableAdvancedPopulation()`): individuals
  (`Evolution::Organism`) with a real diploid genome
  (`Genetics::AdvancedGenome`, 12 bounded traits, BLX-α crossover, Gaussian
  mutation), position, energy, age — and, critically, **genetic diversity
  computed from real pairwise genome distance**
  (`AdvancedGenome::geneticDistance()`), not a random draw. This already
  works and is already tested. What it lacks: species identity is a bare
  string with no taxonomy, there is no spatial structure beyond raw (x, y)
  floats (no regions/biomes), and there is exactly one undifferentiated
  population — no concept of multiple named species coexisting.
- **`Simulation::SerinaEcosystemSimulator`** (`SerinaSimulator.hpp`, backend
  of `serina_cli` and the web dashboard): named species with real taxonomy
  (`EcosystemTaxonomy`), real ecological interactions
  (`EcologicalInteractionManager`) and real biological constraints
  (`SerinaEvolutionaryConstraints`) — but no individuals and no space.
  Species are aggregate stat bundles (`SpeciesSimulationStats`); "genetic
  diversity" is `uniform(0.1, 1.0)` redrawn every generation
  (`SerinaSimulator.hpp:594`) specifically because there are no genomes to
  measure a distance between.

Neither gap can be closed by wiring in NEAT or tuning parameters — each
system is missing a structural piece the other one has. The plan is to
build one engine with individuals (from `PopulationManager`) living in
space, organized into named species (from `SerinaEcosystemSimulator`), with
`EcologicalInteractions` and `EvolutionaryConstraints` applied per
individual instead of per aggregate.

## Data model

```
Region                              (new)
  id: (gridX, gridY)
  environmentType: Ecosystem::EnvironmentType
  climate / resources / pressures   (from EnvironmentalAdaptation.hpp's
                                      EnvironmentDefinition, one instance
                                      per region, not one global constant)
  neighbors: Region*[]              (for migration and isolation tracking)

Organism                            (existing, Evolution::Organism — extended)
  genome: Genetics::AdvancedGenome  (existing, unchanged)
  x, y: double                      (existing, unchanged — continuous, not
                                      grid-snapped, for smooth movement)
  regionId                          (new — derived from x,y each tick)
  taxon: Taxonomy::TaxonomicInfo*   (new — replaces the bare species_ string;
                                      individuals of the same taxon are one
                                      species, exactly as EcosystemTaxonomy
                                      already models it)

Lineage                             (new — one per living taxon)
  taxon: Taxonomy::TaxonomicInfo
  members: Organism*[]              (filtered view, not a separate store)
  interactions: from EcologicalInteractionManager, keyed by taxon name
  constraints: from SerinaEvolutionaryConstraints, keyed by BiologicalType
```

A world is a `Region` grid (target size: enough regions for a handful of
biomes to matter geographically, not a Dwarf-Fortress-scale map — tens by
tens, not thousands) plus one flat `vector<Organism>` shared by every
lineage; per-lineage views are computed by filtering on `taxon`, mirroring
how `SerinaEcosystemSimulator` already filters `speciesStats_` by name.
This avoids one `PopulationManager` instance per species (which would make
cross-species interaction bookkeeping harder) while keeping each lineage's
statistics (population, fitness, genetic diversity) independently
computable exactly the way `PopulationManager::updateStatistics()` already
does it, just scoped to one taxon's members instead of the whole pool.

## Per-tick loop (replaces `simulateGeneration()`'s aggregate version)

1. **Environment**: regions update climate/resources (reuses
   `EnvironmentalAdaptation.hpp` per-region instead of once globally).
2. **Movement** (Phase 8, real as of this writing): each organism's move is
   the output of its *lineage's* NEAT network (`NEAT.hpp`'s real genome/
   innovation/mutation implementation) — one network shared by every
   individual of a species, not one per individual, so evaluation cost stays
   negligible at the targeted population scale (see "What Phase 8 delivers"
   below). A lineage without a registered brain (should not happen outside
   isolated unit tests) falls back to a random walk rather than crashing.
3. **Metabolism & survival**: energy cost from `SIZE`/`SPEED`/
   `ENERGY_EFFICIENCY` (as `Organism::update()` already computes), *plus* a
   region-local ecological-interaction modifier: an organism's survival
   probability is adjusted by `EcologicalInteractionManager::calculatePopulationImpact()`
   evaluated against the actual count of interacting-species individuals
   **in the same region**, not a single global population-level dice roll.
4. **Reproduction**: unchanged mechanism
   (`PopulationManager::blendCrossover` + `AdvancedGenome::mutate`), but the
   offspring's mutated traits are checked against
   `SerinaEvolutionaryConstraints::validateMutation()` for the parent's
   `BiologicalType` before being accepted — a mutation that violates a
   group's biological constraints (e.g., a bird whose SIZE/SPEED
   combination `EvolutionaryConstraints.hpp`'s flight-capability validator
   rejects) is retried or dampened rather than applied outright.
5. **Speciation check** (new, replaces the random roll in
   `simulateSpeciation()`): for each lineage with members spread across
   more than one region, compute average genetic distance between the
   sub-population in each region-cluster. If two clusters exceed a distance
   threshold *and* have exchanged no migrants for a configurable number of
   generations (real reproductive isolation, not just a distance snapshot),
   split: call `EcosystemTaxonomy::registerNewSpecies()` for a real Latin
   name and re-tag that cluster's organisms with the new taxon. This is the
   "evolution that isn't random" the design is for — speciation becomes an
   emergent consequence of measured divergence plus isolation, not a
   `uniform(0,1) < 0.001` check.
6. **Extinction**: unchanged trigger conditions
   (`SerinaEcosystemSimulator::simulateExtinction()`'s risk model), applied
   per lineage using its real current population/fitness/diversity instead
   of the aggregate struct's.

## What Phase 7 delivers, specifically

A tested, standalone simulation loop with real regions, real individuals,
real genome-distance-based diversity and real constraint-checked mutation —
verified by Catch2, *not yet* wired into `serina_cli`/the API/the frontend.
Speciation-from-isolation (step 5 above) and per-individual ecological
interactions (step 3) are substantial enough to be their own follow-up
slice once the data model in this document is in place and tested; NEAT
movement (step 2's real version) and the `serina_cli`/API/frontend schema
v2 are later phases still. See `CONTRIBUTING.md` for the live phase-by-phase
status.

## What Phase 8 delivers, specifically

Real NEAT-driven movement, replacing the biased-random walk: each living
lineage owns a `NEAT::NEATGenome` (`UnifiedWorldSimulator::brains_`, keyed by
species name), evaluated per organism per tick against seven sensory inputs
(own energy, local resource level, the four cardinal neighbor regions'
resource levels, local predation pressure — `buildBrainInputs()`) and
producing a two-output movement vector. The brain itself evolves: every
`brainEvolutionInterval` generations, a (1+1) evolution strategy
(`evolveBrains()`) mutates weights (and, rarely, adds a node or connection),
keeping the mutation only if the lineage's real measured average fitness
over that window did not drop — otherwise reverting to the last accepted
version. A newly speciated lineage inherits a mutated copy of its parent's
stable brain (`performSpeciation()`), not a fresh random network, so learned
behavior carries across a species split the same way the genome does.
Extinct species' brains are pruned (`checkExtinction()`).

Verified with a 30-founder, 80-generation scratch run: population grew from
150 to 182 across 17 emergent species (12 speciation events), with
per-species brain complexity (node + connection count) measurably increasing
for several lineages via accepted structural mutations (23 → 26 → 29),
confirming `evolveBrains()` is a real, non-inert (1+1)-ES and not a no-op.
13 Catch2 test cases (9 from Phase 7, 4 new for brain lifecycle: assigned at
seeding, deterministic/replayable evaluation, structural evolution over
generations, inheritance at speciation) pass, 185 assertions. Still *not*
wired into `serina_cli`/the API/the frontend — that is Phase 9.

## What Phase 9 delivers, specifically

Everything above is now reachable from the web stack — through a new
process, not the CLI. `serina_daemon` (`src/serina_daemon.cpp`,
`include/Serina/DaemonProtocol.hpp`) keeps real `UnifiedWorldSimulator`
instances alive in memory and steps them on its own scheduler thread; the
Node API (`api/services/simulationEngine.js`, `daemonClient.js`) connects
over a persistent TCP JSON-lines protocol instead of respawning
`serina_cli` per command. Full contract in
`docs/SERINA_DAEMON_PROTOCOL.md`. Three new read-only projections were
added to `UnifiedWorldSimulator` to make this possible without exposing
internal mutable state: `getRegionSnapshots()` (real per-cell biome +
climate/resources/pressures + live population count),
`getIndividualSnapshots()` (real per-organism id/position/energy/age), and
`getBrainComplexity()`/`hasBrain()` (already existed from Phase 8, now
surfaced over the wire). The frontend (`web/src/types/index.ts` and every
component consuming simulation data) was retyped against this real schema
and re-verified (`tsc`, `eslint`, `vite build`) — no fabricated field was
carried over from the old schema; where the new engine doesn't yet model
something the old one claimed to (extinction risk, a single ecosystem
stability index), the UI was changed to show what's real instead of
inventing an equivalent.
