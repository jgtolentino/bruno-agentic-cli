import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const PerformanceMonitor = () => {
  const [performance, setPerformance] = useState({
    cpu: {
      usage: 0,
      temperature: 0,
      frequency: 0,
      cores: []
    },
    memory: {
      total: 0,
      used: 0,
      free: 0,
      swap: {
        total: 0,
        used: 0,
        free: 0
      }
    },
    disk: {
      read: 0,
      write: 0,
      iops: 0,
      latency: 0
    },
    network: {
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
      errors: 0
    },
    processes: {
      total: 0,
      running: 0,
      blocked: 0,
      zombie: 0
    }
  });

  const [alerts, setAlerts] = useState([]);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`http://localhost:3001/performance?range=${timeRange}`);
      const data = await response.json();
      setPerformance(data);
      checkAlerts(data);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const checkAlerts = (data) => {
    const newAlerts = [];
    
    // CPU alerts
    if (data.cpu.usage > 90) {
      newAlerts.push({
        type: 'error',
        message: 'High CPU usage detected',
        metric: 'CPU',
        value: `${data.cpu.usage}%`
      });
    } else if (data.cpu.usage > 70) {
      newAlerts.push({
        type: 'warning',
        message: 'Elevated CPU usage',
        metric: 'CPU',
        value: `${data.cpu.usage}%`
      });
    }

    // Memory alerts
    const memoryUsage = (data.memory.used / data.memory.total) * 100;
    if (memoryUsage > 90) {
      newAlerts.push({
        type: 'error',
        message: 'High memory usage detected',
        metric: 'Memory',
        value: `${memoryUsage.toFixed(1)}%`
      });
    }

    // Disk alerts
    if (data.disk.latency > 1000) {
      newAlerts.push({
        type: 'error',
        message: 'High disk latency detected',
        metric: 'Disk',
        value: `${data.disk.latency}ms`
      });
    }

    // Network alerts
    if (data.network.errors > 0) {
      newAlerts.push({
        type: 'error',
        message: 'Network errors detected',
        metric: 'Network',
        value: `${data.network.errors} errors`
      });
    }

    setAlerts(newAlerts);
  };

  const formatMetric = (value, type) => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'bytes':
        return `${(value / 1024 / 1024).toFixed(2)} MB`;
      case 'temperature':
        return `${value}°C`;
      case 'frequency':
        return `${(value / 1000).toFixed(2)} GHz`;
      case 'time':
        return `${value}ms`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Performance Monitor
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg flex items-center gap-2 ${
                alert.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
              <span>{alert.message}</span>
              <span className="ml-auto font-semibold">{alert.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* CPU Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Cpu className="h-5 w-5" />
            <span>CPU Usage</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.cpu.usage, 'percentage')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="h-5 w-5" />
            <span>CPU Temperature</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.cpu.temperature, 'temperature')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Zap className="h-5 w-5" />
            <span>CPU Frequency</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.cpu.frequency, 'frequency')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <BarChart2 className="h-5 w-5" />
            <span>Active Cores</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {performance.cpu.cores.filter(core => core.active).length}
          </div>
        </div>
      </div>

      {/* Memory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <HardDrive className="h-5 w-5" />
            <span>Memory Usage</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric((performance.memory.used / performance.memory.total) * 100, 'percentage')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingDown className="h-5 w-5" />
            <span>Free Memory</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.memory.free, 'bytes')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="h-5 w-5" />
            <span>Swap Usage</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric((performance.memory.swap.used / performance.memory.swap.total) * 100, 'percentage')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-5 w-5" />
            <span>Total Memory</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.memory.total, 'bytes')}
          </div>
        </div>
      </div>

      {/* Disk and Network Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <HardDrive className="h-5 w-5" />
            <span>Disk Read</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.disk.read, 'bytes')}/s
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <HardDrive className="h-5 w-5" />
            <span>Disk Write</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.disk.write, 'bytes')}/s
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Network className="h-5 w-5" />
            <span>Network In</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.network.bytesIn, 'bytes')}/s
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Network className="h-5 w-5" />
            <span>Network Out</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMetric(performance.network.bytesOut, 'bytes')}/s
          </div>
        </div>
      </div>

      {/* Process Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <Activity className="h-5 w-5" />
            <span>Total Processes</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {performance.processes.total}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="h-5 w-5" />
            <span>Running</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {performance.processes.running}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Blocked</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {performance.processes.blocked}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 text-gray-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Zombie</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {performance.processes.zombie}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor; 