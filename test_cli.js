const UnifiedSerinaService = require('./api/services/unifiedSerinaService');

async function testCLI() {
    try {
        console.log('Testing CLI init command...');
        const service = new UnifiedSerinaService();
        await service.initialize();
        const result = await service.executeCliCommand('init', ['20', '2', '100']);
        console.log('Result:', JSON.stringify(result, null, 2));
        
        console.log('\nTesting status command...');
        const status = await service.executeCliCommand('status');
        console.log('Status:', JSON.stringify(status, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testCLI();