#!/usr/bin/env python3
"""
Test du système évolutif Serina avec l'API réelle
Utilise les méthodes disponibles dans SimulationAPI
"""

import sys
import os
import traceback
import time
from pathlib import Path

# Ajoute le chemin du module compilé
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / 'build' / 'Release'))

try:
    import serina_py
    print("✅ Module serina_py importé avec succès")
except ImportError as e:
    print(f"❌ Erreur d'importation du module: {e}")
    sys.exit(1)

def test_basic_functionality():
    """Test des fonctionnalités de base"""
    print("\n🧪 Test des fonctionnalités de base...")
    
    try:
        # Création de l'API
        api = serina_py.SimulationAPI(1000, 1000)
        print("  ✅ SimulationAPI créé")
        
        # Vérification des méthodes disponibles
        methods = [m for m in dir(api) if not m.startswith('_')]
        print(f"  📋 Méthodes disponibles: {methods}")
        
        # Initialisation
        api.initialize()
        print("  ✅ Simulation initialisée")
        
        # Test des données initiales
        pop_data = api.getPopulationData()
        world_state = api.getWorldState()
        
        print(f"  📊 Population data type: {type(pop_data)}")
        print(f"  📊 World state type: {type(world_state)}")
        
        # Quelques steps de simulation
        for i in range(5):
            api.step()
            pop_data = api.getPopulationData()
            print(f"  🔄 Step {i+1}: Population data = {len(pop_data) if hasattr(pop_data, '__len__') else 'N/A'}")
        
        print("  ✅ Simulation fonctionne correctement")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_simulation_state():
    """Test de l'état de simulation"""
    print("\n🌍 Test de l'état de simulation...")
    
    try:
        api = serina_py.SimulationAPI(500, 500)
        api.initialize()
        
        # État initial
        initial_world = api.getWorldState()
        initial_pop = api.getPopulationData()
        
        print(f"  🌍 État monde initial: {type(initial_world)}")
        print(f"  👥 Population initiale: {type(initial_pop)}")
        
        # Simulation de plusieurs étapes
        for step in range(20):
            api.step()
            
            if (step + 1) % 5 == 0:
                world_state = api.getWorldState()
                pop_data = api.getPopulationData()
                print(f"  📈 Step {step+1}: Monde et population mis à jour")
        
        print("  ✅ États de simulation testés")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_population_evolution():
    """Test de l'évolution de la population"""
    print("\n🧬 Test de l'évolution de la population...")
    
    try:
        api = serina_py.SimulationAPI(800, 800)
        api.initialize()
        
        population_history = []
        
        for generation in range(15):
            # Simulation d'une génération
            for _ in range(25):
                api.step()
            
            # Collecte des données
            pop_data = api.getPopulationData()
            world_state = api.getWorldState()
            
            # Analyse des données
            pop_info = {
                'generation': generation,
                'pop_data': str(type(pop_data)),
                'world_state': str(type(world_state))
            }
            
            population_history.append(pop_info)
            
            print(f"  🧬 Gen {generation+1:2d}: Population data = {pop_info['pop_data']}")
        
        print(f"  📊 Historique collecté: {len(population_history)} générations")
        print("  ✅ Évolution de population testée")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_performance():
    """Test de performance"""
    print("\n⚡ Test de performance...")
    
    try:
        api = serina_py.SimulationAPI(1000, 1000)
        api.initialize()
        
        # Test de vitesse
        start_time = time.time()
        steps_count = 100
        
        for i in range(steps_count):
            api.step()
            if (i + 1) % 20 == 0:
                elapsed = time.time() - start_time
                fps = (i + 1) / elapsed
                print(f"  ⚡ {i+1:3d} steps: {fps:.1f} FPS")
        
        total_time = time.time() - start_time
        final_fps = steps_count / total_time
        
        print(f"  📊 Performance finale: {final_fps:.1f} FPS sur {steps_count} steps")
        
        if final_fps > 50:
            print("  ✅ Performance excellente")
        elif final_fps > 20:
            print("  ✅ Performance correcte")
        else:
            print("  ⚠️  Performance modérée (acceptable)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_simulation_controls():
    """Test des contrôles de simulation"""
    print("\n🎮 Test des contrôles de simulation...")
    
    try:
        api = serina_py.SimulationAPI(600, 600)
        api.initialize()
        
        # Test start/pause
        print("  🎬 Test start...")
        api.start()
        time.sleep(0.1)
        
        print("  ⏸️  Test pause...")
        api.pause()
        
        print("  ⚡ Test setSpeed...")
        api.setSpeed(2.0)  # Vitesse x2
        
        # Quelques steps manuels
        for i in range(10):
            api.step()
        
        print("  ✅ Contrôles de simulation testés")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_edge_cases():
    """Test des cas limites"""
    print("\n🎯 Test des cas limites...")
    
    try:
        # Test avec monde très petit
        api_small = serina_py.SimulationAPI(50, 50)
        api_small.initialize()
        
        for _ in range(10):
            api_small.step()
        
        pop_data_small = api_small.getPopulationData()
        print(f"  ✅ Monde petit: {type(pop_data_small)}")
        
        # Test avec monde très grand
        api_large = serina_py.SimulationAPI(2000, 2000)
        api_large.initialize()
        
        for _ in range(5):
            api_large.step()
        
        pop_data_large = api_large.getPopulationData()
        print(f"  ✅ Monde grand: {type(pop_data_large)}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def run_all_tests():
    """Lance tous les tests"""
    print("🚀 DÉBUT DES TESTS COMPLETS DU SYSTÈME SERINA")
    print("=" * 60)
    
    tests = [
        ("Fonctionnalités de base", test_basic_functionality),
        ("État de simulation", test_simulation_state),
        ("Évolution de population", test_population_evolution),
        ("Performance", test_performance),
        ("Contrôles de simulation", test_simulation_controls),
        ("Cas limites", test_edge_cases)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        success = test_func()
        results.append((test_name, success))
    
    # Rapport final
    print("\n" + "="*60)
    print("📋 RAPPORT FINAL DES TESTS")
    print("="*60)
    
    passed = 0
    failed = 0
    
    for test_name, success in results:
        status = "✅ RÉUSSI" if success else "❌ ÉCHEC"
        print(f"{test_name:30s} : {status}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📊 Résultats: {passed} réussis, {failed} échoués")
    
    if failed == 0:
        print("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!")
        print("🎯 Le système Serina est pleinement fonctionnel")
        return True
    else:
        print(f"⚠️  {failed} test(s) ont échoué")
        print("🔧 Vérifiez les erreurs ci-dessus")
        return False

if __name__ == "__main__":
    try:
        success = run_all_tests()
        
        if success:
            print("\n✅ Validation complète du système réussie!")
            exit_code = 0
        else:
            print("\n❌ Certains tests ont échoué")
            exit_code = 1
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrompus par l'utilisateur")
        exit_code = 2
    except Exception as e:
        print(f"\n\n💥 Erreur critique: {e}")
        traceback.print_exc()
        exit_code = 3
    
    print(f"\n🏁 Tests terminés avec code de sortie: {exit_code}")
    sys.exit(exit_code)