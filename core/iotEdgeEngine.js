import chalk from 'chalk';

export class IoTEdgeEngine {
  constructor() {
    this.deviceTypes = {
      camera: {
        patterns: ['cam', 'camera', 'vision', 'video'],
        capabilities: ['object_detection', 'face_recognition', 'motion_detection'],
        dataTypes: ['image', 'video', 'metadata']
      },
      sensor: {
        patterns: ['sensor', 'temp', 'humidity', 'pressure', 'accelerometer'],
        capabilities: ['environmental_monitoring', 'predictive_maintenance'],
        dataTypes: ['telemetry', 'alerts', 'threshold_events']
      },
      gateway: {
        patterns: ['gateway', 'hub', 'coordinator'],
        capabilities: ['data_aggregation', 'protocol_translation', 'edge_processing'],
        dataTypes: ['aggregated_data', 'device_status', 'network_metrics']
      },
      pos: {
        patterns: ['pos', 'retail', 'checkout', 'scanner'],
        capabilities: ['transaction_processing', 'inventory_tracking'],
        dataTypes: ['transactions', 'product_scans', 'customer_data']
      }
    };

    this.pipelineTemplates = {
      realtime: {
        ingestion: this.generateRealtimeIngestion,
        processing: this.generateRealtimeProcessing,
        storage: this.generateRealtimeStorage
      },
      batch: {
        ingestion: this.generateBatchIngestion,
        processing: this.generateBatchProcessing,
        storage: this.generateBatchStorage
      },
      hybrid: {
        ingestion: this.generateHybridIngestion,
        processing: this.generateHybridProcessing,
        storage: this.generateHybridStorage
      }
    };

    this.edgeOptimizations = {
      compression: ['zstd', 'lz4', 'gzip'],
      batching: ['time_window', 'count_threshold', 'size_threshold'],
      caching: ['redis', 'local_storage', 'memory_cache'],
      filtering: ['quality_threshold', 'duplicate_detection', 'anomaly_filtering']
    };
  }

  async generatePipeline(parsed) {
    const deviceType = this.detectDeviceType(parsed.cleaned);
    const pipelineType = this.detectPipelineType(parsed.cleaned);
    const requirements = this.extractRequirements(parsed.cleaned);

    console.log(chalk.cyan(`🔧 Generating ${pipelineType} IoT pipeline for ${deviceType} devices`));

    const pipeline = {
      deviceType: deviceType,
      pipelineType: pipelineType,
      architecture: await this.generateArchitecture(deviceType, pipelineType, requirements),
      ingestion: await this.generateIngestionLayer(deviceType, pipelineType),
      processing: await this.generateProcessingLayer(deviceType, pipelineType, requirements),
      storage: await this.generateStorageLayer(deviceType, requirements),
      monitoring: await this.generateMonitoring(deviceType, pipelineType),
      deployment: await this.generateDeployment(deviceType, pipelineType),
      security: await this.generateSecurity(deviceType),
      optimizations: this.suggestOptimizations(deviceType, pipelineType, requirements)
    };

    return pipeline;
  }

  detectDeviceType(input) {
    for (const [type, config] of Object.entries(this.deviceTypes)) {
      if (config.patterns.some(pattern => input.includes(pattern))) {
        return type;
      }
    }
    return 'generic';
  }

  detectPipelineType(input) {
    if (input.includes('realtime') || input.includes('stream') || input.includes('live')) {
      return 'realtime';
    }
    if (input.includes('batch') || input.includes('scheduled') || input.includes('bulk')) {
      return 'batch';
    }
    if (input.includes('hybrid') || input.includes('mixed')) {
      return 'hybrid';
    }
    return 'realtime'; // Default for IoT
  }

  extractRequirements(input) {
    return {
      latency: this.extractLatencyRequirement(input),
      throughput: this.extractThroughputRequirement(input),
      storage: this.extractStorageRequirement(input),
      analytics: this.extractAnalyticsRequirement(input),
      ml: input.includes('ml') || input.includes('ai') || input.includes('model'),
      compliance: this.extractComplianceRequirement(input)
    };
  }

  async generateArchitecture(deviceType, pipelineType, requirements) {
    const architecture = {
      edge: this.generateEdgeLayer(deviceType, requirements),
      ingestion: this.generateIngestionArchitecture(pipelineType),
      processing: this.generateProcessingArchitecture(pipelineType, requirements),
      storage: this.generateStorageArchitecture(requirements),
      analytics: this.generateAnalyticsArchitecture(requirements)
    };

    return {
      description: `${pipelineType} IoT pipeline for ${deviceType} devices`,
      components: architecture,
      dataFlow: this.generateDataFlow(deviceType, pipelineType),
      scalability: this.generateScalabilityPattern(requirements)
    };
  }

