#!/usr/bin/env python3
"""
🌍 SERINA - World of Birds Evolution Simulator
===============================================
Simulateur évolutionnaire autonome inspiré de l'histoire "Serina - A Natural History of the World of Birds"

Ce programme simule l'évolution d'espèces dans le monde de Serina sur des millions d'années,
montrant l'adaptation, la spéciation, et les innovations évolutionnaires en temps réel.

Auteur: Projet Serina
Date: Septembre 2025
"""

import sys
import os
import time
import json
import random
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle, Rectangle, Polygon
import seaborn as sns
from datetime import datetime
import threading

# Configuration de l'affichage
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

class SerinaSpecies:
    """Représente une espèce dans le monde de Serina"""
    def __init__(self, name, common_name, biological_type, color, x=None, y=None):
        self.name = name
        self.common_name = common_name
        self.biological_type = biological_type
        self.color = color
        
        # Position dans le monde
        self.x = x if x is not None else random.randint(10, 70)
        self.y = y if y is not None else random.randint(10, 50)
        
        # Population et démographie
        self.population = random.randint(100, 1000)
        self.max_population = self.population * 2
        self.generation = 0
        
        # Traits évolutionnaires
        self.traits = {
            'size': random.uniform(0.5, 2.0),
            'speed': random.uniform(0.5, 2.0),
            'intelligence': random.uniform(0.5, 2.0),
            'social_behavior': random.uniform(0.5, 2.0),
            'energy_efficiency': random.uniform(0.5, 2.0),
            'adaptation_rate': random.uniform(0.01, 0.1)
        }
        
        # État évolutionnaire
        self.fitness = 1.0
        self.extinction_risk = 0.0
        self.environmental_tolerance = random.uniform(0.3, 0.8)
        self.innovations = []
        self.adaptations = []
        
        # Historique
        self.population_history = [self.population]
        self.fitness_history = [self.fitness]
        
    def mutate(self, mutation_rate=0.02):
        """Simule une mutation génétique"""
        for trait in self.traits:
            if random.random() < mutation_rate:
                change = random.uniform(-0.1, 0.1)
                self.traits[trait] = max(0.1, min(5.0, self.traits[trait] + change))
        
        # Chance d'innovation
        if random.random() < 0.001:  # Très rare
            innovations = ['tool_use', 'complex_communication', 'cooperative_hunting', 
                          'environmental_manipulation', 'advanced_nesting']
            new_innovation = random.choice(innovations)
            if new_innovation not in self.innovations:
                self.innovations.append(new_innovation)
                self.traits['intelligence'] *= 1.2
                
    def environmental_pressure(self, environment_factor):
        """Calcule l'effet de la pression environnementale"""
        pressure = abs(environment_factor - self.environmental_tolerance)
        self.fitness = max(0.1, 1.0 - pressure)
        
        # Adaptation graduelle
        if pressure > 0.3:
            adaptation_speed = self.traits['adaptation_rate']
            self.environmental_tolerance += (environment_factor - self.environmental_tolerance) * adaptation_speed
            
    def update_population(self, delta_time=1):
        """Met à jour la population selon la fitness"""
        growth_rate = (self.fitness - 0.5) * 0.1
        population_change = int(self.population * growth_rate * delta_time)
        
        self.population = max(1, min(self.max_population, self.population + population_change))
        self.generation += 1
        
        # Calcul du risque d'extinction
        self.extinction_risk = max(0, 1.0 - (self.population / 100) - self.fitness)
        
        # Historique
        self.population_history.append(self.population)
        self.fitness_history.append(self.fitness)
        
        return self.population

