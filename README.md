# Serina

[![CI](https://github.com/SaniAdamou14/Serina/actions/workflows/ci.yml/badge.svg)](https://github.com/SaniAdamou14/Serina/actions/workflows/ci.yml)

An evolutionary ecosystem simulator: a C++20 engine, a Node.js/PostgreSQL API
and a React dashboard. It starts from the premise of *Serina: A World Without
Humans*: five founder species (canaries, tropical fish, crickets, fire ants,
giant land snails) are introduced to an empty world and left to diversify.

The long-term goal is the systemic depth of Dwarf Fortress, applied to
evolution, on the real Earth, with the interface and robustness of RimWorld or
better. The project is far from that today. [`docs/ROADMAP.md`](docs/ROADMAP.md) has the measured
starting point and the plan.

## What works today

**The engine** (`UnifiedWorldSimulator`, `include/Serina/WorldSimulation.hpp`):

- Individuals with diploid genomes (12 traits, crossover, mutation), on a
  12×9 grid of procedurally placed biomes.
- One NEAT brain per lineage, shared by its individuals, driving movement and
  hunting, evasion and foraging effort.
- Foraging with density regulation, predation as an energy transfer, and
  competition between species.
- Speciation when two regional groups of a species stay genetically divergent.
- Full save and resume, bit-identical to a run that was never interrupted.
- A seed gives the same world under GCC and MSVC (`tests/test_determinism.cpp`).

**The web stack:**

- A map of the real grid and individuals with zoom, overlays, a minimap and
  inspection panels.
- A phylogenetic tree built from real speciation events, a species comparison
  view, an event journal and history charts.
- Live speed control, save and restore.

## Known limitations

These are measured or read from the code. See the roadmap for the details.

- **Adaptation to climate works between species, not inside one**: insulation moves
  towards what the climate demands (mean gap 0.25 without selection, 0.12 with it on
  unseen seeds), but each species lives in a narrow range of climates, so there is no
  measurable local adaptation within a species. Biomes never change.
- **Few species**: a split needs real geographic isolation, and a 12×9 map has few
  real barriers, so worlds hold about 10 species. Founder groups are not always safe either: over 8000 ticks, birds survive
  in about 8 worlds out of 10.
- **Several traits have no direct effect on survival** yet: intelligence, hearing,
  camouflage, social behavior and reproduction rate.
- **The food chain is young**: plants, corpses and hunting exist, but plants stay
  about 90% full, so food limits little. Canaries do not fill the food chain: they
  hold 1 diet niche out of 3 in a typical world, 2 at best.
- **The engine does not scale to a planet**: about 5 µs per individual per tick
  on one core, and 2.7 KB of memory per individual.
- **The API has no authentication**, so it should only run locally.

## Architecture

```
serina_daemon (C++, persistent)
  keeps UnifiedWorldSimulator instances in memory, steps them on its own thread
  TCP JSON-lines on 127.0.0.1:7331
        ^
        | persistent TCP (api/services/daemonClient.js)
        |
api (Node, Express, Socket.IO)
  polls the daemon, stores snapshots and history in PostgreSQL when connected
        |
        | Socket.IO + REST (/api/serina/*, /api/simulations/*)
        v
web (React, TypeScript, Vite)
```

Protocol reference: [`docs/SERINA_DAEMON_PROTOCOL.md`](docs/SERINA_DAEMON_PROTOCOL.md).
Engine design: [`docs/UNIFIED_ENGINE_DESIGN.md`](docs/UNIFIED_ENGINE_DESIGN.md).

## Running it

Build the engine and run its tests:

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure -C Release
```

Start the API and the dashboard:

```bash
npm install   # at the repository root, this installs the api and web workspaces
npm run dev   # api on port 3001, web on port 3000
```

The API starts `build/bin/serina_daemon` itself if it is not already running.

PostgreSQL is optional. Without it, live simulation still works, but history
and saved simulations are unavailable. Connection settings are in
`api/.env.example`.

## Changing the model

`tests/test_determinism.cpp` pins a hash of the world produced by one seed. When
you change the model on purpose, update that value in the same commit, and check
that CI gives the same value on Linux and Windows. Use `Det::` from
`include/Serina/DeterministicRandom.hpp` instead of `std::` distributions,
`std::shuffle`, `std::exp` or `std::tanh`, and don't let results depend on the
iteration order of an `unordered_map`.

## License

MIT, see [`LICENSE`](LICENSE).
