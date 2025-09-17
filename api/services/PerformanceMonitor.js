import winston from 'winston';
import { performance } from 'perf_hooks';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export class PerformanceMonitor {
  constructor(databaseService) {
    this.db = databaseService;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.metricsInterval = 5000; // 5 seconds
    
    // Performance metrics
    this.metrics = {
      cpu: { current: 0, average: 0, peak: 0 },
      memory: { current: 0, average: 0, peak: 0 },
      connections: { current: 0, average: 0, peak: 0 },
      queries: { total: 0, rate: 0, errors: 0 },
      evolution: { generationsPerSecond: 0, totalGenerations: 0 }
    };
    
    // History for averaging
    this.history = {
      cpu: [],
      memory: [],
      connections: [],
      queries: []
    };
    
    this.maxHistorySize = 100; // Keep last 100 measurements
    this.startTime = Date.now();
    this.lastQueryCount = 0;
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
    
    logger.info('Performance monitoring started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    logger.info('Performance monitoring stopped');
  }

  collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
      
      // CPU usage (approximation based on event loop delay)
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;
        const cpuUsage = Math.min(100, delay * 2); // Rough approximation
        
        this.updateMetric('cpu', cpuUsage);
      });
      
      // Memory usage
      this.updateMetric('memory', memoryMB);
      
      // Update averages
      this.calculateAverages();
      
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  updateMetric(type, value) {
    const metric = this.metrics[type];
    const history = this.history[type];
    
    // Update current value
    metric.current = value;
    
    // Update peak
    metric.peak = Math.max(metric.peak, value);
    
    // Add to history
    history.push(value);
    
    // Trim history if too long
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  calculateAverages() {
    Object.keys(this.history).forEach(type => {
      const history = this.history[type];
      if (history.length > 0) {
        this.metrics[type].average = history.reduce((sum, val) => sum + val, 0) / history.length;
      }
    });
  }

  async recordMetrics() {
    if (!this.db || !this.isMonitoring) {
      return;
    }

    try {
      // This would be called with simulation-specific data in a real implementation
      const metricsData = {
        simulation_id: 1, // Default simulation for system metrics
        generation: 0,
        generations_per_second: this.metrics.evolution.generationsPerSecond,
        memory_usage: this.metrics.memory.current,
        cpu_usage: this.metrics.cpu.current,
        frame_rate: 60, // Placeholder
        active_individuals: 0, // Would be provided by evolution engine
        mutations_per_generation: 0,
        reproductions_per_generation: 0
      };
      
      await this.db.recordPerformanceMetrics(metricsData);
      
    } catch (error) {
      logger.error('Failed to record metrics to database:', error);
    }
  }

  updateConnectionCount(count) {
    this.updateMetric('connections', count);
  }

  incrementQueryCount() {
    this.metrics.queries.total++;
  }

  incrementQueryError() {
    this.metrics.queries.errors++;
  }

  updateEvolutionMetrics(generationsPerSecond, totalGenerations) {
    this.metrics.evolution.generationsPerSecond = generationsPerSecond;
    this.metrics.evolution.totalGenerations = totalGenerations;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const queryRate = this.metrics.queries.total / (uptime / 1000);
    
    return {
      uptime: uptime,
      cpu: { ...this.metrics.cpu },
      memory: { ...this.metrics.memory },
      connections: { ...this.metrics.connections },
      queries: {
        ...this.metrics.queries,
        rate: queryRate,
        errorRate: this.metrics.queries.errors / Math.max(1, this.metrics.queries.total)
      },
      evolution: { ...this.metrics.evolution },
      timestamp: new Date().toISOString()
    };
  }

  getDetailedMetrics() {
    return {
      current: this.getMetrics(),
      history: {
        cpu: [...this.history.cpu],
        memory: [...this.history.memory],
        connections: [...this.history.connections],
        queries: [...this.history.queries]
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  // Health check
  getHealthStatus() {
    const metrics = this.getMetrics();
    
    const health = {
      status: 'healthy',
      issues: [],
      metrics: {
        cpu: metrics.cpu.current,
        memory: metrics.memory.current,
        uptime: metrics.uptime
      }
    };
    
    // Check for issues
    if (metrics.cpu.current > 80) {
      health.issues.push('High CPU usage');
      health.status = 'degraded';
    }
    
    if (metrics.memory.current > 1000) { // >1GB
      health.issues.push('High memory usage');
      health.status = 'degraded';
    }
    
    if (metrics.queries.errorRate > 0.1) { // >10% error rate
      health.issues.push('High query error rate');
      health.status = 'degraded';
    }
    
    if (health.issues.length > 2) {
      health.status = 'critical';
    }
    
    return health;
  }

  // Performance recommendations
  getPerformanceRecommendations() {
    const metrics = this.getMetrics();
    const recommendations = [];
    
    if (metrics.memory.current > 500) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'Consider implementing memory optimization or increasing server resources',
        action: 'Implement garbage collection tuning or reduce memory footprint'
      });
    }
    
    if (metrics.cpu.average > 60) {
      recommendations.push({
        type: 'cpu',
        priority: 'high',
        message: 'High CPU usage detected, consider optimization',
        action: 'Profile code for CPU bottlenecks or scale horizontally'
      });
    }
    
    if (metrics.evolution.generationsPerSecond < 1) {
      recommendations.push({
        type: 'evolution',
        priority: 'medium',
        message: 'Evolution speed is low, consider algorithm optimization',
        action: 'Review evolution algorithms and database query efficiency'
      });
    }
    
    return recommendations;
  }

  // Reset metrics
  reset() {
    this.metrics = {
      cpu: { current: 0, average: 0, peak: 0 },
      memory: { current: 0, average: 0, peak: 0 },
      connections: { current: 0, average: 0, peak: 0 },
      queries: { total: 0, rate: 0, errors: 0 },
      evolution: { generationsPerSecond: 0, totalGenerations: 0 }
    };
    
    this.history = {
      cpu: [],
      memory: [],
      connections: [],
      queries: []
    };
    
    this.startTime = Date.now();
    this.lastQueryCount = 0;
    
    logger.info('Performance metrics reset');
  }
}