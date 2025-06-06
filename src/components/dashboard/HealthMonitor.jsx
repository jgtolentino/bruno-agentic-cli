import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Server, 
  Database, 
  Zap,
  Shield,
  RefreshCw,
  Monitor,
  Cpu,
  HardDrive,
  Globe,
  GitBranch,
  FileText,
  Bug,
  Sparkles,
  Loader2,
  Play,
  Terminal,
  Wrench,
  CheckSquare,
  GitCommit,
  Rocket
} from 'lucide-react';

const HealthMonitor = () => {
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    database: 'checking',
    cache: 'checking',
    lastChecked: new Date().toISOString()
  });

  const [metrics, setMetrics] = useState({
    responseTime: 0,
    uptime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  // Memoized health check function
  const checkSystemHealth = useCallback(async () => {
    try {
      const startTime = performance.now();
      const apiResponse = await fetch('http://localhost:3001/health');
      const apiData = await apiResponse.json();
      const responseTime = performance.now() - startTime;

      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        api: apiResponse.ok ? 'healthy' : 'error',
        database: apiData.database || 'checking',
        cache: apiData.cache || 'checking',
        lastChecked: new Date().toISOString()
      }));

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        responseTime,
        uptime: apiData.uptime || 0,
        memoryUsage: apiData.memoryUsage || 0,
        cpuUsage: apiData.cpuUsage || 0
      }));

      // Add to recent activity
      setRecentActivity(prev => [{
        type: 'health_check',
        status: apiResponse.ok ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        message: apiResponse.ok ? 'System health check completed' : 'Health check failed',
        metrics: {
          responseTime,
          uptime: apiData.uptime,
          memoryUsage: apiData.memoryUsage,
          cpuUsage: apiData.cpuUsage
        }
      }, ...prev].slice(0, 5));

    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        api: 'error',
        lastChecked: new Date().toISOString()
      }));
    }
  }, []);

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const formatMetric = (value, type) => {
    switch (type) {
      case 'time':
        return `${value.toFixed(2)}ms`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'memory':
        return `${(value / 1024 / 1024).toFixed(2)}MB`;
      default:
        return value;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          System Health Dashboard
        </h1>
        <button 
          onClick={checkSystemHealth}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Status */}
        <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.api)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <span className="font-medium">API Server</span>
            </div>
            {getStatusIcon(systemStatus.api)}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Response Time: {formatMetric(metrics.responseTime, 'time')}
          </div>
        </div>

        {/* Database Status */}
        <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.database)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <span className="font-medium">Database</span>
            </div>
            {getStatusIcon(systemStatus.database)}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Memory: {formatMetric(metrics.memoryUsage, 'memory')}
          </div>
        </div>

        {/* Cache Status */}
        <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.cache)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-medium">Cache</span>
            </div>
            {getStatusIcon(systemStatus.cache)}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            CPU: {formatMetric(metrics.cpuUsage, 'percentage')}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Response Time</div>
            <div className="text-lg font-semibold">{formatMetric(metrics.responseTime, 'time')}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Uptime</div>
            <div className="text-lg font-semibold">{formatMetric(metrics.uptime, 'time')}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Memory Usage</div>
            <div className="text-lg font-semibold">{formatMetric(metrics.memoryUsage, 'memory')}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">CPU Usage</div>
            <div className="text-lg font-semibold">{formatMetric(metrics.cpuUsage, 'percentage')}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600">{activity.message}</span>
              <span className="text-gray-400 text-xs">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Checked */}
      <div className="text-sm text-gray-500">
        Last checked: {new Date(systemStatus.lastChecked).toLocaleString()}
      </div>
    </div>
  );
};

export default HealthMonitor; 