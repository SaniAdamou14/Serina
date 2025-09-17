const io = require('socket.io-client');

function testSocketIO() {
    console.log('🔌 Testing Socket.IO connection to Serina API...\n');
    
    const socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        console.log('Socket ID:', socket.id);
        
        // Test sending a command
        socket.emit('simulation-command', {
            type: 'command',
            command: 'GET_STATUS'
        });
        
        setTimeout(() => {
            socket.disconnect();
        }, 3000);
    });
    
    socket.on('message', (data) => {
        console.log('📨 Received message:', data);
    });
    
    socket.on('simulation-data', (data) => {
        console.log('📊 Received simulation data:', data);
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from Socket.IO server');
        process.exit(0);
    });
}

testSocketIO();