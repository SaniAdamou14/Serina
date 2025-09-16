#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'build'))  # Assuming built in build/

try:
    import serina_py
except ImportError:
    print("Error: serina_py module not found. Please build the project first.")
    sys.exit(1)

#import matplotlib.pyplot as plt
import time

def main():
    # Create simulation
    sim = serina_py.SimulationAPI(50, 50)
    sim.initialize()

    populations = []
    steps = 100

    for i in range(steps):
        sim.step()
        # TODO: Parse population data
        populations.append(i)  # Placeholder

        print(f"Step {i}: Simulation running...")

    # Simple plot
    # plt.plot(range(steps), populations)
    # plt.xlabel('Steps')
    # plt.ylabel('Population')
    # plt.title('Serina Ecosystem Simulation')
    # plt.show()

    print("Simulation completed. Populations:", populations)

if __name__ == "__main__":
    main()