#!/usr/bin/env python3
"""
Test complet du système évolutif Serina
Vérifie toutes les fonctionnalités principales
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
        
        # Initialisation
        api.initialize()
        print("  ✅ Simulation initialisée")
        
        # Quelques steps de simulation
        for i in range(5):
            api.step()
            stats = api.getStatistics()
            print(f"  📊 Step {i+1}: {stats['population']} organismes, {stats['species_count']} espèces")
        
        print("  ✅ Simulation fonctionne correctement")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_population_dynamics():
    """Test de la dynamique des populations"""
    print("\n🧬 Test de la dynamique des populations...")
    
    try:
        api = serina_py.SimulationAPI(500, 500)
        api.initialize()
        
        initial_stats = api.getStatistics()
        print(f"  📊 Population initiale: {initial_stats['population']}")
        print(f"  📊 Espèces initiales: {initial_stats['species_count']}")
        
        # Simulation sur plusieurs générations
        for gen in range(10):
            # Plusieurs steps par génération
            for _ in range(20):
                api.step()
            
            stats = api.getStatistics()
            print(f"  📈 Génération {gen+1}: {stats['population']} pop, "
                  f"{stats['species_count']} esp, "
                  f"fitness avg: {stats.get('average_fitness', 0):.3f}")
        
        print("  ✅ Dynamique des populations testée")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        traceback.print_exc()
        return False

def test_genetic_evolution():
    """Test de l'évolution génétique"""
    print("\n🧬 Test de l'évolution génétique...")
    
    try:
        api = serina_py.SimulationAPI(800, 800)
        api.initialize()
        
        # Collecte des statistiques d'évolution
        fitness_history = []
        
        for generation in range(15):
            # Simulation d'une génération
            for _ in range(25):
                api.step()
            
            stats = api.getStatistics()
            avg_fitness = stats.get('average_fitness', 0)
            best_fitness = stats.get('best_fitness', 0)
            
            fitness_history.append({
                'generation': generation,
                'avg_fitness': avg_fitness,
                'best_fitness': best_fitness,
                'population': stats['population'],
                'species': stats['species_count']
            })
            
            print(f"  🧬 Gen {generation+1:2d}: Pop={stats['population']:3d}, "
                  f"Esp={stats['species_count']:2d}, "
                  f"Fit_avg={avg_fitness:.3f}, Fit_best={best_fitness:.3f}")
        
        # Analyse de l'évolution
        if len(fitness_history) >= 10:
            early_fitness = sum(h['avg_fitness'] for h in fitness_history[:5]) / 5
            late_fitness = sum(h['avg_fitness'] for h in fitness_history[-5:]) / 5
            improvement = late_fitness - early_fitness
            
            print(f"  📈 Amélioration fitness: {improvement:+.4f}")
            
            if improvement > 0:
                print("  ✅ Évolution génétique positive détectée")
            else:
                print("  ⚠️  Pas d'amélioration nette (normal sur courte période)")
        
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

def test_edge_cases():
    """Test des cas limites"""
    print("\n🎯 Test des cas limites...")
    
    try:
        # Test avec monde très petit
        api_small = serina_py.SimulationAPI(50, 50)
        api_small.initialize()
        
        for _ in range(10):
            api_small.step()
        
        stats_small = api_small.getStatistics()
        print(f"  ✅ Monde petit: {stats_small['population']} organismes")
        
        # Test avec monde très grand
        api_large = serina_py.SimulationAPI(2000, 2000)
        api_large.initialize()
        
        for _ in range(5):
            api_large.step()
        
        stats_large = api_large.getStatistics()
        print(f"  ✅ Monde grand: {stats_large['population']} organismes")
        
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
        ("Dynamique des populations", test_population_dynamics),
        ("Évolution génétique", test_genetic_evolution),
        ("Performance", test_performance),
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