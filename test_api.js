const fetch = require('node-fetch');

async function testAPI() {
    const baseURL = 'http://localhost:3001/api/serina';
    
    try {
        console.log('🧪 Testing Serina API Endpoints...\n');
        
        // Test 1: Start simulation
        console.log('1. Testing simulation start...');
        const startResponse = await fetch(`${baseURL}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                worldSize: 30,
                initialSpecies: 3,
                steps: 200
            })
        });
        
        const startResult = await startResponse.json();
        console.log('Start Result:', JSON.stringify(startResult, null, 2));
        
        if (startResult.success && startResult.simulationId) {
            const simulationId = startResult.simulationId;
            console.log(`✅ Simulation started with ID: ${simulationId}\n`);
            
            // Test 2: Get simulation status
            console.log('2. Testing simulation status...');
            const statusResponse = await fetch(`${baseURL}/status/${simulationId}`);
            const statusResult = await statusResponse.json();
            console.log('Status Result:', JSON.stringify(statusResult, null, 2));
            console.log('✅ Status retrieved\n');
            
            // Test 3: Get simulation data
            console.log('3. Testing simulation data...');
            const dataResponse = await fetch(`${baseURL}/data/${simulationId}`);
            const dataResult = await dataResponse.json();
            console.log('Data Result:', JSON.stringify(dataResult, null, 2));
            console.log('✅ Simulation data retrieved\n');
            
        } else {
            console.log('❌ Failed to start simulation');
        }
        
    } catch (error) {
        console.error('❌ API Test Error:', error);
    }
}

testAPI();