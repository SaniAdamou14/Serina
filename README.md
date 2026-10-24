# Serina

[![CI](https://github.com/SaniAdamou14/Serina/actions/workflows/ci.yml/badge.svg)](https://github.com/SaniAdamou14/Serina/actions/workflows/ci.yml)

An evolutionary ecosystem simulator — a C++20 engine, a Node.js/MySQL API,
and a React dashboard — built around the speculative-evolution premise of
*Serina: A World Without Humans*: five founder species (canaries, tropical
fish, crickets, fire ants, giant land snails) introduced to an empty world
and left to diversify.

> **State of the project, up front.** This repository went through a
> five-phase consolidation (documented commit by commit in `git log`) that
> deleted roughly 49,700 build artifacts and dead files, made the C++ engine
> compile and run for the first time, collapsed four competing simulation
> engines in the API down to one real one, rebuilt the frontend against data
> the backend actually produces, and replaced a test suite that couldn't
> fail with one that does (and immediately found a real pybind11 bug — see
> [Engineering decisions](#engineering-decisions-and-why)). What's described
> below is what is verified to work today, not a roadmap dressed up as a
> feature list. The [Known limitations](#known-limitations-deliberately)
> section is not an afterthought; read it before you read the feature list.

## What actually works today

**The C++ engine** (`include/Serina/`, `src/`) implements multiple real
simulation models:

- `UnifiedWorldSimulator` (Phases 7–8) — the live backend for the web dashboard:
  real diploid individuals with `AdvancedGenome`, a spatial grid of `Region`s
  with per-cell biome/climate/resources/pressures, taxonomic lineages, real
  genetic-distance-based diversity, constraint-checked mutation, ecological
  interactions with actual foraging income (energy), and NEAT-driven movement
  where each lineage evolves its own brain via a (1+1) evolution strategy.
  Speciation emerges from measured genetic divergence with geographic
  isolation.
- `SerinaEcosystemSimulator` — the richer aggregate model: named species with
  per-species population, fitness and genetic-diversity scalars (computed from
  real state in this model's loop where possible), ecosystem-wide biodiversity/
  stability/speciation/extinction counters, and real acquired adaptations and
  evolutionary innovations drawn from a biological constraint system
  (`EvolutionaryConstraints.hpp`, `EcologicalInteractions.hpp`,
  `EnvironmentalAdaptation.hpp`). Still usable via `serina_cli` for scripting.
- `SimulationAPI` / `Genome` — a simpler, single-genome model (8 numeric
  traits, mutation, crossover, fitness) behind `serina_demo` (an interactive
  console demo) and `serina_runner` (an autonomous runner that logs, snapshots
  and reports over an arbitrary number of generations — verified with a live
  20-generation run). Also what the Python bindings expose.

Both are exercised by an automated test suite: 8 Catch2 test cases over the
C++ layer, 21 pytest cases over the Python bindings — all passing in CI on
every push (`ctest` and `pytest python/tests`, see badge above).

**The API → dashboard pipeline** (Phases 9–10) is a single real path:
`web` (React + TypeScript, Vite) talks over Socket.IO / REST to `api` (Express),
which connects to `serina_daemon` (C++) over a persistent local TCP JSON-lines
connection on port 7331. The daemon keeps one or more `UnifiedWorldSimulator`
instances alive in memory and advances them on its own scheduler thread; the
Node layer polls state, persists snapshots to MySQL when connected (for
history/trends), and streams real-time updates via Socket.IO. The RimWorld-style
dashboard shows a real terrain grid with biome colors, live individuals on the
map, clickable inspection, a real phylogenetic tree from `speciationEvents`,
and speed controls. When MySQL is connected, snapshots are persisted to
`evolution_history`/`species` tables for the history/trends endpoints; without
it, the API degrades to live-only mode rather than failing. Protocol:
[`docs/SERINA_DAEMON_PROTOCOL.md`](docs/SERINA_DAEMON_PROTOCOL.md). The
`serina_cli` JSON contract remains documented in
[`docs/SERINA_CLI_SCHEMA.md`](docs/SERINA_CLI_SCHEMA.md).

## Why this project exists

*Serina: A World Without Humans* is a speculative-evolution web serial: a
scientifically-grounded, multi-million-year thought experiment about how a
handful of introduced species would radiate to fill every ecological niche
on an empty continent. The appeal for a simulation project is obvious and
the trap is too — it is easy to *describe* procedural speciation, biological
constraint, and emergent ecology in a README, and much harder to actually
compute them. This project's real subject is that gap: what a genetically-
and ecologically-constrained simulation loop looks like when it has to
survive contact with a compiler, a test suite, and a browser rendering its
output — and what's still missing once it does.

## Architecture

```
serina_daemon (C++, persistent)
  keeps UnifiedWorldSimulator in memory, advances on scheduler thread
  TCP JSON-lines on 127.0.0.1:7331 (create/play/pause/step/status/regions/individuals/lineages)
        ^
        | persistent TCP (api/services/daemonClient.js)
        |
api/services/simulationEngine.js (Node/Express + Socket.IO)
  polls daemon, persists snapshots to MySQL when connected, streams to clients
        |
        | Socket.IO ('simulation-data') + REST (/api/serina/*, /api/simulations/*)
        v
web (React + TypeScript + Vite)
  SimulationContext -> SimulationDashboard -> {WorldMap, SpeciesPanel,
  GeneticAnalysis, SpeciesEvolutionTree, EnvironmentView, EngineStatus, HistoryView}
```

`serina_daemon` is the live backend (Phase 9): it maintains real
`UnifiedWorldSimulator` state in memory and advances it independently; the
Node API is a thin bridge that polls and persists. See
[`docs/SERINA_DAEMON_PROTOCOL.md`](docs/SERINA_DAEMON_PROTOCOL.md).
`serina_cli` remains available for scripting against the aggregate ecosystem
model (see [`docs/SERINA_CLI_SCHEMA.md`](docs/SERINA_CLI_SCHEMA.md)).

## Engineering decisions, and why

**One simulation engine, not four.** Earlier in this project's history, the
API had a from-scratch JavaScript evolution loop, two independent bridges to
the C++ CLI, and a fourth, never-imported 1,000-line service — running in
parallel, none reconciled, with `server.js` wiring all of them up at once.
`api/services/simulationEngine.js` is now the only one. When
`serina_cli` isn't built, the API returns a clear `503` rather than
falling back to plausible-looking fabricated data — a fallback that
existed in an earlier version specifically to paper over the engine being
unavailable, which is a worse failure mode than an honest error.

**Simulation identity is the database row, not an ad-hoc string.** A
simulation's id is now its `simulations` table auto-increment primary key,
used unchanged as the state-file name, the WebSocket room name, and the
foreign key for history rows. Earlier code minted a fresh `serina-<timestamp>`
string per run and passed it into `INT` foreign-key columns.

**Catch2 instead of bare `assert()`.** `assert()` compiles to a no-op under
`NDEBUG` — i.e., silently, in most Release builds. The suite previously used
raw `assert()` with no test runner wired into CMake at all (`ctest` found
zero tests, by construction, since nothing called `enable_testing()`).
Catch2 + `catch_discover_tests` fixes both problems at once.

**`std::vector<Entity>` is bound opaque in the Python bindings, not via
`pybind11/stl.h`'s default conversion.** `PhysicsEngine::update()` mutates
its vector argument in place. Bound the default way, passing a Python list
silently converts it to a throwaway C++ copy — physics runs, gravity is
applied, and every mutation is discarded the moment the call returns, with
no error. This was found by the Python test suite's first real run, not
designed in ahead of time: `python/tests/test_serina_py.py` now asserts the
mutation is actually visible (it is, since the fix), and separately asserts
that passing a plain list raises `TypeError` rather than silently doing
nothing — a stricter, safer failure mode than either the bug or a merely
documented gotcha.

## Running it

### C++ engine

```bash
cmake -S . -B build -DBUILD_TESTS=ON -DBUILD_PYTHON_MODULE=ON
cmake --build build --config Release
ctest --test-dir build --output-on-failure
```

Executables land in `build/bin/`: `serina_cli` (used by the API), `serina_demo`
(interactive console demo of the ecosystem model), `serina_runner`
(autonomous multi-generation runner — `./run_serina.sh -g 5000 -o my_run`).

Building the Python bindings needs `pybind11` (`pip install pybind11`) —
CMake finds it automatically, or point it at a specific install with
`-DPYBIND11_ROOT=/path/to/pybind11`. Run the binding tests with:

```bash
pytest python/tests
```

On Windows with a MinGW-built module, `python/tests/conftest.py` works
around a real Python 3.8+ behavior change (the DLL loader stops consulting
`PATH` for an extension module's dependencies) automatically; nothing extra
to do.

### Full stack (API + dashboard)

```bash
npm run install:all   # installs api/ and web/ workspaces
npm run dev           # runs api (port 3001) and web (port 3000) together
```

MySQL is optional: without it, the API serves live simulation data but no
history/trends persistence (see `api/.env.example` for connection settings).
The web dev server proxies `/api` and `/socket.io` to the API, so no ports
need to be hardcoded on the frontend side.

## Known limitations, deliberately

**NEAT and advanced genetics are wired in the unified engine, not in the legacy ecosystem model.**
`UnifiedWorldSimulator` (live dashboard backend) uses real `AdvancedGenome`, NEAT brains
per lineage evolving via (1+1)-ES, and genetic diversity computed from real genome
distance. `SerinaEcosystemSimulator` (used by `serina_cli`) still uses a simpler path
in parts of its loop; treat the daemon/unified engine as the source of truth for the
web dashboard.

**Daemon state is in-memory only.** `serina_daemon` does not persist simulation
state to disk across restarts (see [`docs/SERINA_DAEMON_PROTOCOL.md`](docs/SERINA_DAEMON_PROTOCOL.md)).
Use the DB-backed snapshots/history when available, or save via the API as implemented.

**No authentication on the API.** Every route, including destructive ones, is open.
Acceptable for local development against your own database; not for deploying this
anywhere reachable by anyone else.

**Optional persistence.** MySQL/Postgres persistence is optional; without it the
API serves live simulation data but some history/trends features depend on DB
connectivity.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full feature-status table
and the active roadmap.

## License

MIT — see [`LICENSE`](LICENSE).