class SerinaEnvironment:
    """Environnement du monde de Serina"""
    def __init__(self, width=80, height=60):
        self.width = width
        self.height = height
        self.day = 0
        self.year = 0
        self.era = "Early Serina"
        
        # Facteurs environnementaux
        self.temperature = 0.5  # 0-1
        self.rainfall = 0.5     # 0-1
        self.resource_abundance = 0.7  # 0-1
        
        # Biomes
        self.biomes = {
            'grassland': {'temp': 0.6, 'rain': 0.4, 'color': 'lightgreen'},
            'forest': {'temp': 0.5, 'rain': 0.8, 'color': 'darkgreen'},
            'wetland': {'temp': 0.6, 'rain': 0.9, 'color': 'cyan'},
            'ocean': {'temp': 0.5, 'rain': 1.0, 'color': 'blue'},
            'mountain': {'temp': 0.3, 'rain': 0.6, 'color': 'brown'}
        }
        
        # Événements climatiques
        self.climate_events = []
        
    def advance_time(self):
        """Avance le temps et simule les changements"""
        self.day += 1
        if self.day >= 365:
            self.day = 0
            self.year += 1
            
        # Changements à long terme (ères géologiques)
        if self.year > 0 and self.year % 1000 == 0:
            self.geological_change()
            
        # Variations saisonnières
        season_factor = np.sin(self.day * 2 * np.pi / 365)
        self.temperature = 0.5 + 0.3 * season_factor
        self.rainfall = 0.5 + 0.4 * season_factor
        
        # Événements aléatoires
        if random.random() < 0.01:  # 1% chance
            self.random_event()
            
    def geological_change(self):
        """Simule les changements géologiques à long terme"""
        change_type = random.choice(['warming', 'cooling', 'aridification', 'humid_period'])
        
        if change_type == 'warming':
            self.temperature = min(1.0, self.temperature + 0.1)
            self.era = f"Warm Period (Year {self.year})"
        elif change_type == 'cooling':
            self.temperature = max(0.0, self.temperature - 0.1)
            self.era = f"Cool Period (Year {self.year})"
        elif change_type == 'aridification':
            self.rainfall = max(0.0, self.rainfall - 0.1)
            self.era = f"Arid Period (Year {self.year})"
        else:  # humid_period
            self.rainfall = min(1.0, self.rainfall + 0.1)
            self.era = f"Humid Period (Year {self.year})"
            
    def random_event(self):
        """Événements climatiques aléatoires"""
        events = ['drought', 'flood', 'storm', 'volcanic_activity', 'meteor_impact']
        event = random.choice(events)
        
        self.climate_events.append({
            'type': event,
            'year': self.year,
            'day': self.day,
            'impact': random.uniform(0.1, 0.8)
        })
        
        # Effets temporaires
        if event == 'drought':
            self.rainfall *= 0.5
            self.resource_abundance *= 0.7
        elif event == 'flood':
            self.rainfall *= 1.5
        elif event == 'volcanic_activity':
            self.temperature *= 0.8
            self.resource_abundance *= 0.6

