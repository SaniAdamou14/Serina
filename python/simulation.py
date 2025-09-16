#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'build'))  # Assuming built in build/

try:
    import serina_py
except ImportError:
    print("Error: serina_py module not found. Please build the project first.")
    sys.exit(1)

import matplotlib.pyplot as plt
import time
import json

def main():
    # Create simulation
    sim = serina_py.SimulationAPI(50, 50)
    sim.initialize()

    populations = []
    avg_energies = []
    steps = 100

    start_time = time.time()

    plt.ion()  # Interactive mode
    fig, (ax1, ax2) = plt.subplots(2, 1)
    line1, = ax1.plot([], [], 'o-')
    ax1.set_xlim(0, steps)
    ax1.set_ylim(0, 10)
    ax1.set_xlabel('Steps')
    ax1.set_ylabel('Population Count')
    ax1.set_title('Population')

    line2, = ax2.plot([], [], 'r-')
    ax2.set_xlim(0, steps)
    ax2.set_ylim(0, 100)
    ax2.set_xlabel('Steps')
    ax2.set_ylabel('Average Energy')
    ax2.set_title('Average Energy')

    for i in range(steps):
        step_start = time.time()
        sim.step()
        step_time = time.time() - step_start

        data = json.loads(sim.getPopulationData())
        populations.append(data.get('count', 0))
        avg_energies.append(data.get('avg_energy', 0))

        print(f"Step {i}: Population {populations[-1]}, Avg Energy {avg_energies[-1]}, Time {step_time:.4f}s")

        # Update plots
        line1.set_xdata(range(len(populations)))
        line1.set_ydata(populations)
        ax1.relim()
        ax1.autoscale_view()

        line2.set_xdata(range(len(avg_energies)))
        line2.set_ydata(avg_energies)
        ax2.relim()
        ax2.autoscale_view()

        plt.draw()
        plt.pause(0.01)

    total_time = time.time() - start_time
    print(f"Total simulation time: {total_time:.2f}s, Average per step: {total_time/steps:.4f}s")

    plt.ioff()
    plt.show()

    print("Simulation completed.")

if __name__ == "__main__":
    main()