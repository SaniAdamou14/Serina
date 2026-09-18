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

**The C++ engine** (`include/Serina/`, `src/`) implements two distinct
simulation models, both real and both compiled:

- `SerinaEcosystemSimulator` — the richer model: named species with
  per-species population, fitness and genetic-diversity scalars, ecosystem-
  wide biodiversity/stability/speciation/extinction counters, and real
  acquired adaptations and evolutionary innovations drawn from a biological
  constraint system (`EvolutionaryConstraints.hpp`, `EcologicalInteractions.hpp`,
  `EnvironmentalAdaptation.hpp`). This is the model behind `serina_cli` and
  the web dashboard.
- `SimulationAPI` / `Genome` — a simpler, single-genome model (8 numeric
  traits, mutation, crossover, fitness) behind `serina_demo` (an interactive
  console demo) and `serina_runner` (an autonomous runner that logs, snapshots
  and reports over an arbitrary number of generations — verified with a live
  20-generation run). This is also what the Python bindings expose.

Both are exercised by an automated test suite: 8 Catch2 test cases over the
C++ layer, 21 pytest cases over the Python bindings — all passing in CI on
every push (`ctest` and `pytest python/tests`, see badge above).

**The API → dashboard pipeline** is a single real path, verified end to end
with Playwright screenshots against a live simulation, not just typechecked:
`web` (React) talks over Socket.IO / REST to `api` (Express), which spawns
`build/bin/serina_cli` per command and ticks the simulation forward for
real — the dashboard's generation counter, species list, fitness and genetic-
diversity numbers are the actual `SerinaEcosystemSimulator` state, not
placeholder or randomly-generated data. When MySQL is connected, every tick
is also persisted (`evolution_history`, `species` tables) for the history/
trends endpoints; without it, the API degrades to live-only mode rather than
failing. Full request/response contract: [`docs/SERINA_CLI_SCHEMA.md`](docs/SERINA_CLI_SCHEMA.md).

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
serina_cli (C++, one process per command)
  init / run N / status / world / genetics  ->  JSON on stdout
        ^
        | --state-file <id>.json  (state persists between invocations)
        |
api/services/simulationEngine.js (Node)
  spawns serina_cli, ticks it on an interval, persists snapshots to MySQL
        |
        | Socket.IO ('simulation-data' ticks) + REST (/api/serina/*, /api/simulations/*)
        v
web (React + TypeScript + Vite)
  SimulationContext -> SimulationDashboard -> {PopulationChart, SpeciesPanel,
  GeneticAnalysis, SpeciesEvolutionTree, EnvironmentView, EngineStatus}
```

`serina_cli` is a plain request/response CLI, not a daemon — the Node layer
spawns a fresh process for every `init`/`run`/`status`/`world`/`genetics`
call. That only produces a coherent, continuously-evolving simulation
because state round-trips through a JSON file between calls (one file per
simulation, named by that simulation's database row id); see
[`docs/SERINA_CLI_SCHEMA.md`](docs/SERINA_CLI_SCHEMA.md) for the exact
contract and [Engineering decisions](#engineering-decisions-and-why) for why
it's built this way instead of as a long-running process.

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

**NEAT and the advanced per-trait genetic system exist as real code and are
not wired into the running simulation.** `include/Serina/NEAT.hpp` (620
lines: nodes, connections, mutation, speciation distance, crossover) and
`include/Serina/AdvancedGenetics.hpp` (513 lines: diploid genomes, BLX-α
crossover, 12 bounded traits) are substantial, not stubs — but
`SerinaEcosystemSimulator` never instantiates either; the class it would
need, `AI::NEATEvolution`, doesn't exist, and genetic evolution in the live
loop is a small Gaussian mutation on three scalar traits instead. This is
the single largest gap between what the codebase contains and what the
running simulation actually does.

**The "genetic diversity" percentage shown per species is redrawn at random
every generation, not computed from genome distance.** With the advanced
genetic system unwired (above), `SerinaEcosystemSimulator::updateSpeciesStats()`
sets it to `uniform(0.1, 1.0)` each tick (`SerinaSimulator.hpp:594`) rather
than measuring divergence between individuals. Fitness, extinction risk,
adaptations and innovations are computed from real simulation state;
genetic diversity, specifically, is not yet — it's a placeholder for where a
real distance metric would go once the advanced genetics are wired in.

**The dashboard shows one environment.** `serina_cli world` reports the
grassland biome every founder species starts in; `EnvironmentType` supports
several others internally, but nothing currently drives migration into them
or surfaces their state.

**No spatial or terrain visualization.** An earlier dashboard component drew
a procedural canvas map with no backing data — literally random shapes
labeled as Serina's geography. It was deleted rather than kept as
decoration; there is currently no terrain grid in the live ecosystem model
for a map to honestly represent.

**No authentication on the API.** Every route, including destructive ones,
is open. Acceptable for local development against your own database; not
for deploying this anywhere reachable by anyone else.

**No individual-level tracking in the live pipeline.** The database schema
still has an `individuals` table (population-count history at the species
level is real; per-organism records are not currently written by anything).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full feature-status table
and the active roadmap.

## License

MIT — see [`LICENSE`](LICENSE).
