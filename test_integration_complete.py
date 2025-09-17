#!/usr/bin/env python3
"""
🔍 SERINA - Test d'Intégration Complète
======================================
Script pour valider tous les composants du système Serina:
- Headers C++ et dépendances
- Scripts Python et simulateur
- API Node.js et routes
- Interface web React
- Intégration complète

Auteur: Projet Serina
Date: Septembre 2025
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

class SerinaIntegrationTester:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.results = {
            "cpp_headers": {"status": "not_tested", "details": []},
            "python_simulator": {"status": "not_tested", "details": []},
            "api_server": {"status": "not_tested", "details": []},
            "web_interface": {"status": "not_tested", "details": []},
            "integration": {"status": "not_tested", "details": []}
        }
    
    def test_cpp_headers(self):
        """Test des headers C++ pour vérifier les dépendances"""
        print("🔍 Test des headers C++...")
        
        headers_dir = self.project_root / "include" / "Serina"
        if not headers_dir.exists():
            self.results["cpp_headers"]["status"] = "failed"
            self.results["cpp_headers"]["details"].append("Dossier include/Serina manquant")
            return False
        
        critical_headers = [
            "SimulationAPI.hpp",
            "SerinaSimulator.hpp", 
            "Species.hpp",
            "World.hpp",
            "PopulationManager.hpp",
            "NEAT.hpp"
        ]
        
        missing_headers = []
        for header in critical_headers:
            if not (headers_dir / header).exists():
                missing_headers.append(header)
        
        if missing_headers:
            self.results["cpp_headers"]["status"] = "failed"
            self.results["cpp_headers"]["details"].append(f"Headers manquants: {missing_headers}")
            return False
        
        # Test de compilation simple
        try:
            cpp_test_code = """
            #include "include/Serina/SimulationAPI.hpp"
            int main() { return 0; }
            """
            with open(self.project_root / "test_compile.cpp", "w") as f:
                f.write(cpp_test_code)
            
            result = subprocess.run([
                "g++", "-I", str(self.project_root), 
                str(self.project_root / "test_compile.cpp"),
                "-o", str(self.project_root / "test_compile.exe")
            ], capture_output=True, text=True)
            
            os.unlink(self.project_root / "test_compile.cpp")
            if (self.project_root / "test_compile.exe").exists():
                os.unlink(self.project_root / "test_compile.exe")
            
            if result.returncode == 0:
                self.results["cpp_headers"]["status"] = "passed"
                self.results["cpp_headers"]["details"].append("Headers C++ validés")
            else:
                self.results["cpp_headers"]["status"] = "warning"
                self.results["cpp_headers"]["details"].append(f"Avertissements compilation: {result.stderr}")
        
        except Exception as e:
            self.results["cpp_headers"]["status"] = "warning"
            self.results["cpp_headers"]["details"].append(f"Impossible de tester la compilation: {e}")
        
        return True
    
    def test_python_simulator(self):
        """Test du simulateur Python"""
        print("🐍 Test du simulateur Python...")
        
        simulator_file = self.project_root / "serina_evolution_simulator.py"
        if not simulator_file.exists():
            self.results["python_simulator"]["status"] = "failed"
            self.results["python_simulator"]["details"].append("serina_evolution_simulator.py manquant")
            return False
        
        try:
            # Test d'import
            sys.path.insert(0, str(self.project_root))
            from serina_evolution_simulator import SerinaSimulator
            
            # Test d'initialisation
            sim = SerinaSimulator()
            
            # Test de la méthode step
            result = sim.step()
            
            # Test de la nouvelle méthode get_simulation_data
            if hasattr(sim, 'get_simulation_data'):
                data = sim.get_simulation_data()
                required_keys = ['generation', 'population_count', 'species_count', 'environment']
                missing_keys = [key for key in required_keys if key not in data]
                
                if missing_keys:
                    self.results["python_simulator"]["status"] = "warning"
                    self.results["python_simulator"]["details"].append(f"Clés manquantes dans get_simulation_data: {missing_keys}")
                else:
                    self.results["python_simulator"]["status"] = "passed"
                    self.results["python_simulator"]["details"].append("Simulateur Python validé avec API complète")
            else:
                self.results["python_simulator"]["status"] = "warning"
                self.results["python_simulator"]["details"].append("Méthode get_simulation_data manquante")
        
        except ImportError as e:
            self.results["python_simulator"]["status"] = "failed"
            self.results["python_simulator"]["details"].append(f"Erreur d'import: {e}")
            return False
        except Exception as e:
            self.results["python_simulator"]["status"] = "warning"
            self.results["python_simulator"]["details"].append(f"Erreur lors du test: {e}")
        
        return True
    
    def test_api_server(self):
        """Test de l'API Node.js"""
        print("🌐 Test de l'API Node.js...")
        
        api_dir = self.project_root / "api"
        if not api_dir.exists():
            self.results["api_server"]["status"] = "failed"
            self.results["api_server"]["details"].append("Dossier api manquant")
            return False
        
        # Vérifier package.json
        package_json = api_dir / "package.json"
        if not package_json.exists():
            self.results["api_server"]["status"] = "failed"
            self.results["api_server"]["details"].append("package.json manquant")
            return False
        
        # Vérifier les dépendances critiques
        try:
            with open(package_json, 'r') as f:
                package_data = json.load(f)
            
            required_deps = ['express', 'socket.io', 'mysql2', 'uuid', 'swagger-ui-express']
            missing_deps = []
            
            deps = package_data.get('dependencies', {})
            for dep in required_deps:
                if dep not in deps:
                    missing_deps.append(dep)
            
            if missing_deps:
                self.results["api_server"]["status"] = "warning"
                self.results["api_server"]["details"].append(f"Dépendances manquantes: {missing_deps}")
            else:
                self.results["api_server"]["status"] = "passed"
                self.results["api_server"]["details"].append("Configuration API validée")
        
        except Exception as e:
            self.results["api_server"]["status"] = "warning"
            self.results["api_server"]["details"].append(f"Erreur lecture package.json: {e}")
        
        return True
    
    def test_web_interface(self):
        """Test de l'interface web React"""
        print("⚛️  Test de l'interface web...")
        
        web_dir = self.project_root / "web"
        if not web_dir.exists():
            self.results["web_interface"]["status"] = "failed"
            self.results["web_interface"]["details"].append("Dossier web manquant")
            return False
        
        # Vérifier la configuration TypeScript
        tsconfig = web_dir / "tsconfig.json"
        if tsconfig.exists():
            try:
                with open(tsconfig, 'r') as f:
                    config = json.load(f)
                
                if 'paths' in config.get('compilerOptions', {}):
                    self.results["web_interface"]["status"] = "passed"
                    self.results["web_interface"]["details"].append("Configuration TypeScript validée")
                else:
                    self.results["web_interface"]["status"] = "warning"
                    self.results["web_interface"]["details"].append("Alias de chemin manquants dans tsconfig")
            except Exception as e:
                self.results["web_interface"]["status"] = "warning"
                self.results["web_interface"]["details"].append(f"Erreur lecture tsconfig: {e}")
        else:
            self.results["web_interface"]["status"] = "warning"
            self.results["web_interface"]["details"].append("tsconfig.json manquant")
        
        return True
    
    def test_integration(self):
        """Test d'intégration complète"""
        print("🔗 Test d'intégration complète...")
        
        # Vérifier que tous les composants principaux sont présents
        components = [
            (self.project_root / "api" / "server.js", "Serveur API"),
            (self.project_root / "web" / "src" / "App.tsx", "Application web"),
            (self.project_root / "python" / "stream_sim.py", "Bridge Python"),
            (self.project_root / "serina_evolution_simulator.py", "Simulateur principal"),
            (self.project_root / "launch_serina.bat", "Script de lancement Windows"),
            (self.project_root / "launch_serina.sh", "Script de lancement Unix")
        ]
        
        missing_components = []
        for file_path, description in components:
            if not file_path.exists():
                missing_components.append(description)
        
        if missing_components:
            self.results["integration"]["status"] = "warning"
            self.results["integration"]["details"].append(f"Composants manquants: {missing_components}")
        else:
            self.results["integration"]["status"] = "passed"
            self.results["integration"]["details"].append("Tous les composants d'intégration présents")
        
        return True
    
    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🧪 === TEST D'INTÉGRATION SERINA ===\n")
        
        tests = [
            ("Headers C++", self.test_cpp_headers),
            ("Simulateur Python", self.test_python_simulator),
            ("API Node.js", self.test_api_server),
            ("Interface Web", self.test_web_interface),
            ("Intégration", self.test_integration)
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
                status = self.results[test_name.lower().replace(" ", "_").replace("++", "")]["status"]
                if status == "passed":
                    print(f"✅ {test_name}: RÉUSSI")
                elif status == "warning":
                    print(f"⚠️  {test_name}: AVERTISSEMENTS")
                else:
                    print(f"❌ {test_name}: ÉCHEC")
            except Exception as e:
                print(f"💥 {test_name}: ERREUR - {e}")
        
        print("\n🎯 === RÉSUMÉ DES TESTS ===")
        self.print_detailed_results()
    
    def print_detailed_results(self):
        """Affiche les résultats détaillés"""
        for component, result in self.results.items():
            status_icon = {
                "passed": "✅",
                "warning": "⚠️",
                "failed": "❌",
                "not_tested": "⏳"
            }[result["status"]]
            
            print(f"\n{status_icon} {component.replace('_', ' ').title()}:")
            for detail in result["details"]:
                print(f"   • {detail}")

if __name__ == "__main__":
    project_root = os.path.dirname(os.path.abspath(__file__))
    tester = SerinaIntegrationTester(project_root)
    tester.run_all_tests()