"""
Tests for the serina_py pybind11 bindings (python/bindings.cpp).

These exercise the binding layer itself — nothing else in the project
verifies that the Python API actually matches the C++ classes it wraps.
Earlier versions of this suite (deleted: python/api_test.py,
scripts/test_complete_system.py, scripts/test_real_api.py) called
stats['population'] / stats.get('average_fitness') as if getStatistics()
returned a dict; it returns a SimulationStatistics object with named
attributes (.totalPopulation, .averageFitness, ...), so those scripts
would have raised TypeError on the very first real run. None of them
had ever actually been executed successfully.
"""

import json

import pytest


def test_module_exposes_expected_classes(serina_py):
    for name in ("SimulationAPI", "Genome", "Species", "World", "PhysicsEngine", "TraitType"):
        assert hasattr(serina_py, name), f"serina_py.{name} is missing"


class TestGenome:
    def test_default_traits_are_in_range(self, serina_py):
        genome = serina_py.Genome()
        assert 0.0 <= genome.getTrait(serina_py.TraitType.SIZE) <= 1.0
        assert 0.0 <= genome.getTrait(serina_py.TraitType.SPEED) <= 1.0

    def test_set_and_get_trait_round_trips(self, serina_py):
        genome = serina_py.Genome()
        genome.setTrait(serina_py.TraitType.SIZE, 0.8)
        assert genome.getTrait(serina_py.TraitType.SIZE) == pytest.approx(0.8, abs=1e-3)

    def test_crossover_produces_valid_child(self, serina_py):
        a = serina_py.Genome()
        a.setTrait(serina_py.TraitType.SIZE, 0.2)
        b = serina_py.Genome()
        b.setTrait(serina_py.TraitType.SIZE, 0.9)

        child = a.crossover(b)
        assert 0.0 <= child.getTrait(serina_py.TraitType.SIZE) <= 1.0

    def test_generate_random_is_valid(self, serina_py):
        genome = serina_py.Genome.generateRandom()
        assert 0.0 <= genome.getTrait(serina_py.TraitType.SIZE) <= 1.0

    def test_fitness_is_non_negative(self, serina_py):
        genome = serina_py.Genome()
        assert genome.calculateFitness() >= 0.0


class TestSpecies:
    def test_construction_and_energy(self, serina_py):
        genome = serina_py.Genome()
        species = serina_py.Species("TestSpecies", genome)

        assert species.getName() == "TestSpecies"
        assert species.getEnergy() > 0.0

        species.setEnergy(75.0)
        assert species.getEnergy() == 75.0

    def test_survives_threshold(self, serina_py):
        genome = serina_py.Genome()
        species = serina_py.Species("TestSpecies", genome)
        species.setEnergy(75.0)

        assert species.survives(50.0) is True
        assert species.survives(100.0) is False

    def test_reproduction_requires_energy_above_threshold(self, serina_py):
        genome = serina_py.Genome()
        parent1 = serina_py.Species("Parent1", genome)
        parent2 = serina_py.Species("Parent2", genome)

        parent1.setEnergy(parent1.getReproductionThreshold() + 10.0)
        parent2.setEnergy(parent2.getReproductionThreshold() + 10.0)
        assert parent1.canReproduce()
        assert parent2.canReproduce()

        child = parent1.reproduce(parent2)
        assert "Parent1" in child.getName()
        assert child.getEnergy() > 0.0


class TestPhysicsEngine:
    def test_collision_detection(self, serina_py):
        physics = serina_py.PhysicsEngine(-9.81)
        # size is treated as a diameter: entities collide when
        # distance < (sizeA + sizeB) * 0.5.
        close = serina_py.Entity(10, 10, 2.0, 1.0, 1)
        near = serina_py.Entity(11, 10, 2.0, 1.0, 2)
        far = serina_py.Entity(20, 10, 2.0, 1.0, 3)

        assert physics.checkCollision(close, near) is True
        assert physics.checkCollision(close, far) is False

    def test_gravity_pulls_entities_down(self, serina_py):
        # PhysicsEngine.update() mutates its vector argument in place, so
        # it needs the opaque EntityVector wrapper (a real, shared
        # std::vector<Entity>) rather than a plain Python list — a plain
        # list would be converted into a throwaway C++ copy, and the
        # mutations below would silently be lost. See bindings.cpp.
        physics = serina_py.PhysicsEngine(-9.81)
        entities = serina_py.EntityVector([serina_py.Entity(10, 10, 1.0, 1.0, 1)])

        physics.update(entities, 1.0)

        assert entities[0].vy < 0
        assert entities[0].y < 10

    def test_plain_python_list_is_rejected(self, serina_py):
        # Before EntityVector was introduced, passing a plain list here
        # would silently convert to a throwaway C++ vector and every
        # mutation would be lost with no error at all (see
        # test_gravity_pulls_entities_down's docstring). Binding the
        # vector as opaque turns that silent data loss into a clear
        # TypeError instead — a plain list is no longer accepted.
        physics = serina_py.PhysicsEngine(-9.81)
        entities = [serina_py.Entity(10, 10, 1.0, 1.0, 1)]

        with pytest.raises(TypeError):
            physics.update(entities, 1.0)


class TestWorld:
    def test_dimensions(self, serina_py):
        world = serina_py.World(20, 15)
        assert world.getWidth() == 20
        assert world.getHeight() == 15

    def test_resources(self, serina_py):
        world = serina_py.World(20, 15)
        world.addResource(5, 5, "plants", 50.0)
        assert world.getResource(5, 5, "plants") >= 50.0


class TestSimulationAPI:
    def test_lifecycle_and_statistics(self, serina_py):
        api = serina_py.SimulationAPI(100, 100)
        api.initialize()

        for _ in range(5):
            api.step()

        stats = api.getStatistics()
        # These are named attributes on SimulationStatistics, not dict
        # keys — see the module docstring for why that distinction matters.
        assert stats.speciesCount > 0
        assert stats.totalPopulation >= 0
        assert stats.generation >= 0

    def test_population_data_is_valid_json(self, serina_py):
        api = serina_py.SimulationAPI(100, 100)
        api.initialize()
        api.step()

        data = json.loads(api.getPopulationData())
        assert "species" in data
        assert isinstance(data["species"], list)

    def test_world_state_is_non_empty(self, serina_py):
        api = serina_py.SimulationAPI(100, 100)
        api.initialize()
        assert len(api.getWorldState()) > 0

    def test_start_pause_and_set_speed(self, serina_py):
        api = serina_py.SimulationAPI(100, 100)
        api.initialize()

        api.start()
        api.pause()
        api.setSpeed(2.0)
        api.step()  # Should still be usable after pause/speed changes.

    def test_advanced_population_mode(self, serina_py):
        api = serina_py.SimulationAPI(100, 100)
        api.initialize()
        api.enableAdvancedPopulation(True, 50)

        for _ in range(5):
            api.step()

        stats = api.getStatistics()
        assert stats.totalPopulation > 0

    @pytest.mark.parametrize("width,height", [(10, 10), (500, 500)])
    def test_edge_case_world_sizes(self, serina_py, width, height):
        api = serina_py.SimulationAPI(width, height)
        api.initialize()
        api.step()
        assert api.getStatistics().speciesCount >= 0