  async generateIngestionLayer(deviceType, pipelineType) {
    if (pipelineType === 'realtime') {
      return this.generateRealtimeIngestion(deviceType);
    } else if (pipelineType === 'batch') {
      return this.generateBatchIngestion(deviceType);
    } else {
      return this.generateHybridIngestion(deviceType);
    }
  }

  generateRealtimeIngestion(deviceType) {
    return {
      type: 'realtime',
      components: {
        webhook: {
          code: `// supabase/functions/ingest-device-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const { device_id, store_id, payload, timestamp } = await req.json()
    
    // Validate device authentication
    const { data: device } = await supabase
      .from('registered_devices')
      .select('id, device_type, status')
      .eq('device_id', device_id)
      .single()

    if (!device || device.status !== 'active') {
      return new Response('Unauthorized device', { status: 401 })
    }

    // Insert raw data
    const { data, error } = await supabase
      .from('bronze_${deviceType}_data')
      .insert([{
        device_id: device_id,
        store_id: store_id,
        payload: JSON.stringify(payload),
        timestamp: timestamp || new Date().toISOString(),
        processed: false
      }])

    if (error) throw error

    // Trigger real-time processing
    await supabase.functions.invoke('process-${deviceType}-data', {
      body: { record_id: data[0].id, device_type: '${deviceType}' }
    })

    return new Response(JSON.stringify({ 
      success: true, 
      record_id: data[0].id 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Ingestion error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})`,
          deployment: `supabase functions deploy ingest-${deviceType}-data --project-ref your-project-id`
        },
        streaming: {
          description: 'WebSocket or Server-Sent Events for real-time data streaming',
          implementation: 'Supabase Realtime or custom WebSocket server'
        }
      },
      commands: [
        `supabase functions new ingest-${deviceType}-data`,
        `supabase functions deploy ingest-${deviceType}-data`,
        `supabase gen types typescript --linked > src/database.types.ts`
      ]
    };
  }

  generateBatchIngestion(deviceType) {
    return {
      type: 'batch',
      components: {
        scheduler: {
          code: `// supabase/functions/batch-ingest-${deviceType}/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { batch_data, source_device, batch_id } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Process batch data
    const processedRecords = batch_data.map(record => ({
      device_id: source_device,
      payload: JSON.stringify(record.data),
      timestamp: record.timestamp,
      batch_id: batch_id,
      processed: false
    }))

    // Bulk insert with conflict resolution
    const { data, error } = await supabase
      .from('bronze_${deviceType}_data')
      .upsert(processedRecords, { 
        onConflict: 'device_id,timestamp',
        ignoreDuplicates: true 
      })

    if (error) throw error

    // Schedule batch processing
    await supabase.functions.invoke('process-batch-${deviceType}', {
      body: { batch_id, record_count: processedRecords.length }
    })

    return new Response(JSON.stringify({
      success: true,
      processed_count: processedRecords.length,
      batch_id: batch_id
    }))

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 })
  }
})`,
          schedule: 'pg_cron or external scheduler (every 5 minutes)'
        }
      },
      commands: [
        `supabase functions new batch-ingest-${deviceType}`,
        `supabase functions deploy batch-ingest-${deviceType}`
      ]
    };
  }

  async generateProcessingLayer(deviceType, pipelineType, requirements) {
    return {
      edgeProcessing: this.generateEdgeProcessing(deviceType, requirements),
      cloudProcessing: this.generateCloudProcessing(deviceType, pipelineType, requirements),
      mlInference: requirements.ml ? this.generateMLInference(deviceType) : null,
      dataEnrichment: this.generateDataEnrichment(deviceType),
      validation: this.generateValidation(deviceType)
    };
  }

