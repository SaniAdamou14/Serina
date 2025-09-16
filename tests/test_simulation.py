import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'build'))

try:
    import serina_py
except ImportError:
    print("serina_py not available")
    sys.exit(1)

def test_simulation_initialization():
    sim = serina_py.SimulationAPI(10, 10)
    sim.initialize()
    assert True

def test_simulation_step():
    sim = serina_py.SimulationAPI(10, 10)
    sim.initialize()
    sim.step()
    data = sim.getPopulationData()
    assert isinstance(data, str)

if __name__ == "__main__":
    test_simulation_initialization()
    test_simulation_step()
    print("Python tests passed!")