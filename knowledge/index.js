export const CLOUD_COMMANDS = {
  vercel: {
    deploy: {
      command: 'vercel deploy --prod',
      description: 'Deploy to production',
      flags: ['--prod', '--yes', '--force'],
      examples: [
        'vercel deploy --prod --yes',
        'vercel deploy --force'
      ]
    },
    env: {
      command: 'vercel env',
      description: 'Manage environment variables',
      subcommands: ['ls', 'add', 'rm', 'pull'],
      examples: [
        'vercel env ls',
        'vercel env add VARIABLE_NAME',
        'vercel env pull .env.local'
      ]
    },
    logs: {
      command: 'vercel logs',
      description: 'View deployment logs',
      flags: ['--limit', '--since'],
      examples: [
        'vercel logs --limit 100',
        'vercel logs my-app.vercel.app'
      ]
    }
  },
  supabase: {
    start: {
      command: 'supabase start',
      description: 'Start local development environment',
      flags: ['--debug'],
      examples: ['supabase start']
    },
    migration: {
      command: 'supabase migration',
      description: 'Database migration management',
      subcommands: ['new', 'list', 'up', 'down'],
      examples: [
        'supabase migration new create_users_table',
        'supabase migration list',
        'supabase migration up'
      ]
    },
    gen: {
      command: 'supabase gen types typescript',
      description: 'Generate TypeScript types',
      flags: ['--linked', '--project-id'],
      examples: [
        'supabase gen types typescript --linked > src/database.types.ts',
        'supabase gen types typescript --project-id abc123'
      ]
    },
    functions: {
      command: 'supabase functions',
      description: 'Edge functions management',
      subcommands: ['new', 'deploy', 'delete', 'serve'],
      examples: [
        'supabase functions new hello-world',
        'supabase functions deploy hello-world',
        'supabase functions serve'
      ]
    }
  },
  azure: {
    group: {
      command: 'az group',
      description: 'Resource group management',
      subcommands: ['create', 'delete', 'list', 'show'],
      examples: [
        'az group create --name MyResourceGroup --location eastus',
        'az group list --output table',
        'az group delete --name MyResourceGroup --yes'
      ]
    },
    vm: {
      command: 'az vm',
      description: 'Virtual machine management',
      subcommands: ['create', 'start', 'stop', 'delete', 'list'],
      examples: [
        'az vm create --resource-group MyRG --name MyVM --image UbuntuLTS',
        'az vm list --output table',
        'az vm start --resource-group MyRG --name MyVM'
      ]
    },
    webapp: {
      command: 'az webapp',
      description: 'Web app management',
      subcommands: ['create', 'deploy', 'restart', 'delete'],
      examples: [
        'az webapp create --resource-group MyRG --plan MyPlan --name MyApp',
        'az webapp deployment source config --name MyApp --repo-url https://github.com/user/repo'
      ]
    }
  }
};

export const FRONTEND_PATTERNS = {
  react: {
    hooks: {
      useState: {
        template: 'const [state, setState] = useState(initialValue);',
        description: 'State management hook',
        examples: [
          'const [count, setCount] = useState(0);',
          'const [user, setUser] = useState(null);'
        ]
      },
      useEffect: {
        template: 'useEffect(() => { /* effect */ }, [dependencies]);',
        description: 'Side effect hook',
        examples: [
          'useEffect(() => { fetchData(); }, []);',
          'useEffect(() => { return cleanup; }, [dependency]);'
        ]
      },
      useContext: {
        template: 'const value = useContext(Context);',
        description: 'Context consumption hook',
        examples: [
          'const theme = useContext(ThemeContext);',
          'const user = useContext(AuthContext);'
        ]
      }
    },
    patterns: {
      component: {
        functional: `interface Props {
  // props definition
}

export function Component({ prop }: Props) {
  return (
    <div>
      {/* JSX content */}
    </div>
  );
}`,
        memo: `import { memo } from 'react';

export const Component = memo(function Component({ prop }: Props) {
  return <div>{prop}</div>;
});`
      }
    }
  },
  tailwind: {
    layout: {
      flexCenter: 'flex justify-center items-center',
      grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
      container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
    },
    components: {
      button: 'px-4 py-2 rounded-lg font-medium transition-colors',
      card: 'bg-white rounded-lg shadow-md p-6',
      input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2'
    },
    responsive: {
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },
      patterns: {
        mobileFirst: 'text-sm md:text-base lg:text-lg',
        hideOnMobile: 'hidden md:block',
        stackOnMobile: 'flex flex-col md:flex-row'
      }
    }
  },
  typescript: {
    interfaces: {
      component: `interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}`,
      api: `interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}`
    },
    types: {
      event: 'React.FormEvent<HTMLFormElement>',
      handler: '(event: React.ChangeEvent<HTMLInputElement>) => void',
      ref: 'React.RefObject<HTMLDivElement>'
    }
  }
};

