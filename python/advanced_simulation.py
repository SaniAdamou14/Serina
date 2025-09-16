#!/usr/bin/env python3

import sys
import os
import time
import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Rectangle
import seaborn as sns

# Configuration
SIMULATION_WIDTH = 80
SIMULATION_HEIGHT = 60
ANIMATION_INTERVAL = 100  # milliseconds
STEPS_PER_FRAME = 1

class SerinaVisualizer:
    def __init__(self, sim_api):
        self.sim = sim_api
        self.step_count = 0
        
        # Data storage
        self.population_history = []
        self.energy_history = []
        self.temperature_history = []
        self.resource_history = {'plants': [], 'water': [], 'food': []}
        
        # Setup matplotlib
        plt.style.use('seaborn-v0_8')
        self.fig = plt.figure(figsize=(16, 12))
        
        # Create subplots
        gs = self.fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)
        
        # World visualization
        self.ax_world = self.fig.add_subplot(gs[0:2, 0:2])
        self.ax_world.set_title('Serina World - Live Simulation')
        self.ax_world.set_xlabel('X Position')
        self.ax_world.set_ylabel('Y Position')
        
        # Population chart
        self.ax_pop = self.fig.add_subplot(gs[0, 2])
        self.ax_pop.set_title('Population Over Time')
        self.ax_pop.set_xlabel('Steps')
        self.ax_pop.set_ylabel('Count')
        
        # Energy chart
        self.ax_energy = self.fig.add_subplot(gs[1, 2])
        self.ax_energy.set_title('Average Energy')
        self.ax_energy.set_xlabel('Steps')
        self.ax_energy.set_ylabel('Energy')
        
        # Resource distribution
        self.ax_resources = self.fig.add_subplot(gs[2, 0])
        self.ax_resources.set_title('Resource Distribution')
        self.ax_resources.set_xlabel('Resource Type')
        self.ax_resources.set_ylabel('Total Amount')
        
        # Temperature map
        self.ax_temp = self.fig.add_subplot(gs[2, 1])
        self.ax_temp.set_title('Temperature Map')
        
        # Day/Night and Season Info
        self.ax_info = self.fig.add_subplot(gs[2, 2])
        self.ax_info.set_title('Environment Info')
        self.ax_info.axis('off')
        
        # Initialize plots
        self.init_plots()
        
    def init_plots(self):
        """Initialize all plot elements"""
        # World view - will be updated with terrain and entities
        self.world_im = self.ax_world.imshow(
            np.zeros((SIMULATION_HEIGHT, SIMULATION_WIDTH, 3)), 
            extent=[0, SIMULATION_WIDTH, 0, SIMULATION_HEIGHT],
            origin='lower'
        )
        
        # Population line
        self.pop_line, = self.ax_pop.plot([], [], 'b-', linewidth=2)
        self.ax_pop.grid(True, alpha=0.3)
        
        # Energy line
        self.energy_line, = self.ax_energy.plot([], [], 'r-', linewidth=2)
        self.ax_energy.grid(True, alpha=0.3)
        
        # Resource bars
        self.resource_bars = self.ax_resources.bar(['Plants', 'Water', 'Food'], [0, 0, 0])
        self.ax_resources.grid(True, alpha=0.3)
        
        # Temperature heatmap
        self.temp_data = np.zeros((SIMULATION_HEIGHT, SIMULATION_WIDTH))
        self.temp_im = self.ax_temp.imshow(
            self.temp_data, 
            cmap='coolwarm',
            extent=[0, SIMULATION_WIDTH, 0, SIMULATION_HEIGHT],
            origin='lower'
        )
        plt.colorbar(self.temp_im, ax=self.ax_temp, label='Temperature (°C)')
        
        # Info text
        self.info_text = self.ax_info.text(0.1, 0.9, '', transform=self.ax_info.transAxes,
                                          fontsize=12, verticalalignment='top')
        
    def update_world_view(self):
        """Update the main world visualization"""
        # Create RGB image representing the world
        world_image = np.zeros((SIMULATION_HEIGHT, SIMULATION_WIDTH, 3))
        
        # Get world data from simulation
        try:
            world_data = self.sim.getWorldState()
            
            # Terrain colors
            terrain_colors = {
                'land': [0.6, 0.4, 0.2],      # Brown
                'water': [0.2, 0.6, 1.0],     # Blue  
                'forest': [0.2, 0.8, 0.2],    # Green
                'mountain': [0.5, 0.5, 0.5],  # Gray
                'desert': [1.0, 0.8, 0.4]     # Sandy
            }
            
            # Apply terrain colors (placeholder - would need actual terrain data)
            for y in range(SIMULATION_HEIGHT):
                for x in range(SIMULATION_WIDTH):
                    # Default to land color
                    world_image[y, x] = terrain_colors.get('land', [0.5, 0.5, 0.5])
                    
            # Overlay resource density
            # This would be enhanced with actual resource data from the simulation
            
        except (json.JSONDecodeError, KeyError):
            # Fallback to simple pattern
            pass
            
        self.world_im.set_array(world_image)
        
    def update_population_chart(self):
        """Update population over time chart"""
        if len(self.population_history) > 1:
            steps = range(len(self.population_history))
            self.pop_line.set_data(steps, self.population_history)
            
            self.ax_pop.relim()
            self.ax_pop.autoscale_view()
            
    def update_energy_chart(self):
        """Update average energy chart"""
        if len(self.energy_history) > 1:
            steps = range(len(self.energy_history))
            self.energy_line.set_data(steps, self.energy_history)
            
            self.ax_energy.relim()
            self.ax_energy.autoscale_view()
            
    def update_resource_chart(self):
        """Update resource distribution chart"""
        resources = ['plants', 'water', 'food']
        values = [self.resource_history[res][-1] if self.resource_history[res] else 0 
                 for res in resources]
        
        for bar, value in zip(self.resource_bars, values):
            bar.set_height(value)
            
        self.ax_resources.relim()
        self.ax_resources.autoscale_view()
        
    def update_temperature_map(self):
        """Update temperature heatmap"""
        # This would get actual temperature data from the simulation
        # For now, create a simple pattern
        x, y = np.meshgrid(np.linspace(0, SIMULATION_WIDTH, SIMULATION_WIDTH),
                          np.linspace(0, SIMULATION_HEIGHT, SIMULATION_HEIGHT))
        
        # Simple temperature pattern (would be replaced with real data)
        temp_pattern = 20 + 10 * np.sin(x * 0.1) * np.cos(y * 0.1)
        
        self.temp_im.set_array(temp_pattern)
        self.temp_im.autoscale()
        
    def update_info_display(self):
        """Update environment information display"""
        try:
            # Get population data and parse it
            pop_data = self.sim.getPopulationData()
            pop_json = json.loads(pop_data)
            
            # Get world state
            world_data = self.sim.getWorldState()
            
            # Extract basic info
            population_count = pop_json.get('population_count', 0)
            species_list = pop_json.get('species', [])
            
            # Calculate average energy
            if species_list:
                avg_energy = sum(s.get('energy', 0) for s in species_list) / len(species_list)
            else:
                avg_energy = 0
            
            info_text = f"""Step: {self.step_count}
Population: {population_count}
Avg Energy: {avg_energy:.1f}

Species:"""
            
            # Add species info
            for species in species_list[:3]:  # Show first 3 species
                name = species.get('name', 'Unknown')
                energy = species.get('energy', 0)
                info_text += f"\n{name}: {energy:.1f}"
            
            if len(species_list) > 3:
                info_text += f"\n... and {len(species_list) - 3} more"
            
        except (json.JSONDecodeError, KeyError, Exception) as e:
            info_text = f"Step: {self.step_count}\nSimulation Running..."
            
        self.info_text.set_text(info_text)
        
    def simulate_step(self):
        """Run one simulation step and collect data"""
        try:
            # Step the simulation
            for _ in range(STEPS_PER_FRAME):
                self.sim.step()  # No parameters needed
                self.step_count += 1
            
            # Get simulation data
            pop_data = self.sim.getPopulationData()
            pop_json = json.loads(pop_data)
            
            # Extract metrics
            population = pop_json.get('population_count', 0)
            species_list = pop_json.get('species', [])
            
            # Calculate average energy
            if species_list:
                avg_energy = sum(s.get('energy', 0) for s in species_list) / len(species_list)
            else:
                avg_energy = 0
            
            # Store data
            self.population_history.append(population)
            self.energy_history.append(avg_energy)
            
            # Add placeholder resource data (would be real in full implementation)
            self.resource_history['plants'].append(100 + np.random.normal(0, 10))
            self.resource_history['water'].append(80 + np.random.normal(0, 8))
            self.resource_history['food'].append(60 + np.random.normal(0, 15))
            
            # Limit history length for performance
            max_history = 1000
            if len(self.population_history) > max_history:
                self.population_history = self.population_history[-max_history:]
                self.energy_history = self.energy_history[-max_history:]
                for key in self.resource_history:
                    self.resource_history[key] = self.resource_history[key][-max_history:]
                    
        except Exception as e:
            print(f"Simulation step error: {e}")
            # Add dummy data to prevent crashes
            self.population_history.append(0)
            self.energy_history.append(0)
            for key in self.resource_history:
                self.resource_history[key].append(0)
        
    def animate(self, frame):
        """Animation function called by matplotlib"""
        self.simulate_step()
        
        # Update all visualizations
        self.update_world_view()
        self.update_population_chart()
        self.update_energy_chart()
        self.update_resource_chart()
        self.update_temperature_map()
        self.update_info_display()
        
        return []  # Return empty list for blitting
        
    def run(self):
        """Start the animated simulation"""
        print(f"Starting Serina simulation visualization...")
        print(f"World size: {SIMULATION_WIDTH}x{SIMULATION_HEIGHT}")
        print(f"Animation interval: {ANIMATION_INTERVAL}ms")
        print("Close the window to stop the simulation.")
        
        ani = animation.FuncAnimation(
            self.fig, self.animate, interval=ANIMATION_INTERVAL,
            blit=False, cache_frame_data=False
        )
        
        plt.tight_layout()
        plt.show()

