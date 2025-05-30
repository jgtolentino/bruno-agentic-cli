import chalk from 'chalk';

export class DeviceManager {
  constructor() {
    this.deviceRegistry = new Map();
    this.deviceTypes = {
      camera: {
        defaultConfig: {
          resolution: '1920x1080',
          fps: 30,
          format: 'h264',
          compression: 'medium'
        },
        capabilities: ['object_detection', 'motion_detection', 'face_recognition'],
        protocols: ['rtsp', 'http', 'websocket']
      },
      sensor: {
        defaultConfig: {
          sampleRate: 1000, // ms
          precision: 2,
          calibration: true,
          filtering: 'medium'
        },
        capabilities: ['environmental_monitoring', 'predictive_maintenance'],
        protocols: ['mqtt', 'http', 'lorawan']
      },
      gateway: {
        defaultConfig: {
          maxDevices: 100,
          protocol: 'multi',
          buffering: true,
          compression: 'high'
        },
        capabilities: ['device_coordination', 'data_aggregation', 'protocol_translation'],
        protocols: ['wifi', 'ethernet', 'cellular']
      },
      pos: {
        defaultConfig: {
          transactionBuffer: 1000,
          offlineMode: true,
          encryption: 'aes256'
        },
        capabilities: ['transaction_processing', 'inventory_tracking'],
        protocols: ['ethernet', 'wifi', 'cellular']
      }
    };

    this.commands = {
      register: this.registerDevice.bind(this),
      status: this.getDeviceStatus.bind(this),
      configure: this.configureDevice.bind(this),
      monitor: this.monitorDevices.bind(this),
      troubleshoot: this.troubleshootDevice.bind(this),
      provision: this.provisionDevice.bind(this),
      update: this.updateDevice.bind(this)
    };
  }

  async executeCommand(command, args = {}) {
    console.log(chalk.cyan(`🔧 Executing device command: ${command}`));
    
    const handler = this.commands[command];
    if (!handler) {
      throw new Error(`Unknown device command: ${command}`);
    }

    return await handler(args);
  }

  async registerDevice(args) {
    const { deviceId, deviceType, location, config = {} } = args;
    
    if (!deviceId || !deviceType) {
      throw new Error('Device ID and type are required');
    }

    if (!this.deviceTypes[deviceType]) {
      throw new Error(`Unsupported device type: ${deviceType}. Supported: ${Object.keys(this.deviceTypes).join(', ')}`);
    }

    const device = {
      id: deviceId,
      type: deviceType,
      location: location || 'unknown',
      config: { ...this.deviceTypes[deviceType].defaultConfig, ...config },
      status: 'registered',
      registeredAt: new Date().toISOString(),
      lastSeen: null,
      metadata: {}
    };

    this.deviceRegistry.set(deviceId, device);

    return {
      success: true,
      device: device,
      supabaseCommands: this.generateSupabaseRegistration(device),
      edgeSetup: this.generateEdgeSetup(device),
      monitoringSetup: this.generateMonitoringSetup(device)
    };
  }

  async getDeviceStatus(args) {
    const { deviceId } = args;
    
    if (deviceId) {
      const device = this.deviceRegistry.get(deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }
      return this.generateDeviceStatusReport(device);
    }

    // Return status for all devices
    const allDevices = Array.from(this.deviceRegistry.values());
    return {
      totalDevices: allDevices.length,
      byType: this.groupDevicesByType(allDevices),
      byStatus: this.groupDevicesByStatus(allDevices),
      healthOverview: this.generateHealthOverview(allDevices),
      commands: this.generateStatusCommands()
    };
  }

  async configureDevice(args) {
    const { deviceId, configuration } = args;
    
    const device = this.deviceRegistry.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    device.config = { ...device.config, ...configuration };
    device.lastConfigured = new Date().toISOString();

    return {
      success: true,
      deviceId: deviceId,
      newConfiguration: device.config,
      deploymentCommands: this.generateConfigDeployment(device),
      validationSteps: this.generateConfigValidation(device)
    };
  }

  async monitorDevices(args) {
    const { deviceType, location, realtime = true } = args;
    
    let devicesToMonitor = Array.from(this.deviceRegistry.values());
    
    if (deviceType) {
      devicesToMonitor = devicesToMonitor.filter(d => d.type === deviceType);
    }
    
    if (location) {
      devicesToMonitor = devicesToMonitor.filter(d => d.location.includes(location));
    }

    return {
      monitoringSetup: this.generateMonitoringDashboard(devicesToMonitor, realtime),
      alertRules: this.generateAlertRules(devicesToMonitor),
      metrics: this.generateMetricsDefinition(devicesToMonitor),
      supabaseFunctions: this.generateMonitoringFunctions(devicesToMonitor)
    };
  }

