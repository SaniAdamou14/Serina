import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'build'))

try:
    import serina_py
except ImportError:
    pytest.skip("serina_py not available", allow_module_level=True)

def test_simulation_initialization():
    sim = serina_py.SimulationAPI(10, 10)
    sim.initialize()
    # TODO: Check state
    assert True  # Placeholder

def test_simulation_step():
    sim = serina_py.SimulationAPI(10, 10)
    sim.initialize()
    sim.step()
    data = sim.getPopulationData()
    assert isinstance(data, str)