  generateEdgeProcessing(deviceType, requirements) {
    return {
      description: 'On-device processing to reduce bandwidth and latency',
      code: `# Edge processing script (Python)
import json
import time
import requests
from datetime import datetime
${deviceType === 'camera' ? 'import cv2\nimport numpy as np' : ''}

class EdgeProcessor:
    def __init__(self, device_id, supabase_url, api_key):
        self.device_id = device_id
        self.supabase_url = supabase_url
        self.api_key = api_key
        self.batch_buffer = []
        self.last_upload = time.time()
        
    def process_${deviceType}_data(self, raw_data):
        """Process ${deviceType} data at the edge"""
        try:
            # Apply edge filtering
            if not self.quality_check(raw_data):
                return None
                
            # Extract features
            processed = self.extract_features(raw_data)
            
            # Add metadata
            processed['device_id'] = self.device_id
            processed['timestamp'] = datetime.utcnow().isoformat()
            processed['edge_processed'] = True
            
            return processed
            
        except Exception as e:
            print(f"Edge processing error: {e}")
            return None
    
    def quality_check(self, data):
        """Implement quality filtering logic"""
        ${deviceType === 'camera' ? `
        # For camera data: check image quality
        if data.get('brightness', 0) < 10:
            return False
        if data.get('blur_score', 0) > 0.8:
            return False` : `
        # For sensor data: check value ranges
        if not data.get('value') or data['value'] < 0:
            return False`}
        return True
    
    def extract_features(self, data):
        """Extract relevant features from raw data"""
        ${deviceType === 'camera' ? `
        # Computer vision feature extraction
        return {
            'objects_detected': data.get('objects', []),
            'confidence_scores': data.get('confidences', []),
            'bounding_boxes': data.get('boxes', []),
            'processed_at_edge': True
        }` : `
        # Sensor data aggregation
        return {
            'value': data['value'],
            'unit': data.get('unit', ''),
            'quality_score': self.calculate_quality(data),
            'anomaly_detected': self.detect_anomaly(data)
        }`}
    
    def transmit_batch(self):
        """Send batch data to cloud"""
        if not self.batch_buffer:
            return
            
        payload = {
            'batch_data': self.batch_buffer,
            'source_device': self.device_id,
            'batch_id': f"{self.device_id}_{int(time.time())}"
        }
        
        try:
            response = requests.post(
                f"{self.supabase_url}/functions/v1/batch-ingest-${deviceType}",
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                },
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"Batch uploaded: {len(self.batch_buffer)} records")
                self.batch_buffer.clear()
                self.last_upload = time.time()
            else:
                print(f"Upload failed: {response.status_code}")
                
        except Exception as e:
            print(f"Transmission error: {e}")

# Usage example
processor = EdgeProcessor('device-001', 'https://project.supabase.co', 'your-api-key')

while True:
    # Simulate ${deviceType} data collection
    raw_data = collect_${deviceType}_data()
    
    processed = processor.process_${deviceType}_data(raw_data)
    if processed:
        processor.batch_buffer.append(processed)
    
    # Upload batch every 60 seconds or 100 records
    if (time.time() - processor.last_upload > 60 or 
        len(processor.batch_buffer) >= 100):
        processor.transmit_batch()
    
    time.sleep(${deviceType === 'camera' ? '0.1' : '1'})  # Adjust sampling rate`,
      
      optimizations: [
        'Implement data compression before transmission',
        'Use adaptive sampling based on network conditions',
        'Cache data locally during connectivity issues',
        'Implement priority queuing for critical data'
      ]
    };
  }

  async generateStorageLayer(deviceType, requirements) {
    return {
      schema: this.generateStorageSchema(deviceType),
      partitioning: this.generatePartitioning(deviceType, requirements),
      indexing: this.generateIndexing(deviceType),
      retention: this.generateRetention(requirements),
      compression: this.generateCompression(deviceType)
    };
  }

  generateStorageSchema(deviceType) {
    return {
      bronze: `-- Bronze layer: Raw device data
CREATE TABLE bronze_${deviceType}_data (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  store_id VARCHAR(100),
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id VARCHAR(200),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('bronze_${deviceType}_data', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Indexes for common queries
CREATE INDEX idx_${deviceType}_device_timestamp ON bronze_${deviceType}_data (device_id, timestamp DESC);
CREATE INDEX idx_${deviceType}_processed ON bronze_${deviceType}_data (processed, timestamp) WHERE NOT processed;
CREATE INDEX idx_${deviceType}_store ON bronze_${deviceType}_data (store_id, timestamp DESC);`,

      silver: `-- Silver layer: Cleaned and enriched data
CREATE TABLE silver_${deviceType}_analytics (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL,
  store_id VARCHAR(100),
  ${this.getDeviceSpecificColumns(deviceType)},
  quality_score DECIMAL(3,2),
  anomaly_detected BOOLEAN DEFAULT FALSE,
  enrichment_metadata JSONB,
  source_record_id BIGINT REFERENCES bronze_${deviceType}_data(id),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  timestamp TIMESTAMPTZ NOT NULL
);

SELECT create_hypertable('silver_${deviceType}_analytics', 'timestamp', chunk_time_interval => INTERVAL '1 hour');`,

      gold: `-- Gold layer: Business-ready aggregated data
CREATE TABLE gold_${deviceType}_insights (
  id BIGSERIAL PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  ${this.getAggregatedColumns(deviceType)},
  total_events INTEGER,
  avg_quality_score DECIMAL(3,2),
  anomaly_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('gold_${deviceType}_insights', 'hour_bucket', chunk_time_interval => INTERVAL '1 week');`
    };
  }