export const DATABASE_PATTERNS = {
  postgresql: {
    queries: {
      select: 'SELECT column1, column2 FROM table_name WHERE condition ORDER BY column1 LIMIT 10;',
      insert: 'INSERT INTO table_name (column1, column2) VALUES ($1, $2) RETURNING id;',
      update: 'UPDATE table_name SET column1 = $1 WHERE id = $2;',
      delete: 'DELETE FROM table_name WHERE condition;'
    },
    migrations: {
      createTable: `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`,
      addColumn: 'ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);',
      addIndex: 'CREATE INDEX idx_table_column ON table_name(column_name);'
    }
  },
  supabase: {
    rpc: {
      typescript: `const { data, error } = await supabase
  .rpc('function_name', { param1: 'value1' });`,
      sql: `CREATE OR REPLACE FUNCTION function_name(param1 TEXT)
RETURNS TABLE(result_column TEXT) AS $$
BEGIN
  RETURN QUERY SELECT column FROM table WHERE condition = param1;
END;
$$ LANGUAGE plpgsql;`
    },
    realtime: {
      subscribe: `const subscription = supabase
  .channel('table-changes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'table_name' },
    (payload) => console.log(payload)
  )
  .subscribe();`
    }
  }
};

export const COMMON_FIXES = {
  tailwind: {
    'classes not applying': {
      solution: 'Check content paths in tailwind.config.js',
      code: `module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  // ... rest of config
}`
    },
    'build size too large': {
      solution: 'Enable JIT mode and purge unused CSS',
      code: `module.exports = {
  mode: 'jit',
  purge: ['./src/**/*.{js,jsx,ts,tsx}'],
  // ... rest of config
}`
    }
  },
  react: {
    'useEffect dependency warning': {
      solution: 'Add missing dependencies to dependency array',
      code: `useEffect(() => {
  fetchData();
}, [fetchData]); // Add fetchData to dependencies`
    },
    'component re-renders too much': {
      solution: 'Use React.memo or useMemo for optimization',
      code: `const MemoizedComponent = React.memo(Component);
// or
const expensiveValue = useMemo(() => computeExpensiveValue(props), [props]);`
    }
  },
  typescript: {
    'Property does not exist': {
      solution: 'Define proper interface or type',
      code: `interface User {
  id: string;
  name: string;
  email?: string; // Optional property
}`
    }
  }
};

