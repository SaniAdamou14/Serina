#!/usr/bin/env python3
"""
Simple test script for Serina C++/Python integration
"""

import sys
import os
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import numpy as np

# Add current directory to Python path for serina_py import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_import():
    """Test if we can import the serina_py module"""
    try:
        import serina_py
        print("✓ Successfully imported serina_py module")
        return serina_py
    except ImportError as e:
        print(f"✗ Failed to import serina_py: {e}")
        return None

def test_simulation(serina_py):
    """Test basic simulation functionality"""
    if not serina_py:
        return
    
    try:
        # Create simulation
        print("Creating simulation...")
        sim = serina_py.SimulationAPI(800, 600)  # World size 800x600
        
        # Initialize simulation
        print("Initializing simulation...")
        sim.initialize()
        
        # Get initial state
        print("Getting initial state...")
        world_data = sim.getWorldState()
        pop_data = sim.getPopulationData()
        print(f"Initial world state: {world_data}")
        print(f"Initial population data: {pop_data}")
        
        # Run a few steps
        print("Running simulation steps...")
        for i in range(10):
            sim.step()  # Step without parameters
            world_data = sim.getWorldState()
            pop_data = sim.getPopulationData()
            print(f"Step {i+1}: World={world_data}, Population={pop_data}")
        
        print("✓ Basic simulation test completed successfully!")
        return sim
        
    except Exception as e:
        print(f"✗ Simulation test failed: {e}")
        return None

class SimpleVisualizer:
    """Simple real-time visualization of the simulation"""
    
    def __init__(self, sim):
        self.sim = sim
        self.step_count = 0
        
        # History tracking
        self.population_history = []
        self.energy_history = []
        
        # Setup matplotlib
        plt.ion()  # Interactive mode
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(10, 8))
        
        # Population plot
        self.ax1.set_title("Population Over Time")
        self.ax1.set_ylabel("Population")
        self.population_line, = self.ax1.plot([], [], 'b-', linewidth=2)
        
        # Energy plot
        self.ax2.set_title("Average Energy Over Time")
        self.ax2.set_xlabel("Time Steps")
        self.ax2.set_ylabel("Energy")
        self.energy_line, = self.ax2.plot([], [], 'r-', linewidth=2)
        
        plt.tight_layout()
        
    def animate(self, frame):
        """Animation function called by matplotlib"""
        try:
            # Run simulation step
            self.sim.step()  # No parameters
            self.step_count += 1
            
            # Get current data
            pop_data = self.sim.getPopulationData()
            import json
            pop_json = json.loads(pop_data)
            population = pop_json.get('population_count', 0)
            
            # Calculate average energy
            species_list = pop_json.get('species', [])
            if species_list:
                avg_energy = sum(s.get('energy', 0) for s in species_list) / len(species_list)
            else:
                avg_energy = 0
            
            # Update history
            self.population_history.append(population)
            self.energy_history.append(avg_energy)
            
            # Keep only last 100 points for performance
            if len(self.population_history) > 100:
                self.population_history = self.population_history[-100:]
                self.energy_history = self.energy_history[-100:]
            
            # Update plots
            x_data = list(range(len(self.population_history)))
            
            self.population_line.set_data(x_data, self.population_history)
            self.ax1.relim()
            self.ax1.autoscale_view()
            
            self.energy_line.set_data(x_data, self.energy_history)
            self.ax2.relim()
            self.ax2.autoscale_view()
            
            # Update title with current stats
            self.fig.suptitle(f"Serina Simulation - Step {self.step_count} | Pop: {population} | Avg Energy: {avg_energy:.2f}")
            
        except Exception as e:
            print(f"Animation error: {e}")
        
        return self.population_line, self.energy_line
    
    def run(self, duration=60):
        """Run the visualization for specified duration (seconds)"""
        print(f"Starting visualization for {duration} seconds...")
        print("Close the window to stop early.")
        
        # Calculate number of frames
        interval = 100  # 100ms between frames
        frames = int(duration * 1000 / interval)
        
        ani = animation.FuncAnimation(
            self.fig, self.animate, frames=frames, interval=interval, blit=False, repeat=False
        )
        
        plt.show()
        return ani

def main():
    """Main function"""
    print("Serina C++/Python Integration Test")
    print("=" * 40)
    
    # Test module import
    serina_py = test_import()
    if not serina_py:
        return
    
    # Test basic functionality
    sim = test_simulation(serina_py)
    if not sim:
        return
    
    # Ask user if they want visualization
    response = input("\nWould you like to run the visualization? (y/n): ").strip().lower()
    if response in ['y', 'yes']:
        try:
            visualizer = SimpleVisualizer(sim)
            ani = visualizer.run(30)  # Run for 30 seconds
            input("Press Enter to exit...")
        except Exception as e:
            print(f"Visualization error: {e}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    main()