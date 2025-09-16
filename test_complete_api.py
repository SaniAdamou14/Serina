#!/usr/bin/env python3
"""
Test complet de l'API Serina après corrections
Valide toute l'intégration C++/Python
"""

import sys
import os
import traceback

# Ajouter le répertoire build au path pour trouver le module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'build', 'Release'))

def test_module_import():
    """Test d'importation du module Serina"""
    print("🔍 Test 1: Importation du module...")
    try:
        import serina_py
        print("✅ Module serina_py importé avec succès")
        return serina_py
    except ImportError as e:
        print(f"❌ Erreur d'importation: {e}")
        return None

def test_simulation_api(serina_py):
    """Test de l'API de simulation"""
    print("\n🔍 Test 2: API de simulation...")
    try:
        # Créer une simulation
        sim = serina_py.SimulationAPI(50, 50)
        sim.initialize()
        print("✅ SimulationAPI créée et initialisée")
        
        # Test des méthodes step
        sim.step()
        sim.step()
        print("✅ Méthodes step() fonctionnelles")
        
        # Test récupération de données
        population_data = sim.getPopulationData()
        world_state = sim.getWorldState()
        
        print(f"✅ Données de population récupérées: {len(population_data)} caractères")
        print(f"✅ État du monde récupéré: {len(world_state)} caractères")
        
        return True
    except Exception as e:
        print(f"❌ Erreur API de simulation: {e}")
        traceback.print_exc()
        return False

def test_genome_api(serina_py):
    """Test de l'API Genome"""
    print("\n🔍 Test 3: API Genome...")
    try:
        # Créer un génome
        genome = serina_py.Genome()
        print("✅ Genome créé")
        
        # Test des traits avec les vrais types
        size_trait = genome.getTrait(serina_py.TraitType.SIZE)
        speed_trait = genome.getTrait(serina_py.TraitType.SPEED)
        
        print(f"✅ Trait SIZE: {size_trait}")
        print(f"✅ Trait SPEED: {speed_trait}")
        
        # Test mutation
        genome.mutate(0.1)
        print("✅ Mutation appliquée")
        
        # Test crossover
        genome2 = serina_py.Genome()
        child = genome.crossover(genome2)
        print("✅ Crossover réalisé")
        
        # Test fitness
        fitness = genome.calculateFitness()
        print(f"✅ Fitness calculée: {fitness}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur API Genome: {e}")
        traceback.print_exc()
        return False

def test_species_api(serina_py):
    """Test de l'API Species"""
    print("\n🔍 Test 4: API Species...")
    try:
        # Créer un génome pour l'espèce
        genome = serina_py.Genome()
        
        # Créer une espèce
        species = serina_py.Species("TestSpecies", genome)
        print("✅ Species créée")
        
        # Test des propriétés
        name = species.getName()
        energy = species.getEnergy()
        
        print(f"✅ Nom de l'espèce: {name}")
        print(f"✅ Énergie: {energy}")
        
        # Test de survie
        survives = species.survives(50.0)
        print(f"✅ Test de survie (50.0): {survives}")
        
        # Test de reproduction
        genome2 = serina_py.Genome()
        partner = serina_py.Species("Partner", genome2)
        child = species.reproduce(partner)
        
        print(f"✅ Reproduction réussie, enfant: {child.getName()}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur API Species: {e}")
        traceback.print_exc()
        return False

def test_world_api(serina_py):
    """Test de l'API World"""
    print("\n🔍 Test 5: API World...")
    try:
        # Créer un monde
        world = serina_py.World(20, 15)
        print("✅ World créé")
        
        # Test des dimensions
        width = world.getWidth()
        height = world.getHeight()
        print(f"✅ Dimensions: {width}x{height}")
        
        # Test de mise à jour
        world.update(1.0)
        print("✅ Mise à jour du monde")
        
        # Test des ressources
        world.addResource(5, 5, "plants", 100.0)
        resource = world.getResource(5, 5, "plants")
        print(f"✅ Gestion des ressources: {resource}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur API World: {e}")
        traceback.print_exc()
        return False

def test_physics_engine(serina_py):
    """Test du moteur physique"""
    print("\n🔍 Test 6: Moteur physique...")
    try:
        # Créer le moteur physique
        bounds = serina_py.WorldBounds(0, 100, 0, 100)
        physics = serina_py.PhysicsEngine(-9.81, bounds)
        print("✅ PhysicsEngine créé")
        
        # Test des propriétés
        gravity = physics.getGravity()
        print(f"✅ Gravité: {gravity}")
        
        # Test des entités
        entity1 = serina_py.Entity(10, 10, 2.0, 1.0, 1)
        entity2 = serina_py.Entity(15, 10, 2.0, 1.0, 2)
        
        # Test collision
        collision = physics.checkCollision(entity1, entity2)
        print(f"✅ Test de collision: {collision}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur moteur physique: {e}")
        traceback.print_exc()
        return False

def main():
    """Fonction principale de test"""
    print("=" * 60)
    print("🧪 TESTS COMPLETS DE L'API SERINA")
    print("=" * 60)
    
    # Import du module
    serina_py = test_module_import()
    if not serina_py:
        print("\n❌ ÉCHEC: Impossible d'importer le module")
        return False
    
    # Tests individuels
    tests = [
        ("API de simulation", lambda: test_simulation_api(serina_py)),
        ("API Genome", lambda: test_genome_api(serina_py)),
        ("API Species", lambda: test_species_api(serina_py)),
        ("API World", lambda: test_world_api(serina_py)),
        ("Moteur physique", lambda: test_physics_engine(serina_py)),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Erreur critique dans {test_name}: {e}")
            results.append((test_name, False))
    
    # Résumé des résultats
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSÉ" if result else "❌ ÉCHEC"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nRésultat global: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 TOUS LES TESTS ONT RÉUSSI!")
        return True
    else:
        print("⚠️  Certains tests ont échoué")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)