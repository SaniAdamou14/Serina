#!/usr/bin/env python3
"""
Debug de l'API Serina
"""

import sys
import os
import json

# Ajouter le répertoire python au path pour trouver le module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python', 'Release'))

def debug_api():
    """Debug de l'API"""
    print("🔧 Debug API Serina")
    
    try:
        import serina_py
        
        # Créer simulation
        sim = serina_py.SimulationAPI(50, 50)
        sim.initialize()
        
        # Une étape
        sim.step()
        
        # Récupérer les données
        pop_data = sim.getPopulationData()
        print("\n📊 Données JSON brutes:")
        print(pop_data)
        
        # Parser JSON
        try:
            data = json.loads(pop_data)
            print("\n📋 Données parsées:")
            print(f"Population totale: {data.get('totalPopulation', 'N/A')}")
            print(f"Génération: {data.get('generation', 'N/A')}")
            
            if 'species' in data:
                print(f"Nombre d'espèces: {len(data['species'])}")
                for i, species in enumerate(data['species']):
                    print(f"  Espèce {i+1}: {species}")
                    
        except json.JSONDecodeError as e:
            print(f"❌ Erreur JSON: {e}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_api()