  async troubleshootDevice(args) {
    const { deviceId, issue } = args;
    
    const device = this.deviceRegistry.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const troubleshooting = {
      device: device,
      commonIssues: this.getCommonIssues(device.type),
      diagnosticCommands: this.generateDiagnosticCommands(device),
      logCommands: this.generateLogCommands(device),
      healthChecks: this.generateHealthChecks(device)
    };

    if (issue) {
      troubleshooting.specificSolution = this.getSolutionForIssue(device.type, issue);
    }

    return troubleshooting;
  }

  async provisionDevice(args) {
    const { deviceType, quantity = 1, location, namePrefix = 'device' } = args;
    
    if (!this.deviceTypes[deviceType]) {
      throw new Error(`Unsupported device type: ${deviceType}`);
    }

    const provisionedDevices = [];
    
    for (let i = 0; i < quantity; i++) {
      const deviceId = `${namePrefix}-${deviceType}-${String(i + 1).padStart(3, '0')}`;
      
      const result = await this.registerDevice({
        deviceId,
        deviceType,
        location: location || `${deviceType}_location_${i + 1}`
      });
      
      provisionedDevices.push(result.device);
    }

    return {
      success: true,
      provisionedCount: quantity,
      devices: provisionedDevices,
      bulkCommands: this.generateBulkDeployment(provisionedDevices),
      networkSetup: this.generateNetworkSetup(deviceType, quantity),
      scalingRecommendations: this.generateScalingRecommendations(deviceType, quantity)
    };
  }

  async updateDevice(args) {
    const { deviceId, firmware, config, restart = false } = args;
    
    const device = this.deviceRegistry.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const updatePlan = {
      deviceId: deviceId,
      currentVersion: device.firmware || 'unknown',
      targetVersion: firmware,
      configChanges: config,
      requiresRestart: restart,
      steps: this.generateUpdateSteps(device, firmware, config, restart),
      rollbackPlan: this.generateRollbackPlan(device),
      validationTests: this.generateUpdateValidation(device)
    };

    // Update device record
    if (firmware) device.firmware = firmware;
    if (config) device.config = { ...device.config, ...config };
    device.lastUpdated = new Date().toISOString();

    return updatePlan;
  }

  // Helper methods for generating various outputs
  generateSupabaseRegistration(device) {
    return {
      sql: `-- Register device in Supabase
INSERT INTO registered_devices (
  device_id, device_type, location, config, status, registered_at
) VALUES (
  '${device.id}',
  '${device.type}',
  '${device.location}',
  '${JSON.stringify(device.config)}'::jsonb,
  'active',
  NOW()
);`,
      
      cli: [
        `supabase db reset`,
        `supabase migration new register_${device.id}`,
        `supabase db push`
      ]
    };
  }

  generateEdgeSetup(device) {
    return {
      script: `#!/bin/bash
# Edge setup for ${device.type} device: ${device.id}

# Install dependencies
${device.type === 'camera' ? 'apt-get install -y opencv-python ffmpeg' : ''}
${device.type === 'sensor' ? 'pip install sensors-library' : ''}

# Configure device
echo "DEVICE_ID=${device.id}" > /etc/device.env
echo "DEVICE_TYPE=${device.type}" >> /etc/device.env
echo "SUPABASE_URL=\${SUPABASE_URL}" >> /etc/device.env
echo "SUPABASE_KEY=\${SUPABASE_ANON_KEY}" >> /etc/device.env

# Start edge processor
python3 /opt/edge-processor-${device.type}.py --config /etc/device.env
`,
      
      docker: `# Docker setup for ${device.id}
FROM python:3.9-slim

WORKDIR /app
COPY edge-processor-${device.type}.py .
COPY requirements.txt .

RUN pip install -r requirements.txt

ENV DEVICE_ID=${device.id}
ENV DEVICE_TYPE=${device.type}

CMD ["python", "edge-processor-${device.type}.py"]`
    };
  }

  generateMonitoringSetup(device) {
    return {
      dashboard: `-- Create monitoring dashboard for ${device.id}
CREATE OR REPLACE VIEW device_${device.id}_metrics AS
SELECT 
  timestamp,
  device_id,
  payload->>'status' as status,
  payload->>'battery_level' as battery_level,
  payload->>'signal_strength' as signal_strength,
  payload->>'error_count' as error_count
FROM bronze_${device.type}_data 
WHERE device_id = '${device.id}'
ORDER BY timestamp DESC;`,

      alerts: `-- Alert rules for ${device.id}
SELECT cron.schedule(
  'device-${device.id}-health-check',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT check_device_health('${device.id}');
  $$
);`
    };
  }

