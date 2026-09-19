# serina_daemon JSON-lines protocol (Phase 9)

`serina_daemon` (`src/serina_daemon.cpp`, protocol logic in
`include/Serina/DaemonProtocol.hpp`) is the real backend behind the web API
as of Phase 9. It replaces `serina_cli` for that role: instead of
respawning a process per command and reloading state from a JSON file
(the pattern `serina_cli` still uses — see
[`SERINA_CLI_SCHEMA.md`](SERINA_CLI_SCHEMA.md)), the daemon keeps one or
more real `Simulation::UnifiedWorldSimulator` instances alive in memory and
advances them on its own scheduler thread, independent of whether any
client is currently asking for data. This is what makes continuous,
real-time observation (Phase 10's RimWorld-style interface) practical:
individuals with full diploid genomes and per-lineage NEAT brains never need
to be resurialized from disk just to answer "what's happening right now."

## Transport

A local TCP server bound to `127.0.0.1` only (not meant to be reachable off
the machine). Default port `7331`, overridable with `--port`. One line of
JSON in, one line of JSON out — "JSON-lines": every request and response is
a single `\n`-terminated JSON object, so a connection can carry many
request/response pairs without re-connecting. Multiple simulations
multiplex over the same connection; responses are correlated to requests by
the `id` field the caller supplies (an arbitrary number — the daemon does
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
| `destroy` | — | Frees the simulation. |
| `list` | — (no `simulationId`) | All active simulations with `id`, `running`, `generation`, `population`. |
| `play` | `ticksPerSecond` (default 2) | Marks the simulation as running: the scheduler thread calls `step()` on it at roughly that rate until paused. |
| `pause` | — | Stops the scheduler from advancing it. State is untouched — resuming with `play` continues from exactly where it left off. |
| `step` | `count` (default 1) | Synchronously advances `count` generations right now, regardless of play/pause state — mainly for deterministic testing/scripting. |
| `status` | — | `generation`, `population`, `running`, `speciesCount`, `lineages` (see below), `speciationEventCount` (a count — see `lineages` for the full history). |
| `regions` | — | `gridWidth`, `gridHeight`, `regions`: one entry per cell (`gridX`, `gridY`, `environmentType`, `environmentName`, `temperature`, `primaryProducers`, `predationPressure`, `competitionIntensity`, `climaticStress`, `population` — the real count of living organisms in that cell right now). |
| `individuals` | — | `individuals`: one real entry per living organism (`id`, `species`, `x`, `y`, `energy`, `age`) — no genome internals, just enough to place and inspect it. |
| `lineages` | — | `lineages` (see below) plus `speciationEvents`: the **full array** of real speciation events (`parentSpecies`, `newSpecies`, `generation`, `geneticDistanceAtSplit`). |
| `ping` | — | Liveness check; always succeeds if the daemon is up. |

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
(`AdvancedGenome::geneticDistance()`), not a random draw — see
`docs/UNIFIED_ENGINE_DESIGN.md`. `brainComplexity` is that lineage's NEAT
brain's node + connection count (Phase 8); it changes over generations only
when the (1+1) evolution strategy actually accepts a structural mutation.

## What is deliberately not here yet

- **No persistence across a daemon restart.** State lives in memory only;
  killing the daemon loses the world, the same way closing an unsaved game
  does. Save/load-to-disk is future work, not a "half-measure" — it was
  scoped out explicitly so Phase 9 could focus on making live observation
  real first.
- **No authentication.** The daemon binds to loopback only and is meant to
  be reached exclusively by the Node API on the same machine.
- **No extinction-risk score.** `UnifiedWorldSimulator` does not model one
  yet (unlike the old `SerinaEcosystemSimulator`); the web UI now shows real
  population counts instead of fabricating a risk percentage from nothing.
- **One tick rate per simulation**, set via `play`'s `ticksPerSecond` — no
  per-lineage or per-region pacing.

## Testing

`tests/test_daemon_protocol.cpp` exercises `handleCommand()` directly (no
socket) for every command, plus one end-to-end test that opens a real
`Net::TcpServer`/`Net::TcpConnection` pair and round-trips actual JSON-lines
requests — proving the wire format itself, not just the in-memory dispatch
function.
