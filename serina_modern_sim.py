#!/usr/bin/env python3
"""
Serina Ecosystem Simulation - Interface Python moderne
Connecté aux composants C++ corrigés
"""

import sys
import os
import time
import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle, Rectangle
import seaborn as sns
from dataclasses import dataclass
from typing import List, Dict, Tuple
import threading
import subprocess

# Configuration de style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

@dataclass
class Species:
    """Représentation d'une espèce dans la simulation"""
    name: str
    population: int
    energy: float
    x: float
    y: float
    size: float
    speed: float
    intelligence: float
    color: str
    biological_type: str

@dataclass
class Environment:
    """Environnement de simulation"""
    name: str
    temperature: float
    humidity: float
    resources: float
    color: str

class SerinaSimulationInterface:
    """Interface Python pour le simulateur C++ Serina"""
    
    def __init__(self):
        self.species_data = []
        self.environments = []
        self.generation = 0
        self.total_population = 0
        self.biodiversity = 0
        self.ecosystem_stability = 1.0
        
        # Histoire des données pour graphiques
        self.population_history = []
        self.biodiversity_history = []
        self.stability_history = []
        self.generation_history = []
        
        # Initialiser les données de base
        self._initialize_serina_data()
    
    def _initialize_serina_data(self):
        """Initialise les données basées sur le système C++ corrigé"""
        # Espèces de Serina (basées sur SerinaEcosystem.hpp)
        serina_species = [
            Species("Canari domestique", 25, 85.0, 40, 30, 1.2, 2.0, 1.8, "#FFD700", "Oiseau"),
            Species("Guppy", 30, 70.0, 20, 45, 0.8, 3.0, 1.2, "#00CED1", "Poisson"),
            Species("Platy", 28, 75.0, 22, 47, 0.9, 2.8, 1.3, "#FF6347", "Poisson"),
            Species("Grillon", 45, 60.0, 35, 25, 0.5, 1.5, 0.8, "#228B22", "Arthropode"),
            Species("Fourmi", 50, 55.0, 50, 20, 0.3, 2.0, 1.5, "#8B4513", "Arthropode"),
            Species("Coccinelle", 20, 65.0, 45, 35, 0.4, 1.8, 1.0, "#DC143C", "Arthropode"),
            Species("Collembole", 60, 40.0, 30, 15, 0.2, 1.2, 0.6, "#DDA0DD", "Arthropode"),
            Species("Écrevisse", 15, 80.0, 25, 50, 2.0, 1.5, 1.4, "#FF4500", "Crustacé"),
            Species("Crevette", 35, 50.0, 28, 52, 1.0, 2.5, 1.1, "#FFA500", "Crustacé"),
            Species("Ver de terre", 40, 45.0, 38, 18, 1.5, 0.8, 0.7, "#A0522D", "Annélide"),
            Species("Escargot", 18, 70.0, 42, 28, 1.3, 0.6, 0.9, "#DEB887", "Mollusque"),
            Species("Limace", 22, 55.0, 40, 25, 1.1, 0.7, 0.8, "#F0E68C", "Mollusque"),
            Species("Hydre", 25, 60.0, 15, 55, 0.5, 0.5, 0.5, "#98FB98", "Cnidaire"),
            Species("Méduse", 12, 65.0, 10, 58, 1.8, 2.0, 0.6, "#E6E6FA", "Cnidaire"),
        ]
        
        self.species_data = serina_species
        self.total_population = sum(s.population for s in self.species_data)
        self.biodiversity = len(self.species_data)
        
        # Environnements de Serina
        self.environments = [
            Environment("Prairie", 22.0, 0.6, 0.8, "#90EE90"),
            Environment("Forêt", 18.0, 0.8, 0.9, "#228B22"),
            Environment("Eau douce", 16.0, 1.0, 0.7, "#87CEEB"),
            Environment("Océan", 14.0, 1.0, 0.6, "#4682B4"),
            Environment("Zone humide", 20.0, 0.9, 0.85, "#20B2AA"),
        ]
    
    def update_simulation(self):
        """Met à jour la simulation (simule l'évolution)"""
        self.generation += 1
        
        # Simulation de changements évolutionnaires
        for species in self.species_data:
            # Mutation aléatoire
            if np.random.random() < 0.05:  # 5% chance de mutation
                species.energy += np.random.normal(0, 2)
                species.size += np.random.normal(0, 0.1)
                species.speed += np.random.normal(0, 0.1)
                species.intelligence += np.random.normal(0, 0.05)
                
                # Maintenir les limites
                species.energy = max(10, min(100, species.energy))
                species.size = max(0.1, min(5.0, species.size))
                species.speed = max(0.1, min(5.0, species.speed))
                species.intelligence = max(0.1, min(3.0, species.intelligence))
            
            # Changement de population basé sur l'énergie
            fitness = species.energy / 100.0
            if fitness > 0.7:
                species.population += np.random.randint(0, 3)
            elif fitness < 0.3:
                species.population -= np.random.randint(0, 2)
            
            species.population = max(0, species.population)
            
            # Mouvement aléatoire
            species.x += np.random.normal(0, species.speed * 0.5)
            species.y += np.random.normal(0, species.speed * 0.5)
            species.x = max(5, min(75, species.x))
            species.y = max(5, min(55, species.y))
        
        # Supprimer les espèces éteintes
        self.species_data = [s for s in self.species_data if s.population > 0]
        
        # Mettre à jour les statistiques
        self.total_population = sum(s.population for s in self.species_data)
        self.biodiversity = len(self.species_data)
        self.ecosystem_stability = min(1.0, self.biodiversity / 14.0)
        
        # Enregistrer l'historique
        self.generation_history.append(self.generation)
        self.population_history.append(self.total_population)
        self.biodiversity_history.append(self.biodiversity)
        self.stability_history.append(self.ecosystem_stability)
        
        # Garder seulement les 100 derniers points
        if len(self.generation_history) > 100:
            self.generation_history.pop(0)
            self.population_history.pop(0)
            self.biodiversity_history.pop(0)
            self.stability_history.pop(0)

