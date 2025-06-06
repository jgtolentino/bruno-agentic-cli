import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
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

const SystemHealthMonitor = () => {
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    database: 'checking',
    cache: 'checking'
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        
        setSystemStatus({
          api: data.api.status,
          database: data.database.status,
          cache: data.cache.status
        });

        setRecentActivity(prev => [
          {
            timestamp: new Date().toISOString(),
            message: `System health check completed: ${data.api.status}, ${data.database.status}, ${data.cache.status}`
          },
          ...prev
        ].slice(0, 5));

        setLastChecked(new Date());
      } catch (error) {
        console.error('Error checking system health:', error);
        setSystemStatus({
          api: 'error',
          database: 'error',
          cache: 'error'
        });
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">API Status</h3>
            {getStatusIcon(systemStatus.api)}
          </div>
          <p className={`text-sm px-3 py-1 rounded-full inline-block ${getStatusColor(systemStatus.api)}`}>
            {systemStatus.api}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Database Status</h3>
            {getStatusIcon(systemStatus.database)}
          </div>
          <p className={`text-sm px-3 py-1 rounded-full inline-block ${getStatusColor(systemStatus.database)}`}>
            {systemStatus.database}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cache Status</h3>
            {getStatusIcon(systemStatus.cache)}
          </div>
          <p className={`text-sm px-3 py-1 rounded-full inline-block ${getStatusColor(systemStatus.cache)}`}>
            {systemStatus.cache}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Activity className="w-5 h-5 text-gray-500" />
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{activity.message}</p>
                <p className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastChecked && (
        <div className="mt-4 text-sm text-gray-500 text-right">
          Last checked: {lastChecked.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SystemHealthMonitor; 