  async generateMonitoring(deviceType, pipelineType) {
    return {
      metrics: {
        deviceMetrics: [
          'device_online_status',
          'data_transmission_rate',
          'battery_level',
          'error_rate',
          'data_quality_score'
        ],
        pipelineMetrics: [
          'ingestion_throughput',
          'processing_latency',
          'error_count',
          'data_freshness',
          'storage_utilization'
        ]
      },
      alerts: this.generateAlerts(deviceType),
      dashboards: this.generateDashboards(deviceType, pipelineType)
    };
  }

  async generateDeployment(deviceType, pipelineType) {
    return {
      supabase: [
        '# Deploy Supabase functions',
        `supabase functions deploy ingest-${deviceType}-data`,
        `supabase functions deploy process-${deviceType}-data`,
        'supabase gen types typescript --linked > src/database.types.ts'
      ],
      vercel: [
        '# Deploy monitoring dashboard',
        'vercel env add SUPABASE_URL',
        'vercel env add SUPABASE_ANON_KEY',
        'npm run build && vercel deploy --prod'
      ],
      edge: [
        '# Edge device setup',
        `curl -O https://your-cdn.com/edge-processor-${deviceType}.py`,
        'pip install -r requirements.txt',
        'python edge-processor.py --device-id DEVICE_001'
      ]
    };
  }

  // Helper methods
  getDeviceSpecificColumns(deviceType) {
    const columns = {
      camera: `
  objects_detected JSONB,
  confidence_scores DECIMAL[],
  bounding_boxes JSONB,
  image_metadata JSONB`,
      sensor: `
  sensor_value DECIMAL(10,4),
  unit VARCHAR(20),
  calibration_offset DECIMAL(6,4)`,
      pos: `
  transaction_id VARCHAR(100),
  items_scanned JSONB,
  total_amount DECIMAL(10,2)`,
      gateway: `
  connected_devices INTEGER,
  network_status VARCHAR(20),
  throughput_mbps DECIMAL(6,2)`
    };
    return columns[deviceType] || 'data_value DECIMAL(10,4)';
  }

  getAggregatedColumns(deviceType) {
    const columns = {
      camera: `
  avg_objects_per_frame DECIMAL(4,2),
  avg_confidence DECIMAL(3,2),
  unique_objects_detected INTEGER`,
      sensor: `
  avg_sensor_value DECIMAL(10,4),
  min_sensor_value DECIMAL(10,4),
  max_sensor_value DECIMAL(10,4)`,
      pos: `
  total_transactions INTEGER,
  total_revenue DECIMAL(12,2),
  avg_transaction_value DECIMAL(8,2)`,
      gateway: `
  avg_connected_devices DECIMAL(4,1),
  avg_throughput DECIMAL(6,2),
  uptime_percentage DECIMAL(5,2)`
    };
    return columns[deviceType] || 'avg_data_value DECIMAL(10,4)';
  }

  suggestOptimizations(deviceType, pipelineType, requirements) {
    const optimizations = [
      'Enable compression on JSONB columns to reduce storage costs',
      'Implement data partitioning by device_id for better query performance',
      'Use materialized views for frequently accessed aggregations'
    ];

    if (deviceType === 'camera') {
      optimizations.push('Implement image compression before storage');
      optimizations.push('Use object detection confidence thresholds to filter noise');
    }

    if (pipelineType === 'realtime') {
      optimizations.push('Implement connection pooling for high-throughput ingestion');
      optimizations.push('Use CDC (Change Data Capture) for real-time analytics');
    }

    if (requirements.latency === 'low') {
      optimizations.push('Deploy edge functions closer to devices');
      optimizations.push('Implement local caching strategies');
    }

    return optimizations;
  }

  extractLatencyRequirement(input) {
    if (input.includes('realtime') || input.includes('immediate')) return 'low';
    if (input.includes('batch') || input.includes('delayed')) return 'high';
    return 'medium';
  }

  extractThroughputRequirement(input) {
    if (input.includes('high volume') || input.includes('thousands')) return 'high';
    if (input.includes('low volume') || input.includes('few')) return 'low';
    return 'medium';
  }

  extractStorageRequirement(input) {
    if (input.includes('long term') || input.includes('archive')) return 'long_term';
    if (input.includes('temporary') || input.includes('cache')) return 'temporary';
    return 'standard';
  }

  extractAnalyticsRequirement(input) {
    return input.includes('analytics') || input.includes('insights') || input.includes('reporting');
  }

  extractComplianceRequirement(input) {
    const complianceKeywords = ['gdpr', 'hipaa', 'sox', 'compliance', 'audit'];
    return complianceKeywords.some(keyword => input.includes(keyword));
  }
}