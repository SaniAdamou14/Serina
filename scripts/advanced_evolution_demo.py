"""
Démonstration du système évolutif avancé Serina
Test complet des algorithmes génétiques et NEAT
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle
import seaborn as sns
import pandas as pd
import json
import time
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

# Configuration du style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

class AdvancedEvolutionVisualizer:
    """Visualiseur avancé pour la simulation évolutive"""
    
    def __init__(self, width=1000, height=1000):
        self.width = width
        self.height = height
        
        # Configuration de la figure
        self.fig, ((self.ax_main, self.ax_fitness), 
                  (self.ax_species, self.ax_traits)) = plt.subplots(2, 2, figsize=(16, 12))
        
        self.fig.suptitle('Serina: Simulation Évolutive Avancée avec NEAT', fontsize=16, fontweight='bold')
        
        # Configuration des axes
        self.setup_axes()
        
        # Données de suivi
        self.generation_data = []
        self.fitness_history = []
        self.species_history = []
        self.trait_evolution = {
            'SIZE': [], 'SPEED': [], 'ENERGY_EFFICIENCY': [], 'REPRODUCTION_RATE': [],
            'AGGRESSION': [], 'INTELLIGENCE': [], 'LONGEVITY': [], 'VISION_RANGE': []
        }
        
        # Couleurs pour les espèces
        self.species_colors = {}
        
    def setup_axes(self):
        """Configure tous les axes"""
        # Axe principal (simulation)
        self.ax_main.set_xlim(0, self.width)
        self.ax_main.set_ylim(0, self.height)
        self.ax_main.set_title('Population Évolutive (Organismes + Réseaux NEAT)')
        self.ax_main.set_xlabel('Position X')
        self.ax_main.set_ylabel('Position Y')
        
        # Axe fitness
        self.ax_fitness.set_title('Évolution de la Fitness')
        self.ax_fitness.set_xlabel('Génération')
        self.ax_fitness.set_ylabel('Fitness')
        
        # Axe espèces
        self.ax_species.set_title('Dynamique des Espèces NEAT')
        self.ax_species.set_xlabel('Génération')
        self.ax_species.set_ylabel('Nombre d\'Individus')
        
        # Axe traits
        self.ax_traits.set_title('Évolution des Traits Génétiques')
        self.ax_traits.set_xlabel('Génération')
        self.ax_traits.set_ylabel('Valeur Moyenne du Trait')
        
    def update_simulation_data(self, organisms: List[Dict], generation: int, 
                             species_data: List[Dict], stats: Dict):
        """Met à jour les données de simulation"""
        
        # Sauvegarde les données de génération
        generation_info = {
            'generation': generation,
            'population': len(organisms),
            'avg_fitness': stats.get('average_fitness', 0),
            'best_fitness': stats.get('best_fitness', 0),
            'species_count': stats.get('species_count', 0),
            'genetic_diversity': stats.get('genetic_diversity', 0),
            'avg_age': stats.get('average_age', 0),
            'avg_energy': stats.get('average_energy', 0)
        }
        
        self.generation_data.append(generation_info)
        
        # Fitness
        if stats.get('average_fitness') is not None:
            self.fitness_history.append({
                'generation': generation,
                'avg_fitness': stats['average_fitness'],
                'best_fitness': stats['best_fitness'],
                'min_fitness': stats.get('min_fitness', 0)
            })
        
        # Espèces
        self.species_history.append({
            'generation': generation,
            'species': species_data.copy()
        })
        
        # Traits (moyennes de population)
        if organisms:
            for trait in self.trait_evolution.keys():
                trait_values = [org.get('traits', {}).get(trait, 0.5) for org in organisms]
                avg_value = np.mean(trait_values) if trait_values else 0.5
                self.trait_evolution[trait].append(avg_value)
    
    def draw_organisms(self, organisms: List[Dict], species_data: List[Dict]):
        """Dessine les organismes avec visualisation NEAT"""
        self.ax_main.clear()
        self.ax_main.set_xlim(0, self.width)
        self.ax_main.set_ylim(0, self.height)
        self.ax_main.set_title('Population Évolutive (Couleur = Espèce, Taille = Fitness)')
        
        # Assigne des couleurs aux espèces
        for i, species in enumerate(species_data):
            species_id = species.get('id', i)
            if species_id not in self.species_colors:
                self.species_colors[species_id] = plt.cm.Set3(i % 12)
        
        # Dessine chaque organisme
        for org in organisms:
            x = org.get('x', 0)
            y = org.get('y', 0)
            fitness = org.get('fitness', 0)
            species_id = org.get('species_id', 0)
            energy = org.get('energy', 50)
            age = org.get('age', 0)
            
            # Taille basée sur la fitness
            size = max(20, fitness * 100)
            
            # Couleur basée sur l'espèce
            color = self.species_colors.get(species_id, 'gray')
            
            # Alpha basée sur l'énergie
            alpha = max(0.3, energy / 100.0)
            
            # Dessine l'organisme
            circle = Circle((x, y), size, color=color, alpha=alpha)
            self.ax_main.add_patch(circle)
            
            # Annotations pour les meilleurs
            if fitness > 0.8:
                self.ax_main.annotate(f'F:{fitness:.2f}\nA:{age:.0f}', 
                                    (x, y), fontsize=8, ha='center')
        
        # Légende
        legend_elements = []
        for species_id, color in list(self.species_colors.items())[:10]:  # Max 10 espèces
            legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                            markerfacecolor=color, markersize=10, 
                                            label=f'Espèce {species_id}'))
        
        if legend_elements:
            self.ax_main.legend(handles=legend_elements, loc='upper right', 
                              bbox_to_anchor=(1, 1), fontsize=8)
    
    def plot_fitness_evolution(self):
        """Graphique d'évolution de la fitness"""
        self.ax_fitness.clear()
        
        if not self.fitness_history:
            return
        
        generations = [d['generation'] for d in self.fitness_history]
        avg_fitness = [d['avg_fitness'] for d in self.fitness_history]
        best_fitness = [d['best_fitness'] for d in self.fitness_history]
        
        self.ax_fitness.plot(generations, avg_fitness, 'b-', label='Fitness Moyenne', linewidth=2)
        self.ax_fitness.plot(generations, best_fitness, 'r-', label='Meilleure Fitness', linewidth=2)
        
        # Zone d'ombre pour la variance
        if len(avg_fitness) > 1:
            self.ax_fitness.fill_between(generations, avg_fitness, alpha=0.3)
        
        self.ax_fitness.set_title('Évolution de la Fitness')
        self.ax_fitness.set_xlabel('Génération')
        self.ax_fitness.set_ylabel('Fitness')
        self.ax_fitness.legend()
        self.ax_fitness.grid(True, alpha=0.3)
    
    def plot_species_dynamics(self):
        """Graphique de dynamique des espèces"""
        self.ax_species.clear()
        
        if not self.species_history:
            return
        
        # Collecte des données d'espèces
        all_species = set()
        for gen_data in self.species_history:
            for species in gen_data['species']:
                all_species.add(species.get('id', 0))
        
        # Données par espèce
        species_data = {sp_id: [] for sp_id in all_species}
        generations = []
        
        for gen_data in self.species_history:
            generations.append(gen_data['generation'])
            
            # Population par espèce
            current_species = {sp['id']: sp.get('size', 0) for sp in gen_data['species']}
            
            for sp_id in all_species:
                species_data[sp_id].append(current_species.get(sp_id, 0))
        
        # Graphique en aires empilées
        if generations and species_data:
            bottom = np.zeros(len(generations))
            
            for i, (sp_id, sizes) in enumerate(species_data.items()):
                if any(s > 0 for s in sizes):  # Seulement si l'espèce a existé
                    color = self.species_colors.get(sp_id, plt.cm.Set3(i % 12))
                    self.ax_species.fill_between(generations, bottom, 
                                               np.array(bottom) + np.array(sizes),
                                               color=color, alpha=0.7, 
                                               label=f'Espèce {sp_id}')
                    bottom = np.array(bottom) + np.array(sizes)
        
        self.ax_species.set_title('Dynamique des Espèces NEAT')
        self.ax_species.set_xlabel('Génération')
        self.ax_species.set_ylabel('Nombre d\'Individus')
        if len(all_species) <= 10:  # Évite trop de légendes
            self.ax_species.legend(fontsize=8)
        self.ax_species.grid(True, alpha=0.3)
    
    def plot_trait_evolution(self):
        """Graphique d'évolution des traits"""
        self.ax_traits.clear()
        
        if not any(self.trait_evolution.values()):
            return
        
        generations = list(range(len(self.trait_evolution['SIZE'])))
        
        # Sélection des traits les plus intéressants
        important_traits = ['SPEED', 'ENERGY_EFFICIENCY', 'INTELLIGENCE', 'LONGEVITY']
        
        for trait in important_traits:
            if trait in self.trait_evolution and self.trait_evolution[trait]:
                values = self.trait_evolution[trait]
                self.ax_traits.plot(generations, values, 
                                  label=trait.replace('_', ' ').title(), 
                                  linewidth=2, marker='o', markersize=3)
        
        self.ax_traits.set_title('Évolution des Traits Génétiques')
        self.ax_traits.set_xlabel('Génération')
        self.ax_traits.set_ylabel('Valeur Moyenne du Trait')
        self.ax_traits.legend()
        self.ax_traits.grid(True, alpha=0.3)
        self.ax_traits.set_ylim(0, 1)
    
    def update_display(self, organisms: List[Dict], generation: int, 
                      species_data: List[Dict], stats: Dict):
        """Met à jour l'affichage complet"""
        
        # Met à jour les données
        self.update_simulation_data(organisms, generation, species_data, stats)
        
        # Redessine tous les graphiques
        self.draw_organisms(organisms, species_data)
        self.plot_fitness_evolution()
        self.plot_species_dynamics()
        self.plot_trait_evolution()
        
        # Informations textuelles
        info_text = f"""Génération: {generation}
Population: {len(organisms)}
Espèces: {stats.get('species_count', 0)}
Fitness Moy: {stats.get('average_fitness', 0):.3f}
Meilleure: {stats.get('best_fitness', 0):.3f}
Diversité: {stats.get('genetic_diversity', 0):.3f}
Âge Moyen: {stats.get('average_age', 0):.1f}
Énergie Moy: {stats.get('average_energy', 0):.1f}"""
        
        self.fig.text(0.02, 0.98, info_text, fontsize=10, verticalalignment='top',
                     bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8))
        
        plt.tight_layout()
        plt.draw()
        plt.pause(0.1)
    
    def save_results(self, filename: str):
        """Sauvegarde les résultats"""
        results = {
            'generation_data': self.generation_data,
            'fitness_history': self.fitness_history,
            'species_history': self.species_history,
            'trait_evolution': self.trait_evolution
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Résultats sauvegardés dans {filename}")
    
    def generate_final_report(self):
        """Génère un rapport final"""
        if not self.generation_data:
            return
        
        final_gen = self.generation_data[-1]
        
        print("\n" + "="*60)
        print("RAPPORT FINAL - SIMULATION ÉVOLUTIVE SERINA")
        print("="*60)
        print(f"Générations simulées: {final_gen['generation']}")
        print(f"Population finale: {final_gen['population']}")
        print(f"Fitness finale moyenne: {final_gen['avg_fitness']:.4f}")
        print(f"Meilleure fitness atteinte: {max(d['best_fitness'] for d in self.fitness_history):.4f}")
        print(f"Nombre d'espèces final: {final_gen['species_count']}")
        print(f"Diversité génétique finale: {final_gen['genetic_diversity']:.4f}")
        
        print("\nÉVOLUTION DES TRAITS:")
        for trait, values in self.trait_evolution.items():
            if values:
                initial = values[0]
                final = values[-1]
                change = final - initial
                print(f"  {trait:20s}: {initial:.3f} → {final:.3f} ({change:+.3f})")
        
        print("\nPERFORMANCES DE SÉLECTION:")
        if len(self.fitness_history) > 10:
            early_fitness = np.mean([d['avg_fitness'] for d in self.fitness_history[:10]])
            late_fitness = np.mean([d['avg_fitness'] for d in self.fitness_history[-10:]])
            improvement = late_fitness - early_fitness
            print(f"  Amélioration moyenne: {improvement:+.4f}")
            print(f"  Taux d'amélioration: {(improvement/early_fitness)*100:+.2f}%")
        
        print("="*60)

def simulate_advanced_evolution():
    """Simulation évolutive avancée avec NEAT"""
    
    print("🧬 Démarrage de la simulation évolutive avancée Serina")
    print("   Algorithmes: Génétique Avancé + NEAT + Optimisations")
    
    # Configuration
    config = {
        'world_size': (1000, 1000),
        'initial_population': 200,
        'max_population': 500,
        'generations': 50,
        'mutation_rate': 0.1,
        'crossover_rate': 0.8,
        'neat_enabled': True,
        'species_threshold': 3.0
    }
    
    # Visualiseur
    visualizer = AdvancedEvolutionVisualizer(config['world_size'][0], config['world_size'][1])
    
    # Simulation de l'évolution
    np.random.seed(42)
    
    # Population initiale
    population = generate_initial_population(config['initial_population'], config['world_size'])
    
    for generation in range(config['generations']):
        print(f"\n🔄 Génération {generation}")
        
        # Simulation d'un pas de temps
        population, species_data, stats = simulate_generation(population, config, generation)
        
        # Mise à jour de la visualisation
        visualizer.update_display(population, generation, species_data, stats)
        
        # Informations de progression
        print(f"   Population: {len(population)}, "
              f"Espèces: {stats['species_count']}, "
              f"Fitness moy: {stats['average_fitness']:.3f}")
        
        # Condition d'arrêt
        if stats['best_fitness'] > 0.95:
            print(f"🎯 Objectif atteint à la génération {generation}!")
            break
        
        # Pause pour l'animation
        time.sleep(0.5)
    
    # Rapport final
    visualizer.generate_final_report()
    
    # Sauvegarde
    visualizer.save_results(f'evolution_results_gen_{generation}.json')
    
    # Garde la fenêtre ouverte
    print("\n📊 Simulation terminée. Fermez la fenêtre pour continuer.")
    plt.show()

def generate_initial_population(size: int, world_size: Tuple[int, int]) -> List[Dict]:
    """Génère une population initiale"""
    population = []
    
    for i in range(size):
        organism = {
            'id': i,
            'x': np.random.uniform(50, world_size[0] - 50),
            'y': np.random.uniform(50, world_size[1] - 50),
            'vx': np.random.uniform(-2, 2),
            'vy': np.random.uniform(-2, 2),
            'energy': np.random.uniform(70, 100),
            'age': np.random.uniform(0, 50),
            'fitness': np.random.uniform(0.2, 0.6),
            'species_id': np.random.randint(0, 5),
            'traits': {
                'SIZE': np.random.uniform(0.3, 0.8),
                'SPEED': np.random.uniform(0.2, 0.9),
                'ENERGY_EFFICIENCY': np.random.uniform(0.1, 0.7),
                'REPRODUCTION_RATE': np.random.uniform(0.2, 0.8),
                'AGGRESSION': np.random.uniform(0.1, 0.6),
                'INTELLIGENCE': np.random.uniform(0.3, 0.9),
                'LONGEVITY': np.random.uniform(0.4, 0.9),
                'VISION_RANGE': np.random.uniform(0.2, 0.8)
            },
            'neat_nodes': np.random.randint(8, 15),
            'neat_connections': np.random.randint(10, 25)
        }
        population.append(organism)
    
    return population

def simulate_generation(population: List[Dict], config: Dict, generation: int) -> Tuple[List[Dict], List[Dict], Dict]:
    """Simule une génération"""
    
    # Mise à jour des organismes
    for org in population:
        # Vieillissement
        org['age'] += 1
        
        # Métabolisme
        efficiency = org['traits']['ENERGY_EFFICIENCY']
        speed = np.sqrt(org['vx']**2 + org['vy']**2)
        energy_cost = (1 - efficiency) * 0.5 + speed * 0.1
        org['energy'] = max(0, org['energy'] - energy_cost)
        
        # Mouvement basé sur l'intelligence NEAT
        intelligence = org['traits']['INTELLIGENCE']
        exploration = np.random.uniform(-1, 1) * (1 - intelligence)
        org['vx'] += exploration * 0.5
        org['vy'] += exploration * 0.5
        
        # Limites de vitesse
        max_speed = org['traits']['SPEED'] * 5
        current_speed = np.sqrt(org['vx']**2 + org['vy']**2)
        if current_speed > max_speed:
            org['vx'] = (org['vx'] / current_speed) * max_speed
            org['vy'] = (org['vy'] / current_speed) * max_speed
        
        # Mouvement
        org['x'] += org['vx']
        org['y'] += org['vy']
        
        # Limites du monde
        org['x'] = np.clip(org['x'], 0, config['world_size'][0])
        org['y'] = np.clip(org['y'], 0, config['world_size'][1])
        
        # Calcul de fitness complexe
        age_component = min(org['age'] / 1000, 1.0)
        energy_component = org['energy'] / 100
        survival_component = 1.0 if org['energy'] > 0 else 0.0
        
        # Bonus d'exploration
        center_x, center_y = config['world_size'][0] / 2, config['world_size'][1] / 2
        distance_from_center = np.sqrt((org['x'] - center_x)**2 + (org['y'] - center_y)**2)
        exploration_bonus = distance_from_center / (config['world_size'][0] / 2)
        
        org['fitness'] = (age_component * 0.3 + 
                         energy_component * 0.4 + 
                         survival_component * 0.2 + 
                         exploration_bonus * 0.1)
    
    # Supprime les organismes morts
    population = [org for org in population if org['energy'] > 0]
    
    # Reproduction
    reproducers = [org for org in population if org['energy'] > 60 and org['age'] > 20]
    
    while len(population) < config['max_population'] and len(reproducers) >= 2:
        parent1 = np.random.choice(reproducers)
        parent2 = np.random.choice(reproducers)
        
        if parent1['id'] != parent2['id']:
            offspring = create_offspring(parent1, parent2, generation, config)
            population.append(offspring)
            
            # Coût énergétique
            parent1['energy'] -= 15
            parent2['energy'] -= 15
    
    # Génération des données d'espèces (simulation NEAT)
    species_data = generate_species_data(population)
    
    # Statistiques
    stats = calculate_statistics(population, species_data)
    
    return population, species_data, stats

def create_offspring(parent1: Dict, parent2: Dict, generation: int, config: Dict) -> Dict:
    """Crée un descendant par croisement"""
    offspring = {
        'id': len([]) + np.random.randint(10000),  # ID unique
        'x': (parent1['x'] + parent2['x']) / 2 + np.random.normal(0, 10),
        'y': (parent1['y'] + parent2['y']) / 2 + np.random.normal(0, 10),
        'vx': np.random.uniform(-1, 1),
        'vy': np.random.uniform(-1, 1),
        'energy': 60,
        'age': 0,
        'fitness': 0.3,
        'species_id': parent1['species_id'],  # Hérite de l'espèce
        'traits': {},
        'neat_nodes': 0,
        'neat_connections': 0
    }
    
    # Croisement des traits
    for trait in parent1['traits']:
        if np.random.random() < config['crossover_rate']:
            # Croisement
            alpha = np.random.uniform(0.3, 0.7)  # BLX-α
            val1, val2 = parent1['traits'][trait], parent2['traits'][trait]
            offspring['traits'][trait] = alpha * val1 + (1 - alpha) * val2
        else:
            # Copie directe
            offspring['traits'][trait] = parent1['traits'][trait]
        
        # Mutation
        if np.random.random() < config['mutation_rate']:
            mutation = np.random.normal(0, 0.1)
            offspring['traits'][trait] = np.clip(offspring['traits'][trait] + mutation, 0, 1)
    
    # Évolution NEAT (simulation)
    offspring['neat_nodes'] = np.random.randint(
        max(8, min(parent1['neat_nodes'], parent2['neat_nodes'])),
        min(20, max(parent1['neat_nodes'], parent2['neat_nodes']) + 2)
    )
    
    offspring['neat_connections'] = np.random.randint(
        max(10, min(parent1['neat_connections'], parent2['neat_connections'])),
        min(40, max(parent1['neat_connections'], parent2['neat_connections']) + 3)
    )
    
    return offspring

def generate_species_data(population: List[Dict]) -> List[Dict]:
    """Génère les données d'espèces (simulation NEAT)"""
    species_counts = {}
    
    for org in population:
        species_id = org['species_id']
        if species_id not in species_counts:
            species_counts[species_id] = {'count': 0, 'total_fitness': 0, 'best_fitness': 0}
        
        species_counts[species_id]['count'] += 1
        species_counts[species_id]['total_fitness'] += org['fitness']
        species_counts[species_id]['best_fitness'] = max(
            species_counts[species_id]['best_fitness'], org['fitness']
        )
    
    species_data = []
    for species_id, data in species_counts.items():
        species_data.append({
            'id': species_id,
            'size': data['count'],
            'avg_fitness': data['total_fitness'] / data['count'],
            'best_fitness': data['best_fitness']
        })
    
    return species_data

def calculate_statistics(population: List[Dict], species_data: List[Dict]) -> Dict:
    """Calcule les statistiques de la population"""
    if not population:
        return {
            'population': 0, 'average_fitness': 0, 'best_fitness': 0,
            'species_count': 0, 'genetic_diversity': 0,
            'average_age': 0, 'average_energy': 0
        }
    
    fitnesses = [org['fitness'] for org in population]
    ages = [org['age'] for org in population]
    energies = [org['energy'] for org in population]
    
    # Diversité génétique (variance des traits)
    trait_variances = []
    for trait in ['SPEED', 'INTELLIGENCE', 'ENERGY_EFFICIENCY']:
        values = [org['traits'][trait] for org in population]
        trait_variances.append(np.var(values))
    
    genetic_diversity = np.mean(trait_variances)
    
    return {
        'population': len(population),
        'average_fitness': np.mean(fitnesses),
        'best_fitness': np.max(fitnesses),
        'min_fitness': np.min(fitnesses),
        'species_count': len(species_data),
        'genetic_diversity': genetic_diversity,
        'average_age': np.mean(ages),
        'average_energy': np.mean(energies)
    }

if __name__ == "__main__":
    print("🚀 Lancement de la démonstration Serina")
    print("   Système évolutif avancé avec algorithmes génétiques et NEAT")
    print("   Optimisations de performance et visualisation en temps réel")
    
    simulate_advanced_evolution()
    
    print("\n✅ Démonstration terminée avec succès!")
    print("   Consultez les fichiers de résultats générés.")