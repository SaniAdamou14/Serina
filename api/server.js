const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import services
const database = require('./services/database');
const websocketService = require('./services/websocket');
const SimulationEngine = require('./services/simulationEngine');

// Import routes
const speciesRoutes = require('./routes/species');
const simulationRoutes = require('./routes/simulations');
const environmentRoutes = require('./routes/environment');
const speciesAnalyticsRoutes = require('./routes/species-analytics');
const { router: serinaRoutes, setSimulationEngine: setSerinaEngine } = require('./routes/serina');

// Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Serina Evolution API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:' + (process.env.PORT || 3001) }]
  },
  apis: [
    path.join(__dirname, 'routes', '*.js')
  ]
});

// Create Express app
const app = express();
const server = http.createServer(app);

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: (process.env.CORS_METHODS || "GET,POST,PUT,DELETE,PATCH,OPTIONS").split(','),
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Services initialization
let simulationEngine = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: database.isConnected(),
      simulationEngine: simulationEngine ? simulationEngine.isAvailable() : false,
      websocket: websocketService.isInitialized
    }
  });
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🚀 Initializing services...');

    // Initialize database
    await database.initialize();
    const dbConnected = database.isConnected();
    if (dbConnected) {
      console.log('✅ Database service initialized');
    } else {
      console.warn('⚠️ Database is not connected. Simulation history/analytics will be unavailable.');
    }

    // Initialize the simulation engine (bridge to the real C++ CLI)
    simulationEngine = new SimulationEngine();
    await simulationEngine.initialize();
    setSerinaEngine(simulationEngine);
    console.log('✅ Simulation Engine initialized');

    // Initialize WebSocket service
    websocketService.setSimulationEngine(simulationEngine);
    websocketService.initialize(io);
    console.log('✅ WebSocket Service initialized');

    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Setup routes
app.use('/api/species', speciesRoutes);
app.use('/api/species', speciesAnalyticsRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/serina', serinaRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeServices();

    server.listen(PORT, () => {
      console.log(`🌟 Serina Evolution Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`💚 Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n📡 Received ${signal}, initiating graceful shutdown...`);
  try {
    if (simulationEngine) await simulationEngine.cleanup();
    websocketService.cleanup();
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