export const IOT_EDGE_PATTERNS = {
  deviceTypes: {
    camera: {
      capabilities: ['object_detection', 'motion_detection', 'face_recognition'],
      dataTypes: ['image', 'video', 'metadata'],
      protocols: ['rtsp', 'http', 'websocket'],
      optimization: ['compression', 'edge_ai', 'adaptive_quality']
    },
    sensor: {
      capabilities: ['environmental_monitoring', 'predictive_maintenance'],
      dataTypes: ['telemetry', 'alerts', 'threshold_events'],
      protocols: ['mqtt', 'http', 'lorawan'],
      optimization: ['batching', 'filtering', 'local_processing']
    },
    gateway: {
      capabilities: ['device_coordination', 'data_aggregation', 'protocol_translation'],
      dataTypes: ['aggregated_data', 'device_status', 'network_metrics'],
      protocols: ['wifi', 'ethernet', 'cellular'],
      optimization: ['load_balancing', 'caching', 'compression']
    }
  },
  
  pipelines: {
    realtime: {
      ingestion: 'Webhook endpoints with immediate processing',
      processing: 'Stream processing with low latency',
      storage: 'Time-series optimized tables',
      monitoring: 'Real-time dashboards and alerts'
    },
    batch: {
      ingestion: 'Scheduled data collection and bulk upload',
      processing: 'Batch processing with high throughput',
      storage: 'Partitioned tables with compression',
      monitoring: 'Batch job status and performance metrics'
    },
    hybrid: {
      ingestion: 'Combined real-time and batch ingestion',
      processing: 'Adaptive processing based on data characteristics',
      storage: 'Multi-tier storage with automatic archiving',
      monitoring: 'Comprehensive monitoring across all components'
    }
  },

  optimizations: {
    edge: [
      'Local data filtering and preprocessing',
      'Adaptive sampling based on network conditions',
      'Edge AI inference to reduce data transmission',
      'Local caching during connectivity issues'
    ],
    cloud: [
      'Auto-scaling based on device count and data volume',
      'Data compression and archiving strategies',
      'Multi-region deployment for global coverage',
      'Real-time analytics with materialized views'
    ],
    hybrid: [
      'Dynamic load balancing between edge and cloud',
      'Intelligent data routing based on priority',
      'Gradual migration of processing to edge',
      'Unified monitoring across edge and cloud'
    ]
  },

  commands: {
    supabase: {
      setup: [
        'supabase init',
        'supabase migration new create_device_tables',
        'supabase functions new ingest-device-data',
        'supabase gen types typescript --linked'
      ],
      deployment: [
        'supabase db push',
        'supabase functions deploy ingest-device-data',
        'supabase functions deploy process-device-data'
      ],
      monitoring: [
        'supabase logs --type functions',
        'supabase dashboard',
        'supabase sql "SELECT * FROM device_metrics_hourly"'
      ]
    },
    
    edge: {
      setup: [
        'curl -O https://cdn.com/edge-processor.py',
        'pip install -r requirements.txt',
        'systemctl enable edge-processor'
      ],
      deployment: [
        'ansible-playbook deploy-edge.yml',
        'docker-compose up -d edge-processor',
        'kubectl apply -f edge-deployment.yaml'
      ],
      monitoring: [
        'docker logs edge-processor',
        'systemctl status edge-processor',
        'journalctl -u edge-processor -f'
      ]
    }
  }
};

export const DEPLOYMENT_WORKFLOWS = {
  vercel: {
    'react-app': [
      'npm run build',
      'vercel deploy --prod',
      'vercel env pull .env.local'
    ],
    'nextjs-supabase': [
      'npm install @supabase/supabase-js',
      'vercel env add SUPABASE_URL',
      'vercel env add SUPABASE_ANON_KEY',
      'vercel deploy --prod'
    ]
  },
  supabase: {
    'local-development': [
      'supabase init',
      'supabase start',
      'supabase gen types typescript --linked > src/database.types.ts'
    ],
    'production-deploy': [
      'supabase link --project-ref your-project-ref',
      'supabase db push',
      'supabase functions deploy'
    ]
  }
};

export const ERROR_PATTERNS = {
  compilation: [
    {
      pattern: /Module not found: Can't resolve/,
      solution: 'Install missing dependency',
      command: 'npm install {module}'
    },
    {
      pattern: /Property '.*' does not exist on type/,
      solution: 'Define proper TypeScript interface',
      template: 'interface {Type} { {property}: {type}; }'
    }
  ],
  runtime: [
    {
      pattern: /Cannot read property '.*' of undefined/,
      solution: 'Add null/undefined checks',
      template: 'object?.property || defaultValue'
    },
    {
      pattern: /Failed to fetch/,
      solution: 'Check API endpoint and CORS settings',
      debugging: ['Check network tab', 'Verify API URL', 'Check CORS headers']
    }
  ]
};