class SerinaSimulator:
    """Simulateur principal de l'évolution de Serina"""
    def __init__(self):
        self.environment = SerinaEnvironment()
        self.species = []
        self.time_scale = 1  # Années par étape
        self.running = False
        
        # Statistiques globales
        self.total_extinctions = 0
        self.total_speciations = 0
        self.biodiversity_history = []
        
        # Initialiser les espèces originales de Serina
        self.initialize_original_species()
        
    def initialize_original_species(self):
        """Initialise les 20 espèces originales de Serina"""
        original_species = [
            ("Serinus canaria", "Canari domestique", "bird", "yellow"),
            ("Xiphophorus maculatus", "Platy tacheté", "fish", "orange"),
            ("Xiphophorus hellerii", "Porte-épée", "fish", "red"),
            ("Poecilia reticulata", "Guppy", "fish", "blue"),
            ("Poecilia sphenops", "Molly noir", "fish", "black"),
            ("Gryllus bimaculatus", "Grillon des champs", "arthropod", "brown"),
            ("Acheta domesticus", "Grillon domestique", "arthropod", "darkgoldenrod"),
            ("Solenopsis invicta", "Fourmi de feu", "arthropod", "red"),
            ("Atta cephalotes", "Fourmi champignonniste", "arthropod", "darkred"),
            ("Folsomia candida", "Collembole", "arthropod", "white"),
            ("Coccinella septempunctata", "Coccinelle", "arthropod", "red"),
            ("Achatina fulica", "Escargot géant", "mollusk", "tan"),
            ("Limax maximus", "Limace léopard", "mollusk", "gray"),
            ("Lymnaea stagnalis", "Limnée", "mollusk", "brown"),
            ("Helix pomatia", "Escargot de Bourgogne", "mollusk", "beige"),
            ("Lumbricus terrestris", "Ver de terre", "worm", "brown"),
            ("Procambarus fallax", "Écrevisse marbrée", "crustacean", "blue"),
            ("Neocaridina davidi", "Crevette cerise", "crustacean", "red"),
            ("Triops longicaudatus", "Triops", "crustacean", "green"),
            ("Hydra vulgaris", "Hydre", "cnidarian", "lightblue")
        ]
        
        for name, common_name, bio_type, color in original_species:
            species = SerinaSpecies(name, common_name, bio_type, color)
            self.species.append(species)
            
    def step(self):
        """Une étape de simulation"""
        # Avancer l'environnement
        for _ in range(self.time_scale):
            self.environment.advance_time()
        
        # Calculer le facteur environnemental global
        env_factor = (self.environment.temperature + self.environment.rainfall) / 2
        
        # Mettre à jour chaque espèce
        surviving_species = []
        
        for species in self.species:
            # Mutation
            species.mutate()
            
            # Pression environnementale
            species.environmental_pressure(env_factor)
            
            # Mise à jour de la population
            species.update_population(self.time_scale)
            
            # Vérifier l'extinction
            if species.population <= 0 or (species.extinction_risk > 0.9 and random.random() < 0.1):
                self.total_extinctions += 1
                print(f"💀 Extinction: {species.common_name} (Year {self.environment.year})")
            else:
                surviving_species.append(species)
                
                # Spéciation possible
                if (species.population > 500 and 
                    len(species.innovations) > 0 and 
                    random.random() < 0.001):
                    self.speciation(species)
        
        self.species = surviving_species
        
        # Statistiques
        self.biodiversity_history.append(len(self.species))
        
        return len(self.species) > 0
    
    def speciation(self, parent_species):
        """Crée une nouvelle espèce par spéciation"""
        new_name = f"{parent_species.name}_descendant_{self.total_speciations}"
        new_common = f"{parent_species.common_name} descendant"
        
        new_species = SerinaSpecies(
            new_name, new_common, 
            parent_species.biological_type,
            parent_species.color
        )
        
        # Hériter des traits avec variations
        for trait in new_species.traits:
            variation = random.uniform(0.8, 1.2)
            new_species.traits[trait] = parent_species.traits[trait] * variation
            
        # Déplacer géographiquement
        new_species.x = parent_species.x + random.randint(-10, 10)
        new_species.y = parent_species.y + random.randint(-10, 10)
        
        # Population initiale réduite
        new_species.population = parent_species.population // 4
        parent_species.population = parent_species.population * 3 // 4
        
        self.species.append(new_species)
        self.total_speciations += 1
        
        print(f"🌱 Spéciation: {new_common} (Year {self.environment.year})")

