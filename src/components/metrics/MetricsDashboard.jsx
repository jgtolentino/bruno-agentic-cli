import React, { useState, useEffect } from 'react';
import { 
  Activity,
  TrendingUp,
  BarChart2,
  LineChart,
  PieChart,
  AlertCircle,
  Clock,
  Zap,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';

const MetricsDashboard = () => {
  const [metrics, setMetrics] = useState({
    requests: {
      total: 0,
      success: 0,
      failed: 0,
      averageResponseTime: 0
    },
    resources: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    },
    performance: {
      uptime: 0,
      loadAverage: 0,
      activeConnections: 0,
      queueLength: 0
    }
  });

  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`http://localhost:3001/metrics?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
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
      case 'number':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6" />
          System Metrics
        </h1>
        <div className="flex gap-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Request Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Activity className="h-5 w-5" />
            <span>Total Requests</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.requests.total, 'number')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="h-5 w-5" />
            <span>Success Rate</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric((metrics.requests.success / metrics.requests.total) * 100, 'percentage')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed Requests</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.requests.failed, 'number')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-5 w-5" />
            <span>Avg Response Time</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.requests.averageResponseTime, 'time')}
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Cpu className="h-5 w-5" />
            <span>CPU Usage</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.resources.cpu, 'percentage')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <HardDrive className="h-5 w-5" />
            <span>Memory Usage</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.resources.memory, 'memory')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Network className="h-5 w-5" />
            <span>Network I/O</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.resources.network, 'number')} MB/s
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Zap className="h-5 w-5" />
            <span>Disk I/O</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.resources.disk, 'number')} MB/s
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-5 w-5" />
            <span>Uptime</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.performance.uptime, 'time')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <LineChart className="h-5 w-5" />
            <span>Load Average</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.performance.loadAverage, 'number')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Network className="h-5 w-5" />
            <span>Active Connections</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.performance.activeConnections, 'number')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <PieChart className="h-5 w-5" />
            <span>Queue Length</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(metrics.performance.queueLength, 'number')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard; 