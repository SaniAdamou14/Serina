# serina_daemon JSON-lines protocol (Phase 9)

`serina_daemon` (`src/serina_daemon.cpp`, protocol logic in
`include/Serina/DaemonProtocol.hpp`) is the real backend behind the web API
as of Phase 9. The daemon keeps one or
more real `Simulation::UnifiedWorldSimulator` instances alive in memory and
advances them on its own scheduler thread, independent of whether any
client is currently asking for data. This is what makes continuous,
real-time observation (Phase 10's RimWorld-style interface) practical:
individuals with full diploid genomes and per-lineage NEAT brains never need
to be resurialized from disk just to answer "what's happening right now."

## Transport

A local TCP server bound to `127.0.0.1` only (not meant to be reachable off
the machine). Default port `7331`, overridable with `--port`. One line of
JSON in, one line of JSON out, "JSON-lines": every request and response is
a single `\n`-terminated JSON object, so a connection can carry many
request/response pairs without re-connecting. Multiple simulations
multiplex over the same connection; responses are correlated to requests by
the `id` field the caller supplies (an arbitrary number, the daemon does
not interpret it, only echoes it back).

```
» {"id": 1, "command": "create", "simulationId": "demo", "founderCount": 20}\n
« {"id": 1, "status": "success", "simulationId": "demo", "generation": 0, "population": 100}\n
```

The Node bridge (`api/services/daemonClient.js`) opens one connection at
startup (spawning `serina_daemon` itself if nothing is already listening on
the port) and keeps it open for the process's lifetime.

## Commands

Every request has `command` and (except `list`) `simulationId`. Every
response has `status: "success"` or `status: "error"` (with `error: "..."`
explaining why) plus the echoed `id`.

| Command | Extra request fields | What it does |
|---|---|---|
| `create` | `founderCount` (default 40), `seed` (optional) | Builds a real `UnifiedWorldSimulator`, seeds the five founder lineages with `founderCount` individuals each (diploid genomes, real NEAT brains). Errors if `simulationId` already exists. |
| `destroy` | - | Frees the simulation. |
| `history` | - | Returns `samples`: population, species, energy, diversity and per-species counts over the whole game, at most 1000 points. |
| `save` | - | Returns a full snapshot in `snapshot` (JSON) via `UnifiedWorldSimulator::toJson()`. |
| `load` | `snapshot` (required) | Restores a simulation from a snapshot via `UnifiedWorldSimulator::fromJson()`. Errors if `simulationId` already exists. |
| `list` | - (no `simulationId`) | All active simulations with `id`, `running`, `generation`, `population`. |
| `play` | `ticksPerSecond` (default 2) | Marks the simulation as running: the scheduler thread calls `step()` on it at roughly that rate until paused. |
| `pause` | - | Stops the scheduler from advancing it. State is untouched, resuming with `play` continues from exactly where it left off. |
| `step` | `count` (default 1) | Synchronously advances `count` generations right now, regardless of play/pause state, mainly for deterministic testing/scripting. |
| `status` | - | `generation`, `population`, `running`, `speciesCount`, `lineages` (see below), `speciationEventCount` (a count, see `lineages` for the full history). |
| `regions` | - | `gridWidth`, `gridHeight`, `regions`: one entry per cell (`gridX`, `gridY`, `environmentType`, `environmentName`, `temperature`, `primaryProducers`, `predationPressure`, `competitionIntensity`, `climaticStress`, `population`, the real count of living organisms in that cell right now). |
| `individuals` | - | `individuals`: one real entry per living organism (`id`, `species`, `x`, `y`, `energy`, `age`), no genome internals, just enough to place and inspect it. |
| `lineages` | - | `lineages` (see below) plus `speciationEvents`: the **full array** of real speciation events (`parentSpecies`, `newSpecies`, `generation`, `geneticDistanceAtSplit`), `extinctionEvents`, `interventions`, `convergenceSignals`, and `moments` (since protocol 8, see below). |
| `ping` | - | Liveness check; always succeeds if the daemon is up. Returns `protocolVersion`, which the API checks before starting a game. |

A lineage entry (used by both `status` and `lineages`):

```json
{
  "speciesName": "Serinus canaria",
  "biologicalType": 0,
  "population": 21,
  "averageFitness": 0.35,
  "geneticDiversity": 0.31,
  "regionsOccupied": 5,
  "adaptations": [],
  "innovations": [],
  "hasBrain": true,
  "brainComplexity": 23
}
```

`geneticDiversity` is the real average pairwise genome distance
(`AdvancedGenome::geneticDistance()`), not a random draw, see
`docs/UNIFIED_ENGINE_DESIGN.md`. `brainComplexity` is that lineage's NEAT
brain's node + connection count (Phase 8); it changes over generations only
when the (1+1) evolution strategy actually accepts a structural mutation.

A moment entry (`lineages.moments`), a notable moment the engine detected, in the order it happened:

```json
{
  "generation": 4120,
  "kind": "extinction",
  "species": "Xiphophorus hellerii",
  "relatedSpecies": "",
  "biologicalType": 1,
  "gridX": 3,
  "gridY": 5,
  "individualId": 0,
  "before": 2,
  "after": 0,
  "cause": "oldAge",
  "importance": 0.8
}
```

| `kind` | Detected when | `before` / `after` | `cause` |
|---|---|---|---|
| `last_survivor` | a species falls to one individual (`individualId`, its cell) | previous count / 1 | main cause of death since the recent peak |
| `extinction` | a species has no individual left (cell of its last death) | last count / 0 | main cause of the last deaths |
| `group_extinct` | the last species of a biological group dies out | as `extinction` | as `extinction` |
| `mass_extinction` | at least 3 species and 30 % of species die out within a year | species alive a year ago / species lost | empty |
| `new_species` | a speciation (`relatedSpecies` is the parent, cell where most of the new group lives) | 0 / size of the new group | empty |
| `collapse` | a species loses at least half of its peak of the last year, from at least 20; once per decline, until it is back to three quarters of that peak | peak / count now | main cause of death since the peak |

`cause` is one of `starved`, `oldAge`, `eaten`, `burned`, `disaster`, or empty when nothing measured it.
`importance` is a presentation rank in [0, 1], not a measurement: `group_extinct` 1, `mass_extinction` 0.9,
extinction of an original lineage 0.8 (0.7 for a branch), `last_survivor` 0.75, first `new_species` 0.65
(0.5 after), `collapse` the share lost minus 0.25 (a letter from three quarters lost).

## Persistence

- **Save/load via protocol.** The daemon supports `save` (returns a full
  JSON snapshot via `UnifiedWorldSimulator::toJson()`) and `load` (restores
  from a snapshot via `UnifiedWorldSimulator::fromJson()`). The Node API
  persists snapshots to the database and can restore them with
  `POST /api/serina/restore/:id`. Live state is held in memory by the
  daemon while running.

## What is deliberately not here yet

- **No authentication.** The daemon binds to loopback only and is meant to
  be reached exclusively by the Node API on the same machine.
- **No extinction-risk score.** `UnifiedWorldSimulator` does not model one
  yet; the web UI shows real population counts instead of fabricating a risk
  percentage.
- **One tick rate per simulation**, set via `play`'s `ticksPerSecond`, no
  per-lineage or per-region pacing.

## Testing

`tests/test_daemon_protocol.cpp` exercises `handleCommand()` directly (no
socket) for every command, plus one end-to-end test that opens a real
`Net::TcpServer`/`Net::TcpConnection` pair and round-trips actual JSON-lines
requests, proving the wire format itself, not just the in-memory dispatch
function.
