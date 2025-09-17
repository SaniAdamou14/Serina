#!/usr/bin/env python3
"""
Test adapté de l'API Serina réelle
Teste uniquement SimulationAPI qui est exposée
"""

import sys
import os
import json

# Ajouter le répertoire python au path pour trouver le module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'Release'))

def test_complete_simulation():
    """Test complet de SimulationAPI"""
    print("🧪 Test de SimulationAPI")
    print("=" * 50)
    
    try:
        import serina_py
        print("✅ Module serina_py importé avec succès")
        
        # Créer une simulation
        print("\n🔧 Création de la simulation...")
        sim = serina_py.SimulationAPI(100, 80)
        sim.initialize()
        print("✅ Simulation 100x80 créée et initialisée")
        
        # Test de simulation sur plusieurs étapes
        print("\n⏳ Simulation de 10 étapes...")
        for i in range(10):
            sim.step()
            
            # Récupérer les données toutes les 3 étapes
            if i % 3 == 0:
                pop_data = sim.getPopulationData()
                world_state = sim.getWorldState()
                
                # Parser le JSON pour analyser
                try:
                    pop_json = json.loads(pop_data)
                    print(f"  Étape {i+1}: {len(pop_json.get('species', []))} espèces, "
                          f"population totale: {pop_json.get('totalPopulation', 0)}")
                except:
                    print(f"  Étape {i+1}: Données récupérées ({len(pop_data)} chars)")
        
        print("✅ 10 étapes de simulation complétées")
        
        # Test des contrôles de simulation
        print("\n🎮 Test des contrôles...")
        sim.setSpeed(2.0)
        print("✅ Vitesse réglée à 2.0x")
        
        sim.start()
        print("✅ Simulation démarrée")
        
        sim.pause()
        print("✅ Simulation mise en pause")
        
        # Analyse finale des données
        print("\n📊 Analyse finale...")
        final_pop_data = sim.getPopulationData()
        final_world_state = sim.getWorldState()
        
        try:
            pop_json = json.loads(final_pop_data)
            species_count = len(pop_json.get('species', []))
            total_pop = pop_json.get('totalPopulation', 0)
            generation = pop_json.get('generation', 0)
            
            print(f"  🧬 Espèces actives: {species_count}")
            print(f"  👥 Population totale: {total_pop}")
            print(f"  🔄 Génération: {generation}")
            
            if 'species' in pop_json:
                for species in pop_json['species'][:3]:  # Top 3 espèces
                    name = species.get('name', 'Unknown')
                    pop = species.get('population', 0)
                    energy = species.get('averageEnergy', 0)
                    print(f"    - {name}: {pop} individus, énergie moy: {energy:.1f}")
            
        except json.JSONDecodeError:
            print(f"  📄 Données brutes récupérées ({len(final_pop_data)} caractères)")
        
        print(f"  🌍 État du monde: {len(final_world_state)} caractères")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def performance_test():
    """Test de performance"""
    print("\n\n⚡ Test de performance")
    print("=" * 50)
    
    try:
        import time
        import serina_py
        
        # Test avec différentes tailles de monde
        sizes = [(50, 50), (100, 100), (200, 150)]
        
        for width, height in sizes:
            print(f"\n🧪 Test {width}x{height}...")
            
            start_time = time.time()
            sim = serina_py.SimulationAPI(width, height)
            sim.initialize()
            
            # 5 étapes de simulation
            for _ in range(5):
                sim.step()
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Récupérer les données finales
            pop_data = sim.getPopulationData()
            
            try:
                pop_json = json.loads(pop_data)
                total_pop = pop_json.get('totalPopulation', 0)
                species_count = len(pop_json.get('species', []))
            except:
                total_pop = "N/A"
                species_count = "N/A"
            
            fps = 5 / duration if duration > 0 else float('inf')
            
            print(f"  ⏱️  Temps: {duration:.3f}s pour 5 étapes ({fps:.1f} FPS)")
            print(f"  👥 Population: {total_pop}, Espèces: {species_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur de performance: {e}")
        return False

def main():
    """Fonction principale"""
    print("🌟 TESTS SERINA - API SIMPLIFIÉE")
    print("=" * 60)
    
    # Test principal
    test1_success = test_complete_simulation()
    
    # Test de performance
    test2_success = performance_test()
    
    # Résumé
    print("\n" + "=" * 60)
    print("📋 RÉSUMÉ")
    print("=" * 60)
    
    if test1_success:
        print("✅ Test fonctionnel: RÉUSSI")
    else:
        print("❌ Test fonctionnel: ÉCHEC")
    
    if test2_success:
        print("✅ Test de performance: RÉUSSI")
    else:
        print("❌ Test de performance: ÉCHEC")
    
    if test1_success and test2_success:
        print("\n🎉 TOUS LES TESTS ONT RÉUSSI!")
        print("\n🚀 Le système Serina est opérationnel!")
        return True
    else:
        print("\n⚠️  Certains tests ont échoué")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)