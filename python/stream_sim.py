#!/usr/bin/env python3
"""
Bridge actual Serina Evolution Simulator to Node API via JSON streaming.
Uses the comprehensive simulator from serina_evolution_simulator.py
"""
import sys
import os
import time
import json

# Add current directory to path to find the simulator
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from serina_evolution_simulator import SerinaSimulator, SerinaVisualizer
    SERINA_AVAILABLE = True
except ImportError:
    SERINA_AVAILABLE = False
    print("Warning: serina_evolution_simulator not found, using mock simulation", file=sys.stderr)

def create_mock_simulator():
    """Fallback mock simulator if Serina classes not available"""
    class MockSim:
        def __init__(self):
            self.generation = 0
            self.species_count = 14
            self.total_population = 400
            
        def step(self):
            import random
            self.generation += 1
            self.species_count = max(1, self.species_count + random.randint(-1, 1))
            self.total_population = max(10, self.total_population + random.randint(-10, 10))
            
            return {
                "generation": self.generation,
                "population_count": self.total_population,
                "species_count": self.species_count,
                "average_fitness": 0.5 + random.random() * 0.3,
                "environment": {
                    "temperature": 20 + random.random() * 5,
                    "humidity": 0.6 + random.random() * 0.2,
                    "food_availability": 0.7 + random.random() * 0.2
                },
                "events": self.generate_events()
            }
            
        def generate_events(self):
            import random
            events = []
            if random.random() < 0.3:
                events.append({
                    "type": "reproduction",
                    "species_id": None,
                    "individual_id": random.randint(1, 1000),
                    "offspring_count": random.randint(1, 3)
                })
            if random.random() < 0.1:
                events.append({
                    "type": "mutation",
                    "species_id": None,
                    "individual_id": random.randint(1, 1000),
                    "trait_affected": random.choice(["size", "speed", "intelligence", "endurance"])
                })
            return events
    
    return MockSim()

def create_serina_bridge():
    """Bridge to actual Serina simulator"""
    try:
        sim = SerinaSimulator()
        
        class SerinaBridge:
            def __init__(self, simulator):
                self.sim = simulator
                
            def step(self):
                # Run one simulation step
                survived = self.sim.step()
                if not survived:
                    # Reset if all species died
                    self.sim.initialize_original_species()
                
                # Use the new get_simulation_data method if available
                if hasattr(self.sim, 'get_simulation_data'):
                    return self.sim.get_simulation_data()
                
                # Fallback to manual data construction
                events = []
                
                # Extract recent events from simulation
                if hasattr(self.sim, 'climate_events') and self.sim.environment.climate_events:
                    recent_events = self.sim.environment.climate_events[-3:]  # Last 3 events
                    for event in recent_events:
                        events.append({
                            "type": "environment_change",
                            "species_id": None,
                            "details": {
                                "event_type": event.get("type", "unknown"),
                                "impact": event.get("impact", 0),
                                "year": event.get("year", self.sim.environment.year)
                            }
                        })
                
                # Simulate reproduction events based on population growth
                if len(self.sim.species) > 0:
                    for i, species in enumerate(self.sim.species[:3]):  # Top 3 species
                        if len(species.population_history) > 1:
                            pop_change = species.population_history[-1] - species.population_history[-2]
                            if pop_change > 0:
                                events.append({
                                    "type": "reproduction",
                                    "species_id": i + 1,
                                    "individual_count": pop_change,
                                    "species_name": species.common_name
                                })
                
                return {
                    "generation": self.sim.environment.year,
                    "population_count": sum(s.population for s in self.sim.species),
                    "species_count": len(self.sim.species),
                    "average_fitness": sum(s.fitness for s in self.sim.species) / max(1, len(self.sim.species)),
                    "environment": {
                        "temperature": self.sim.environment.temperature * 50,  # Scale to celsius
                        "humidity": self.sim.environment.rainfall,
                        "food_availability": self.sim.environment.resource_abundance,
                        "era": self.sim.environment.era,
                        "year": self.sim.environment.year,
                        "day": self.sim.environment.day
                    },
                    "species_details": [
                        {
                            "name": s.common_name,
                            "population": s.population,
                            "fitness": s.fitness,
                            "x": s.x,
                            "y": s.y,
                            "traits": s.traits,
                            "extinction_risk": s.extinction_risk
                        } for s in self.sim.species[:10]  # Top 10 species
                    ],
                    "events": events,
                    "biodiversity": len(self.sim.species),
                    "extinctions": self.sim.total_extinctions,
                    "speciations": self.sim.total_speciations
                }
        
        return SerinaBridge(sim)
    
    except Exception as e:
        print(f"Error creating Serina bridge: {e}", file=sys.stderr)
        return create_mock_simulator()

def main():
    """Main streaming loop"""
    try:
        if SERINA_AVAILABLE:
            print("Using actual Serina Evolution Simulator", file=sys.stderr)
            simulator = create_serina_bridge()
        else:
            print("Using mock simulator", file=sys.stderr)
            simulator = create_mock_simulator()
        
        print("Serina Evolution Simulator Bridge starting...", file=sys.stderr)
        
        while True:
            try:
                frame = simulator.step()
                # Output JSON frame to stdout
                sys.stdout.write(json.dumps(frame) + "\n")
                sys.stdout.flush()
                time.sleep(2.0)  # 2 second intervals for detailed evolution
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error in simulation step: {e}", file=sys.stderr)
                time.sleep(1.0)
                
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
