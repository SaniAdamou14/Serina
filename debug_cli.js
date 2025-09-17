const { spawn } = require('child_process');
const path = require('path');

function debugCLI() {
    const cliPath = path.join(__dirname, 'build/bin/Release/serina_cli.exe');
    const process = spawn(cliPath, ['init', '20', '2', '100'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('STDOUT CHUNK:', JSON.stringify(chunk));
        output += chunk;
    });

    process.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.log('STDERR CHUNK:', JSON.stringify(chunk));
        error += chunk;
    });

    process.on('close', (code) => {
        console.log('Exit code:', code);
        console.log('Full stdout:', JSON.stringify(output));
        console.log('Full stderr:', JSON.stringify(error));
        
        // Test JSON extraction
        const jsonStart = output.lastIndexOf('{');
        const jsonEnd = output.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonString = output.substring(jsonStart, jsonEnd + 1);
            console.log('Extracted JSON string:', JSON.stringify(jsonString));
            try {
                const parsed = JSON.parse(jsonString);
                console.log('Successfully parsed JSON:', parsed);
            } catch (e) {
                console.log('JSON parse error:', e.message);
            }
        }
    });
}

debugCLI();