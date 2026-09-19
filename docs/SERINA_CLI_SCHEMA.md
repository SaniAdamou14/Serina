# serina_cli JSON contract (legacy, no longer the web backend)

> **As of Phase 9, the Node API talks to `serina_daemon`, not `serina_cli`.**
> See [`SERINA_DAEMON_PROTOCOL.md`](SERINA_DAEMON_PROTOCOL.md) for the
> contract that `api/services/simulationEngine.js` actually uses today —
> real individuals, a real region grid, real per-lineage NEAT brains,
> served from a live in-memory `UnifiedWorldSimulator` instead of a
> process-per-command aggregate-stats engine. This document is kept for
> `serina_cli` itself, which still exists, still works, and is still backed
> by `SerinaEcosystemSimulator` as described below — useful for one-off
> scripting against the older engine, no longer wired into the website.

`serina_cli` (`src/serina_cli.cpp`) is a one-shot bridge to the C++ ecosystem
simulator (`Simulation::SerinaEcosystemSimulator`, `include/Serina/SerinaSimulator.hpp`).
This is a different, richer engine than `SimulationAPI` (documented in
[`STATISTICS_SCHEMA.md`](STATISTICS_SCHEMA.md)): it tracks named species
("Serinus canaria", "Xiphophorus hellerii", ...) with ecosystem-level
biodiversity, speciation and extinction counters, acquired adaptations and
evolutionary innovations, rather than a single genome with 8 numeric traits.
Its known limitation — genetic diversity redrawn at random each generation
instead of computed — is exactly what `UnifiedWorldSimulator`/`serina_daemon`
fixed; see `docs/UNIFIED_ENGINE_DESIGN.md`.

Every invocation is a separate OS process (there is no long-running daemon),
so state is persisted to a JSON file between calls and reloaded on the next
one — see `--state-file` below.

## Invocation

```bash
serina_cli [--state-file PATH] [-v|--verbose] COMMAND [ARGS...]
```

| Option | Default | Meaning |
|---|---|---|
| `--state-file PATH` | `serina_state.json` (cwd) | Where simulation state persists across invocations. The Node bridge always passes one, namespaced per simulation. |
| `-v`, `--verbose` | off | Extra diagnostics on **stderr**. Never affects stdout. |

stdout carries exactly one JSON object per invocation and nothing else —
every consumer (the Node bridge, `JSON.parse(output.trim())`, a human at a
shell) can rely on that. This was not always true: earlier versions leaked
constructor log lines onto stdout ahead of the JSON, which silently broke
the Node-side parser. See the engine consolidation commit for the fix.

## Commands

### `init`

Seeds the ecosystem with its original species (canaries, guppies, crickets,
fire ants, giant snails, and their historical relatives — 13 species in the
current catalog) if the state file doesn't already have a population, or
resumes from it if it does.

```json
{
  "status": "success",
  "action": "initialize",
  "resumed": false,
  "speciesCount": 13,
  "generation": 0,
  "timestamp": 1737600000123
}
```

### `run [generations]`

Advances the simulation by `generations` real generations (default 1),
running `SerinaEcosystemSimulator::simulateGeneration()` — environmental
change, ecological interactions, genetic drift, adaptation, innovation,
migration, speciation, extinction, in that order — then persists the result.

```json
{
  "status": "success",
  "action": "simulate",
  "steps_completed": 5,
  "generation": 5,
  "species_count": 13,
  "execution_time_ms": 12,
  "timestamp": 1737600000456
}
```

### `status`

The real, current ecosystem state.

```json
{
  "status": "success",
  "action": "status",
  "ecosystem": {
    "generation": 5,
    "total_species": 13,
    "total_population": 15351,
    "biodiversity_index": 13.0,
    "ecosystem_stability": 1.0,
    "total_speciations": 0,
    "total_extinctions": 0
  },
  "species": [
    {
      "name": "Serinus canaria",
      "population": 1000,
      "fitness": 1.0,
      "geneticDiversity": 0.96,
      "extinctionRisk": 0.0,
      "adaptations": [],
      "innovations": ["lateral_line_enhancement"]
    }
  ],
  "timestamp": 1737600000789
}
```

`biodiversity_index` is `speciesStats_.size()` (a living-species count), not
a diversity index in the Shannon/Simpson sense — the name is inherited from
the C++ member (`totalBiodiversity_`) and is worth not over-reading.

### `world`

Climate, resources and selective pressures of the grassland environment
every founder species starts in — the only environment currently reported
(the simulator supports several `EnvironmentType` values internally, but
`world` only surfaces the primary one today).

```json
{
  "status": "success",
  "action": "world_data",
  "world": {
    "primaryEnvironment": "Grassland",
    "description": "...",
    "climate": { "temperature": 18.0, "humidity": 0.65, "precipitation": 800.0, "windSpeed": 8.0, "sunlightIntensity": 0.85 },
    "resources": { "primaryProducers": 0.8, "smallPrey": 0.5, "waterQuality": 0.9, "shelter": 0.4 },
    "pressures": { "predationPressure": 0.2, "competitionIntensity": 0.3, "resourceScarcity": 0.2, "climaticStress": 0.1 },
    "carryingCapacity": 10000
  },
  "generation": 5,
  "timestamp": 1737600000789
}
```

### `genetics`

Aggregate genetic diversity and fitness, per species and ecosystem-wide.
There is no per-trait genome here (no "size", "speed", ...) — the ecosystem
model tracks one scalar diversity value and one fitness value per species,
not an individual-level genome. A richer per-trait breakdown would require
wiring `AdvancedGenetics.hpp` into the live simulation loop, which is not
currently done (see the main README's Known Limitations).

```json
{
  "status": "success",
  "action": "genetics",
  "genetic_diversity": { "overall_diversity": 0.71, "average_fitness": 0.84, "species_count": 13 },
  "species": [
    { "name": "Serinus canaria", "geneticDiversity": 0.96, "averageFitness": 1.0, "generationsSinceLastInnovation": 3 }
  ],
  "timestamp": 1737600000789
}
```

## Error shape

Any command can fail; the shape is uniform and the process still exits 0
with a JSON body describing the failure (a non-zero exit is reserved for
cases where no JSON could be produced at all, e.g. a bad command name):

```json
{ "status": "error", "action": "...", "error": "description" }
```

## Consumed by

- `api/services/simulationEngine.js` — spawns `serina_cli` per simulation,
  ticks it forward with `run`, and persists `status` results into MySQL
  (`evolution_history`, `species`) for the history/trends API.
- `web/src/types/index.ts` (`StatusResult`, `WorldResult`, `GeneticsResult`,
  `SimulationTick`) — the frontend's types are a direct mirror of this
  contract; if you change a field here, update both.
