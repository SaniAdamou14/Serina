import requests
import json
import time

def test_api_endpoints():
    """Test les endpoints de l'API Serina"""
    base_url = "http://localhost:3001"
    
    print("🔬 === TEST DES ENDPOINTS API SERINA ===\n")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check: API accessible")
            print(f"   Status: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Impossible de contacter l'API: {e}")
        return False
    
    # Test 2: Espèces
    try:
        response = requests.get(f"{base_url}/api/species", timeout=10)
        if response.status_code == 200:
            species_data = response.json()
            print(f"✅ Endpoint /api/species: {len(species_data)} espèces trouvées")
            if species_data:
                print(f"   Exemple: {species_data[0].get('name', 'N/A')}")
        else:
            print(f"⚠️  Endpoint /api/species: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur /api/species: {e}")
    
    # Test 3: Simulation status
    try:
        response = requests.get(f"{base_url}/api/simulation/status", timeout=10)
        if response.status_code == 200:
            sim_data = response.json()
            print(f"✅ Endpoint /api/simulation/status: Simulation active")
            print(f"   Génération: {sim_data.get('generation', 'N/A')}")
            print(f"   État: {sim_data.get('status', 'N/A')}")
        else:
            print(f"⚠️  Endpoint /api/simulation/status: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur /api/simulation/status: {e}")
    
    # Test 4: Démarrer une simulation
    try:
        sim_config = {
            "populationSize": 100,
            "mutationRate": 0.1,
            "maxGenerations": 50
        }
        response = requests.post(f"{base_url}/api/simulation/start", 
                               json=sim_config, timeout=10)
        if response.status_code in [200, 201]:
            print("✅ Démarrage de simulation: Succès")
            sim_result = response.json()
            if 'simulationId' in sim_result:
                print(f"   ID Simulation: {sim_result['simulationId']}")
        else:
            print(f"⚠️  Démarrage simulation: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur démarrage simulation: {e}")
    
    # Test 5: Données en temps réel
    try:
        response = requests.get(f"{base_url}/api/simulation/live-data", timeout=10)
        if response.status_code == 200:
            live_data = response.json()
            print("✅ Données en temps réel disponibles")
            print(f"   Population totale: {live_data.get('totalPopulation', 'N/A')}")
            print(f"   Espèces actives: {live_data.get('activeSpecies', 'N/A')}")
        else:
            print(f"⚠️  Données temps réel: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur données temps réel: {e}")
    
    return True

if __name__ == "__main__":
    print("⏳ Attendez que l'API soit démarrée...")
    time.sleep(3)  # Attendre un peu pour que l'API soit prête
    
    test_api_endpoints()
    
    print("\n🌐 Interface Web disponible sur:")
    print("   http://localhost:3000")
    print("\n📡 API Documentation:")
    print("   http://localhost:3001/api-docs")
    print("\n🔗 Endpoints testés:")
    print("   http://localhost:3001/health")
    print("   http://localhost:3001/api/species")
    print("   http://localhost:3001/api/simulation/status")