def test_basic_functionality():
    """Test basic simulation functionality without visualization"""
    print("Testing basic simulation functionality...")
    
    try:
        # This will only work if the C++ module compiled successfully
        import serina_py
        
        # Create simulation with correct API
        sim = serina_py.SimulationAPI(20, 20)
        sim.initialize()
        
        print("✓ Simulation created successfully")
        
        # Run a few steps
        for i in range(5):
            sim.step()  # No parameters
            print(f"✓ Step {i+1} completed")
            
        # Try to get data
        try:
            pop_data = sim.getPopulationData()
            world_data = sim.getWorldState()
            print(f"✓ Population data: {pop_data[:100]}...")
            print(f"✓ World data: {world_data[:100]}...")
        except Exception as e:
            print(f"⚠ Data retrieval issue: {e}")
            
        print("✓ Basic functionality test passed!")
        return True
        
    except ImportError as e:
        print(f"✗ Failed to import serina_py: {e}")
        print("Make sure to build the project first.")
        return False
    except Exception as e:
        print(f"✗ Simulation error: {e}")
        return False

def main():
    """Main function"""
    print("=== Serina Ecosystem Simulation ===")
    
    # Test basic functionality first
    if not test_basic_functionality():
        return
    
    # Ask user if they want to run the visualization
    try:
        response = input("\nRun full visualization? (y/n): ").lower().strip()
        if response in ['y', 'yes', '']:
            import serina_py
            
            # Create simulation
            sim = serina_py.SimulationAPI(SIMULATION_WIDTH, SIMULATION_HEIGHT)
            sim.initialize()
            
            # Create and run visualizer
            visualizer = SerinaVisualizer(sim)
            visualizer.run()
        else:
            print("Skipping visualization.")
            
    except KeyboardInterrupt:
        print("\nSimulation interrupted by user.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()