class SerinaVisualizer:
    """Visualiseur moderne pour la simulation Serina"""
    
    def __init__(self):
        self.sim = SerinaSimulationInterface()
        self.running = False
        
        # Configuration de la figure
        self.fig = plt.figure(figsize=(18, 12))
        self.fig.suptitle('🌍 Simulation Serina - Écosystème Évolutionnaire', fontsize=16, fontweight='bold')
        
        # Grille de sous-graphiques
        gs = self.fig.add_gridspec(3, 4, hspace=0.3, wspace=0.3)
        
        # Monde principal (plus grand)
        self.ax_world = self.fig.add_subplot(gs[0:2, 0:2])
        self.ax_world.set_title('🌍 Monde de Serina - Vue Live', fontsize=14, fontweight='bold')
        self.ax_world.set_xlim(0, 80)
        self.ax_world.set_ylim(0, 60)
        self.ax_world.set_xlabel('Position X')
        self.ax_world.set_ylabel('Position Y')
        
        # Graphique population
        self.ax_pop = self.fig.add_subplot(gs[0, 2])
        self.ax_pop.set_title('📊 Population Totale')
        self.ax_pop.set_xlabel('Génération')
        self.ax_pop.set_ylabel('Individus')
        
        # Graphique biodiversité
        self.ax_bio = self.fig.add_subplot(gs[0, 3])
        self.ax_bio.set_title('🌱 Biodiversité')
        self.ax_bio.set_xlabel('Génération')
        self.ax_bio.set_ylabel('Espèces')
        
        # Graphique stabilité
        self.ax_stab = self.fig.add_subplot(gs[1, 2])
        self.ax_stab.set_title('⚖️ Stabilité Écosystème')
        self.ax_stab.set_xlabel('Génération')
        self.ax_stab.set_ylabel('Stabilité')
        
        # Statistiques des espèces
        self.ax_stats = self.fig.add_subplot(gs[1, 3])
        self.ax_stats.set_title('📈 Top Espèces')
        
        # Informations détaillées
        self.ax_info = self.fig.add_subplot(gs[2, 0:2])
        self.ax_info.set_title('📋 Informations Détaillées')
        self.ax_info.axis('off')
        
        # Contrôles environnementaux
        self.ax_env = self.fig.add_subplot(gs[2, 2:])
        self.ax_env.set_title('🌡️ Environnements de Serina')
        
        # Initialisation des graphiques
        self._setup_plots()
        
    def _setup_plots(self):
        """Configure les graphiques initiaux"""
        # Dessiner les environnements de fond
        env_zones = [
            (0, 0, 25, 60, "#90EE90", "Prairie"),      # Prairie
            (25, 0, 25, 30, "#228B22", "Forêt"),       # Forêt  
            (50, 0, 30, 25, "#87CEEB", "Eau douce"),   # Eau douce
            (50, 25, 30, 35, "#4682B4", "Océan"),      # Océan
            (25, 30, 25, 30, "#20B2AA", "Zone humide") # Zone humide
        ]
        
        for x, y, w, h, color, name in env_zones:
            rect = Rectangle((x, y), w, h, facecolor=color, alpha=0.3, edgecolor='black', linewidth=1)
            self.ax_world.add_patch(rect)
            self.ax_world.text(x + w/2, y + h/2, name, ha='center', va='center', 
                             fontsize=8, fontweight='bold', alpha=0.7)
    
    def animate(self, frame):
        """Fonction d'animation appelée à chaque frame"""
        if not self.running:
            return
            
        # Mettre à jour la simulation
        self.sim.update_simulation()
        
        # Nettoyer les graphiques
        self.ax_world.clear()
        self.ax_pop.clear()
        self.ax_bio.clear()
        self.ax_stab.clear()
        self.ax_stats.clear()
        self.ax_info.clear()
        self.ax_env.clear()
        
        # Reconfigurer les graphiques
        self._setup_plots()
        self._update_world()
        self._update_charts()
        self._update_info()
        self._update_environment_info()
        
        return []
    
    def _update_world(self):
        """Met à jour la vue du monde"""
        self.ax_world.set_title(f'🌍 Monde de Serina - Génération {self.sim.generation}', 
                               fontsize=14, fontweight='bold')
        self.ax_world.set_xlim(0, 80)
        self.ax_world.set_ylim(0, 60)
        self.ax_world.set_xlabel('Position X')
        self.ax_world.set_ylabel('Position Y')
        
        # Dessiner les espèces
        for species in self.sim.species_data:
            size = max(50, species.size * 100)  # Taille du point
            alpha = min(1.0, species.population / 50.0)  # Transparence selon population
            
            self.ax_world.scatter(species.x, species.y, s=size, c=species.color, 
                                alpha=alpha, edgecolors='black', linewidth=1)
            
            # Étiquette si population significative
            if species.population > 10:
                self.ax_world.annotate(f'{species.name[:8]}\n({species.population})', 
                                     (species.x, species.y), xytext=(5, 5), 
                                     textcoords='offset points', fontsize=8,
                                     bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.7))
    
    def _update_charts(self):
        """Met à jour les graphiques de données"""
        if len(self.sim.generation_history) > 1:
            # Population
            self.ax_pop.plot(self.sim.generation_history, self.sim.population_history, 
                           'b-', linewidth=2, marker='o', markersize=4)
            self.ax_pop.set_title('📊 Population Totale')
            self.ax_pop.set_xlabel('Génération')
            self.ax_pop.set_ylabel('Individus')
            self.ax_pop.grid(True, alpha=0.3)
            
            # Biodiversité
            self.ax_bio.plot(self.sim.generation_history, self.sim.biodiversity_history, 
                           'g-', linewidth=2, marker='s', markersize=4)
            self.ax_bio.set_title('🌱 Biodiversité')
            self.ax_bio.set_xlabel('Génération')
            self.ax_bio.set_ylabel('Espèces')
            self.ax_bio.grid(True, alpha=0.3)
            
            # Stabilité
            self.ax_stab.plot(self.sim.generation_history, self.sim.stability_history, 
                            'r-', linewidth=2, marker='^', markersize=4)
            self.ax_stab.set_title('⚖️ Stabilité Écosystème')
            self.ax_stab.set_xlabel('Génération')
            self.ax_stab.set_ylabel('Stabilité')
            self.ax_stab.set_ylim(0, 1)
            self.ax_stab.grid(True, alpha=0.3)
        
        # Top espèces (barres)
        if self.sim.species_data:
            top_species = sorted(self.sim.species_data, key=lambda x: x.population, reverse=True)[:5]
            names = [s.name[:10] for s in top_species]
            pops = [s.population for s in top_species]
            colors = [s.color for s in top_species]
            
            bars = self.ax_stats.barh(names, pops, color=colors, alpha=0.7)
            self.ax_stats.set_title('📈 Top 5 Espèces')
            self.ax_stats.set_xlabel('Population')
            
            # Ajouter les valeurs sur les barres
            for bar, pop in zip(bars, pops):
                self.ax_stats.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2, 
                                 str(pop), va='center', fontsize=9)
    
    def _update_info(self):
        """Met à jour les informations détaillées"""
        self.ax_info.clear()
        self.ax_info.axis('off')
        self.ax_info.set_title('📋 Informations Détaillées', fontsize=12, fontweight='bold')
        
        info_text = f"""
🔬 STATISTIQUES GLOBALES
• Génération actuelle: {self.sim.generation}
• Population totale: {self.sim.total_population} individus
• Biodiversité: {self.sim.biodiversity} espèces
• Stabilité écosystème: {self.sim.ecosystem_stability:.2%}

🧬 ÉVOLUTION RÉCENTE
• Espèces actives: {len(self.sim.species_data)}
• Mutations par génération: ~5%
• Pression sélective: Énergie + Population

🌍 ENVIRONNEMENTS
• Prairie: Canaris, Grillons
• Forêt: Arthropodes, Oiseaux  
• Aquatique: Poissons, Crustacés
• Zones humides: Espèces amphibies
        """
        
        self.ax_info.text(0.05, 0.95, info_text, transform=self.ax_info.transAxes, 
                         fontsize=10, verticalalignment='top', fontfamily='monospace',
                         bbox=dict(boxstyle='round,pad=0.5', facecolor='lightblue', alpha=0.3))
    
    def _update_environment_info(self):
        """Met à jour les informations environnementales"""
        self.ax_env.clear()
        self.ax_env.set_title('🌡️ Conditions Environnementales', fontsize=12, fontweight='bold')
        
        # Graphique en barres des conditions environnementales
        env_names = [env.name for env in self.sim.environments]
        temperatures = [env.temperature for env in self.sim.environments]
        resources = [env.resources for env in self.sim.environments]
        
        x = np.arange(len(env_names))
        width = 0.35
        
        bars1 = self.ax_env.bar(x - width/2, temperatures, width, label='Température (°C)', alpha=0.7)
        bars2 = self.ax_env.bar(x + width/2, [r*30 for r in resources], width, label='Ressources (×30)', alpha=0.7)
        
        self.ax_env.set_xlabel('Environnements')
        self.ax_env.set_ylabel('Valeur')
        self.ax_env.set_xticks(x)
        self.ax_env.set_xticklabels(env_names, rotation=45, ha='right')
        self.ax_env.legend()
        self.ax_env.grid(True, alpha=0.3)
    
    def start_simulation(self):
        """Démarre la simulation avec animation"""
        self.running = True
        print("🚀 Démarrage de la simulation Serina...")
        print("📊 Interface graphique initialisée")
        print("🔄 Animation en cours... Fermez la fenêtre pour arrêter.")
        
        # Animation
        self.anim = animation.FuncAnimation(self.fig, self.animate, interval=500, blit=False)
        
        # Boutons de contrôle
        self.fig.canvas.mpl_connect('key_press_event', self._on_key_press)
        
        plt.show()
    
    def _on_key_press(self, event):
        """Gestion des touches de contrôle"""
        if event.key == ' ':  # Espace pour pause/play
            self.running = not self.running
            print(f"⏯️ Simulation {'reprise' if self.running else 'en pause'}")
        elif event.key == 'r':  # R pour redémarrer
            self.__init__()
            print("🔄 Simulation redémarrée")

def main():
    """Fonction principale"""
    print("🌍 === SERINA ECOSYSTEM SIMULATION ===")
    print("🎯 Système évolutionnaire intégré C++/Python")
    print("📊 Interface graphique moderne avec Matplotlib")
    print("=" * 50)
    
    try:
        # Créer et démarrer le visualiseur
        visualizer = SerinaVisualizer()
        
        print("\n🚀 CONTRÔLES:")
        print("• ESPACE: Pause/Reprendre")
        print("• R: Redémarrer la simulation")
        print("• Fermer la fenêtre: Quitter")
        print("\n🔄 Lancement de l'interface graphique...")
        
        visualizer.start_simulation()
        
    except KeyboardInterrupt:
        print("\n⏹️ Simulation arrêtée par l'utilisateur")
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
    finally:
        print("🏁 Simulation terminée")

if __name__ == "__main__":
    main()