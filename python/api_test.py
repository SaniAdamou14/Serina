#!/usr/bin/env python3
"""
Test script to explore the serina_py module API
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import serina_py
    print("✓ Successfully imported serina_py module")
    
    # Explore the module
    print("\nAvailable attributes in serina_py:")
    for attr in dir(serina_py):
        if not attr.startswith('_'):
            print(f"  - {attr}")
            
    # Try to create objects from available classes
    print("\nTesting available classes:")
    
    # Test SimulationAPI if available
    if hasattr(serina_py, 'SimulationAPI'):
        print("Testing SimulationAPI...")
        try:
            api = serina_py.SimulationAPI(800, 600)  # Provide required parameters
            print("✓ SimulationAPI created successfully")
            
            # Try available methods
            print("Available methods:")
            for method in dir(api):
                if not method.startswith('_'):
                    print(f"  - {method}")
                    
        except Exception as e:
            print(f"✗ SimulationAPI error: {e}")
    
    # Test other classes
    for class_name in ['World', 'Species', 'Genome', 'PhysicsEngine']:
        if hasattr(serina_py, class_name):
            print(f"Found {class_name} class")
            
except ImportError as e:
    print(f"✗ Failed to import serina_py: {e}")
except Exception as e:
    print(f"✗ Error: {e}")