  generateCommonIssues(deviceType) {
    const issues = {
      camera: [
        { issue: 'No video feed', solution: 'Check network connection and RTSP URL' },
        { issue: 'Poor image quality', solution: 'Adjust lighting and focus settings' },
        { issue: 'High latency', solution: 'Reduce resolution or frame rate' }
      ],
      sensor: [
        { issue: 'Inaccurate readings', solution: 'Calibrate sensor and check environmental factors' },
        { issue: 'Intermittent data', solution: 'Check power supply and wireless connection' },
        { issue: 'Sensor drift', solution: 'Perform periodic recalibration' }
      ],
      gateway: [
        { issue: 'Device disconnections', solution: 'Check network stability and range' },
        { issue: 'Data loss', solution: 'Increase buffer size and check storage' },
        { issue: 'Protocol errors', solution: 'Verify protocol compatibility and settings' }
      ]
    };

    return issues[deviceType] || [];
  }

  generateDiagnosticCommands(device) {
    return [
      `ping -c 4 ${device.id}.local`,
      `curl -s http://${device.id}/health`,
      `ssh device@${device.id} 'cat /var/log/device.log | tail -50'`,
      `supabase sql "SELECT COUNT(*) FROM bronze_${device.type}_data WHERE device_id = '${device.id}' AND timestamp > NOW() - INTERVAL '1 hour'"`,
      `supabase functions invoke check-device-status -d '{"device_id": "${device.id}"}'`
    ];
  }

  generateHealthChecks(device) {
    return {
      connectivity: `curl -f http://${device.id}/ping`,
      dataFlow: `supabase sql "SELECT timestamp FROM bronze_${device.type}_data WHERE device_id = '${device.id}' ORDER BY timestamp DESC LIMIT 1"`,
      storage: `ssh device@${device.id} 'df -h'`,
      memory: `ssh device@${device.id} 'free -m'`,
      processes: `ssh device@${device.id} 'ps aux | grep edge-processor'`
    };
  }

  generateBulkDeployment(devices) {
    return {
      ansible: `# Ansible playbook for bulk deployment
- hosts: all
  tasks:
    - name: Deploy edge processor
      copy:
        src: edge-processor-{{ device_type }}.py
        dest: /opt/edge-processor.py
        mode: '0755'
    
    - name: Configure device
      template:
        src: device.env.j2
        dest: /etc/device.env
    
    - name: Start service
      systemd:
        name: edge-processor
        state: started
        enabled: yes`,

      terraform: `# Terraform for cloud infrastructure
resource "supabase_table" "device_data" {
  count = ${devices.length}
  name  = "bronze_\${var.device_types[count.index]}_data"
  
  column {
    name = "device_id"
    type = "varchar(100)"
  }
  
  column {
    name = "payload"
    type = "jsonb"
  }
}`
    };
  }

  generateScalingRecommendations(deviceType, quantity) {
    const recommendations = [];

    if (quantity > 50) {
      recommendations.push('Consider implementing device clustering for better management');
      recommendations.push('Set up load balancing for data ingestion endpoints');
    }

    if (quantity > 100) {
      recommendations.push('Implement hierarchical device management with gateways');
      recommendations.push('Use database sharding for better performance');
    }

    if (deviceType === 'camera' && quantity > 20) {
      recommendations.push('Consider edge AI processing to reduce bandwidth');
      recommendations.push('Implement adaptive bitrate streaming');
    }

    return recommendations;
  }

  generateUpdateSteps(device, firmware, config, restart) {
    const steps = [
      '1. Backup current configuration',
      '2. Download firmware/config package',
      '3. Verify package integrity',
      '4. Apply configuration changes',
    ];

    if (firmware) {
      steps.push('5. Install firmware update');
    }

    if (restart) {
      steps.push('6. Restart device');
      steps.push('7. Verify device comes online');
    }

    steps.push('8. Run validation tests');
    steps.push('9. Confirm update success');

    return steps;
  }

  generateRollbackPlan(device) {
    return {
      triggers: [
        'Device fails to come online after 5 minutes',
        'Validation tests fail',
        'Data ingestion stops for more than 10 minutes'
      ],
      commands: [
        `ssh device@${device.id} 'systemctl stop edge-processor'`,
        `ssh device@${device.id} 'cp /opt/backup/edge-processor.py /opt/edge-processor.py'`,
        `ssh device@${device.id} 'cp /opt/backup/device.env /etc/device.env'`,
        `ssh device@${device.id} 'systemctl start edge-processor'`
      ],
      validation: [
        'Check device connectivity',
        'Verify data flow resumption',
        'Confirm all services running'
      ]
    };
  }
}