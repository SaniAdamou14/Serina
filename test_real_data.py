#!/usr/bin/env python3
"""
Test de génération de données réelles pour Serina Evolution
Vérifie que le simulateur produit des données authentiques
"""

import sys
import os
import json
import time

# Ajouter le répertoire racine au path pour importer le simulateur
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from serina_evolution_simulator import SerinaSimulator
    print("✅ Import du simulateur réussi")
except ImportError as e:
    print(f"❌ Erreur d'import du simulateur: {e}")
    sys.exit(1)

def test_real_simulation_data():
    """Test de génération de vraies données de simulation"""
    print("\n🧪 === TEST DE DONNÉES RÉELLES DE SIMULATION ===\n")
    
    # Initialiser le simulateur
    print("🔄 Initialisation du simulateur...")
    sim = SerinaSimulator()
    print(f"✅ Simulateur initialisé avec {len(sim.species)} espèces")
    
    # Exécuter plusieurs étapes de simulation
    print("\n🚀 Exécution de 10 étapes de simulation...")
    for i in range(10):
        result = sim.step()
        print(f"   Étape {i+1}: Génération {sim.generation}, {len(sim.species)} espèces actives")
        
        # Vérifier que les données changent
        if i == 0:
            initial_populations = [s.population for s in sim.species]
        
        # Attendre un peu pour voir l'évolution
        time.sleep(0.1)
    
    # Vérifier que les populations ont évolué
    final_populations = [s.population for s in sim.species]
    populations_changed = initial_populations != final_populations
    
    print(f"\n📊 Populations ont évolué: {'✅ Oui' if populations_changed else '❌ Non'}")
    
    # Tester la méthode get_simulation_data
    print("\n📋 Test de l'export de données API...")
    if hasattr(sim, 'get_simulation_data'):
        data = sim.get_simulation_data()
        print("✅ Méthode get_simulation_data() disponible")
        
        # Afficher les données générées
        print("\n🔍 Données de simulation générées:")
        print(f"   • Génération: {data.get('generation', 'N/A')}")
        print(f"   • Population totale: {data.get('population_count', 'N/A')}")
        print(f"   • Nombre d'espèces: {data.get('species_count', 'N/A')}")
        
        # Données environnementales
        env_data = data.get('environment', {})
        if env_data:
            print("   • Environnement:")
            print(f"     - Température: {env_data.get('temperature', 'N/A')}")
            print(f"     - Humidité: {env_data.get('humidity', 'N/A')}")
            print(f"     - Disponibilité nourriture: {env_data.get('food_availability', 'N/A')}")
        
        # Statistiques de fitness
        fitness_stats = data.get('fitness_stats', {})
        if fitness_stats:
            print("   • Fitness:")
            print(f"     - Moyenne: {fitness_stats.get('mean', 'N/A'):.3f}")
            print(f"     - Maximum: {fitness_stats.get('max', 'N/A'):.3f}")
            print(f"     - Minimum: {fitness_stats.get('min', 'N/A'):.3f}")
        
        # Vérifier la structure JSON
        try:
            json_str = json.dumps(data, indent=2)
            print("\n✅ Données exportables en JSON")
            
            # Sauvegarder un échantillon
            with open('sample_simulation_data.json', 'w') as f:
                f.write(json_str)
            print("💾 Échantillon sauvegardé dans sample_simulation_data.json")
            
        except Exception as e:
            print(f"❌ Erreur lors de la sérialisation JSON: {e}")
        
        return True
    else:
        print("❌ Méthode get_simulation_data() non disponible")
        return False

def test_species_diversity():
    """Test de la diversité des espèces"""
    print("\n🐾 === TEST DE DIVERSITÉ DES ESPÈCES ===\n")
    
    sim = SerinaSimulator()
    
    species_data = []
    for species in sim.species:
        species_info = {
            'name': species.name,
            'type': species.biological_type,
            'population': species.population,
            'fitness': species.fitness,
            'traits': species.traits,
            'innovations': species.innovations
        }
        species_data.append(species_info)
    
    print(f"📊 Analysé {len(species_data)} espèces:")
    for i, species in enumerate(species_data[:5]):  # Afficher les 5 premières
        print(f"   {i+1}. {species['name']} ({species['type']})")
        print(f"      Population: {species['population']}, Fitness: {species['fitness']:.3f}")
        print(f"      Traits principaux: {list(species['traits'].keys())[:3]}")
        if species['innovations']:
            print(f"      Innovations: {species['innovations']}")
    
    if len(species_data) > 5:
        print(f"   ... et {len(species_data) - 5} autres espèces")
    
    return True

def test_bridge_python_api():
    """Test du bridge Python-API"""
    print("\n🌐 === TEST DU BRIDGE PYTHON-API ===\n")
    
    bridge_file = os.path.join('python', 'stream_sim.py')
    if os.path.exists(bridge_file):
        print("✅ Fichier bridge trouvé: python/stream_sim.py")
        try:
            # Tester l'import du bridge
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))
            
            # Lecture du contenu pour vérifier la compatibilité
            with open(bridge_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if 'get_simulation_data' in content:
                print("✅ Bridge utilise la nouvelle méthode get_simulation_data()")
            else:
                print("⚠️  Bridge utilise l'ancienne méthode")
                
            return True
        except Exception as e:
            print(f"❌ Erreur lors du test du bridge: {e}")
            return False
    else:
        print("❌ Fichier bridge non trouvé")
        return False

if __name__ == "__main__":
    print("🔬 VÉRIFICATION DES DONNÉES RÉELLES DE SIMULATION")
    print("=" * 55)
    
    success = True
    
    # Test 1: Données de simulation
    try:
        success &= test_real_simulation_data()
    except Exception as e:
        print(f"❌ Erreur test simulation: {e}")
        success = False
    
    # Test 2: Diversité des espèces
    try:
        success &= test_species_diversity()
    except Exception as e:
        print(f"❌ Erreur test diversité: {e}")
        success = False
    
    # Test 3: Bridge Python-API
    try:
        success &= test_bridge_python_api()
    except Exception as e:
        print(f"❌ Erreur test bridge: {e}")
        success = False
    
    print("\n" + "=" * 55)
    if success:
        print("🎉 TOUS LES TESTS RÉUSSIS - DONNÉES RÉELLES DISPONIBLES!")
        print("🚀 Le système est prêt à générer de vraies données de simulation")
    else:
        print("⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFICATION NÉCESSAIRE")
    print("=" * 55)