class SerinaVisualizer:
    """Interface graphique pour visualiser l'évolution de Serina"""
    def __init__(self, simulator):
        self.sim = simulator
        self.paused = False
        self.speed = 100  # ms entre les frames
        
        # Configuration de la figure
        self.fig = plt.figure(figsize=(20, 12))
        self.fig.suptitle('🌍 SERINA - World of Birds Evolution Simulator', fontsize=16, fontweight='bold')
        
        # Grille de sous-graphiques
        gs = self.fig.add_gridspec(3, 4, hspace=0.3, wspace=0.3)
        
        # Monde principal (grande zone)
        self.ax_world = self.fig.add_subplot(gs[0:2, 0:3])
        self.ax_world.set_title('🌍 Monde de Serina - Évolution en Temps Réel')
        self.ax_world.set_xlim(0, self.sim.environment.width)
        self.ax_world.set_ylim(0, self.sim.environment.height)
        self.ax_world.set_xlabel('Longitude')
        self.ax_world.set_ylabel('Latitude')
        
        # Biodiversité
        self.ax_biodiversity = self.fig.add_subplot(gs[0, 3])
        self.ax_biodiversity.set_title('📈 Biodiversité')
        self.ax_biodiversity.set_ylabel('Nombre d\'espèces')
        
        # Populations principales
        self.ax_populations = self.fig.add_subplot(gs[1, 3])
        self.ax_populations.set_title('👥 Top Populations')
        self.ax_populations.set_ylabel('Population')
        
        # Informations temporelles
        self.ax_info = self.fig.add_subplot(gs[2, :])
        self.ax_info.set_title('⏰ Informations Temporelles et Événements')
        self.ax_info.axis('off')
        
        # Textes d'information
        self.info_texts = []
        
        # Animation
        self.animation = animation.FuncAnimation(
            self.fig, self.update_frame, interval=self.speed, blit=False
        )
        
        # Contrôles clavier
        self.fig.canvas.mpl_connect('key_press_event', self.on_key_press)
        
    def update_frame(self, frame):
        """Met à jour un frame de l'animation"""
        if not self.paused:
            # Avancer la simulation
            if not self.sim.step():
                print("🌍 Simulation terminée - Toutes les espèces ont disparu")
                self.animation.event_source.stop()
                return
        
        # Nettoyer les graphiques
        self.ax_world.clear()
        self.ax_biodiversity.clear()
        self.ax_populations.clear()
        self.ax_info.clear()
        
        # Dessiner le monde
        self.draw_world()
        
        # Dessiner les espèces
        self.draw_species()
        
        # Graphiques statistiques
        self.draw_biodiversity()
        self.draw_populations()
        
        # Informations
        self.draw_info()
        
    def draw_world(self):
        """Dessine l'environnement du monde"""
        self.ax_world.set_xlim(0, self.sim.environment.width)
        self.ax_world.set_ylim(0, self.sim.environment.height)
        self.ax_world.set_title(f'🌍 Monde de Serina - Année {self.sim.environment.year} - {self.sim.environment.era}')
        
        # Fond selon la température et humidité
        temp = self.sim.environment.temperature
        rain = self.sim.environment.rainfall
        
        if temp > 0.7 and rain > 0.7:
            bg_color = 'darkgreen'  # Forêt tropicale
        elif temp > 0.6 and rain < 0.4:
            bg_color = 'yellow'     # Savane
        elif temp < 0.4:
            bg_color = 'lightblue'  # Climat froid
        else:
            bg_color = 'lightgreen' # Prairie tempérée
            
        self.ax_world.set_facecolor(bg_color)
        
        # Ajouter des éléments géographiques
        # Rivières (zones humides)
        for i in range(3):
            x = random.randint(0, self.sim.environment.width)
            river = Rectangle((x-2, 0), 4, self.sim.environment.height, 
                            color='blue', alpha=0.3)
            self.ax_world.add_patch(river)
            
    def draw_species(self):
        """Dessine toutes les espèces sur la carte"""
        type_symbols = {
            'bird': 'o',
            'fish': 's', 
            'arthropod': '^',
            'mollusk': 'D',
            'crustacean': 'v',
            'worm': '_',
            'cnidarian': '*'
        }
        
        for species in self.sim.species:
            # Taille du point proportionnelle à la population (log scale)
            size = max(20, min(200, np.log10(species.population + 1) * 30))
            
            # Couleur selon la fitness
            alpha = max(0.3, species.fitness)
            
            symbol = type_symbols.get(species.biological_type, 'o')
            
            scatter = self.ax_world.scatter(
                species.x, species.y, 
                s=size, 
                c=species.color, 
                marker=symbol,
                alpha=alpha,
                edgecolors='black',
                linewidth=1
            )
            
            # Étiquette pour les espèces importantes
            if species.population > 500 or len(species.innovations) > 0:
                self.ax_world.annotate(
                    species.common_name[:15], 
                    (species.x, species.y),
                    xytext=(5, 5), 
                    textcoords='offset points',
                    fontsize=8,
                    bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.7)
                )
                
    def draw_biodiversity(self):
        """Graphique de biodiversité dans le temps"""
        if len(self.sim.biodiversity_history) > 1:
            years = list(range(len(self.sim.biodiversity_history)))
            self.ax_biodiversity.plot(years, self.sim.biodiversity_history, 'g-', linewidth=2)
            self.ax_biodiversity.fill_between(years, self.sim.biodiversity_history, alpha=0.3, color='green')
            
        self.ax_biodiversity.set_title(f'📈 Biodiversité: {len(self.sim.species)} espèces')
        self.ax_biodiversity.set_ylabel('Nombre d\'espèces')
        self.ax_biodiversity.grid(True, alpha=0.3)
        
    def draw_populations(self):
        """Graphique des populations principales"""
        if self.sim.species:
            # Top 5 des espèces par population
            top_species = sorted(self.sim.species, key=lambda s: s.population, reverse=True)[:5]
            
            names = [s.common_name[:10] for s in top_species]
            populations = [s.population for s in top_species]
            colors = [s.color for s in top_species]
            
            bars = self.ax_populations.bar(names, populations, color=colors, alpha=0.7)
            self.ax_populations.set_title('👥 Top 5 Populations')
            self.ax_populations.set_ylabel('Population')
            plt.setp(self.ax_populations.get_xticklabels(), rotation=45, ha='right')
            
            # Ajouter les valeurs sur les barres
            for bar, pop in zip(bars, populations):
                height = bar.get_height()
                self.ax_populations.text(bar.get_x() + bar.get_width()/2., height,
                                       f'{pop}', ha='center', va='bottom', fontsize=8)
        
    def draw_info(self):
        """Panneau d'informations"""
        self.ax_info.axis('off')
        
        # Informations environnementales
        env = self.sim.environment
        info_text = f"""
⏰ TEMPS: Année {env.year}, Jour {env.day} | 🌡️ Température: {env.temperature:.1f} | 🌧️ Précipitations: {env.rainfall:.1f}
🌍 ÈRE: {env.era}
📊 ÉVOLUTION: {len(self.sim.species)} espèces vivantes | 💀 {self.sim.total_extinctions} extinctions | 🌱 {self.sim.total_speciations} spéciations

🔬 INNOVATIONS RÉCENTES: """
        
        # Innovations récentes
        recent_innovations = []
        for species in self.sim.species:
            if species.innovations:
                recent_innovations.extend([(species.common_name, inn) for inn in species.innovations[-1:]])
        
        if recent_innovations:
            info_text += " | ".join([f"{name}: {inn}" for name, inn in recent_innovations[-3:]])
        else:
            info_text += "Aucune innovation majeure récente"
            
        # Événements climatiques récents
        if env.climate_events:
            recent_event = env.climate_events[-1]
            info_text += f"\n🌪️ DERNIER ÉVÉNEMENT: {recent_event['type']} (Année {recent_event['year']})"
            
        # Contrôles
        info_text += "\n\n⌨️ CONTRÔLES: [ESPACE] Pause/Lecture | [+/-] Vitesse | [R] Redémarrer | [Q] Quitter"
        
        self.ax_info.text(0.05, 0.5, info_text, transform=self.ax_info.transAxes, 
                         fontsize=10, verticalalignment='center',
                         bbox=dict(boxstyle='round,pad=0.5', facecolor='lightgray', alpha=0.8))
                         
    def on_key_press(self, event):
        """Gestion des contrôles clavier"""
        if event.key == ' ':  # Espace - Pause/Play
            self.paused = not self.paused
            print(f"🎮 {'Pause' if self.paused else 'Lecture'}")
            
        elif event.key == '+' or event.key == '=':  # Augmenter vitesse
            self.speed = max(50, self.speed - 50)
            self.animation.event_source.interval = self.speed
            print(f"⚡ Vitesse augmentée: {self.speed}ms")
            
        elif event.key == '-':  # Diminuer vitesse
            self.speed = min(1000, self.speed + 50)
            self.animation.event_source.interval = self.speed
            print(f"🐌 Vitesse diminuée: {self.speed}ms")
            
        elif event.key == 'r':  # Redémarrer
            self.__init__(SerinaSimulator())
            print("🔄 Simulation redémarrée")
            
        elif event.key == 'q':  # Quitter
            plt.close('all')
            print("👋 Simulation fermée")

def main():
    """Fonction principale"""
    print("🌍 ===============================================")
    print("🌍 SERINA - World of Birds Evolution Simulator")
    print("🌍 ===============================================")
    print("🎯 Simulateur d'évolution autonome inspiré de")
    print("   'Serina - A Natural History of the World of Birds'")
    print("🧬 Observez l'évolution de 20 espèces originales")
    print("   sur des millions d'années d'évolution")
    print("⚡ Mutations, adaptations, spéciations en temps réel")
    print("🌍 ===============================================\n")
    
    try:
        # Créer le simulateur
        print("🧬 Initialisation du simulateur...")
        simulator = SerinaSimulator()
        print(f"✅ {len(simulator.species)} espèces originales chargées")
        
        # Créer l'interface graphique
        print("🖥️ Lancement de l'interface graphique...")
        visualizer = SerinaVisualizer(simulator)
        print("✅ Interface prête")
        
        print("\n🚀 === SIMULATION EN COURS ===")
        print("⌨️ Contrôles disponibles:")
        print("   [ESPACE] - Pause/Lecture")
        print("   [+/-] - Ajuster la vitesse")
        print("   [R] - Redémarrer")
        print("   [Q] - Quitter")
        print("🌍 Fermez la fenêtre pour arrêter\n")
        
        # Démarrer la simulation
        plt.show()
        
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrompue par l'utilisateur")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        print("🌍 Merci d'avoir exploré le monde de Serina !")

if __name__ == "__main__":
    main()