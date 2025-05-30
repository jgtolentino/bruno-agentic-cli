import chalk from 'chalk';

export class CloudMastery {
  constructor() {
    this.services = {
      azure: {
        patterns: ['az', 'azure', 'resource group', 'vm', 'webapp', 'storage account'],
        commands: this.getAzureCommands()
      },
      vercel: {
        patterns: ['vercel', 'deploy', 'env', 'domains', 'functions'],
        commands: this.getVercelCommands()
      },
      supabase: {
        patterns: ['supabase', 'database', 'auth', 'storage', 'functions'],
        commands: this.getSupabaseCommands()
      },
      aws: {
        patterns: ['aws', 'ec2', 's3', 'lambda', 'cloudformation'],
        commands: this.getAWSCommands()
      },
      gcp: {
        patterns: ['gcloud', 'gcp', 'compute', 'cloud run', 'app engine'],
        commands: this.getGCPCommands()
      }
    };
    
    this.databases = {
      postgresql: {
        patterns: ['psql', 'postgres', 'pg_dump', 'createdb'],
        commands: this.getPostgreSQLCommands()
      },
      mongodb: {
        patterns: ['mongo', 'mongosh', 'mongodump', 'collection'],
        commands: this.getMongoDBCommands()
      },
      mysql: {
        patterns: ['mysql', 'mysqldump', 'mysqlimport'],
        commands: this.getMySQLCommands()
      }
    };
  }

  detectIntent(query) {
    const lowQuery = query.toLowerCase();
    
    // Cloud service detection
    for (const [service, config] of Object.entries(this.services)) {
      if (config.patterns.some(pattern => lowQuery.includes(pattern))) {
        return { type: 'cloud', service, query: lowQuery };
      }
    }
    
    // Database detection
    for (const [db, config] of Object.entries(this.databases)) {
      if (config.patterns.some(pattern => lowQuery.includes(pattern))) {
        return { type: 'database', service: db, query: lowQuery };
      }
    }
    
    return { type: 'general', query: lowQuery };
  }

  generateCommand(intent, query) {
    if (intent.type === 'cloud') {
      return this.generateCloudCommand(intent.service, query);
    } else if (intent.type === 'database') {
      return this.generateDatabaseCommand(intent.service, query);
    }
    
    return this.generateGenericCommand(query);
  }

  generateCloudCommand(service, query) {
    const commands = this.services[service].commands;
    
    // Intent mapping for common operations
    if (query.includes('list') || query.includes('show')) {
      return commands.list || commands.show;
    }
    if (query.includes('create') || query.includes('new')) {
      return commands.create;
    }
    if (query.includes('deploy') || query.includes('upload')) {
      return commands.deploy;
    }
    if (query.includes('delete') || query.includes('remove')) {
      return commands.delete;
    }
    if (query.includes('status') || query.includes('info')) {
      return commands.status;
    }
    
    return commands.help || `# ${service.toUpperCase()} commands available`;
  }

  generateDatabaseCommand(service, query) {
    const commands = this.databases[service].commands;
    
    if (query.includes('connect') || query.includes('login')) {
      return commands.connect;
    }
    if (query.includes('backup') || query.includes('dump')) {
      return commands.backup;
    }
    if (query.includes('restore') || query.includes('import')) {
      return commands.restore;
    }
    if (query.includes('query') || query.includes('select')) {
      return commands.query;
    }
    
    return commands.help || `# ${service.toUpperCase()} commands available`;
  }

  // Azure Commands
  getAzureCommands() {
    return {
      list: `# List Azure resources
az group list --output table
az vm list --output table
az webapp list --output table`,
      
      create: `# Create Azure resources
az group create --name MyResourceGroup --location eastus
az vm create --resource-group MyResourceGroup --name MyVM --image UbuntuLTS
az webapp create --resource-group MyResourceGroup --plan MyPlan --name MyApp`,
      
      deploy: `# Deploy to Azure
az webapp deployment source config --resource-group MyResourceGroup --name MyApp --repo-url https://github.com/user/repo
az container create --resource-group MyResourceGroup --name MyContainer --image myimage:latest`,
      
      delete: `# Delete Azure resources
az group delete --name MyResourceGroup --yes --no-wait
az vm delete --resource-group MyResourceGroup --name MyVM`,
      
      status: `# Check Azure status
az account show
az vm show --resource-group MyResourceGroup --name MyVM --show-details`,
      
      help: `# Azure CLI help
az --help
az vm --help
az webapp --help`
    };
  }

  // Vercel Commands
  getVercelCommands() {
    return {
      list: `# List Vercel projects and deployments
vercel ls
vercel env ls
vercel domains ls`,
      
      create: `# Create new Vercel project
vercel init
vercel link`,
      
      deploy: `# Deploy to Vercel
vercel deploy
vercel deploy --prod
vercel deploy --yes`,
      
      delete: `# Remove Vercel resources
vercel remove MyProject
vercel env rm VARIABLE_NAME`,
      
      status: `# Check Vercel status
vercel inspect
vercel logs
vercel whoami`,
      
      help: `# Vercel CLI help
vercel --help
vercel deploy --help`
    };
  }

  // Supabase Commands
  getSupabaseCommands() {
    return {
      list: `# List Supabase resources
supabase projects list
supabase functions list
supabase migration list`,
      
      create: `# Create Supabase resources
supabase init
supabase start
supabase migration new create_users_table`,
      
      deploy: `# Deploy to Supabase
supabase db push
supabase functions deploy
supabase gen types typescript --linked > database.types.ts`,
      
      delete: `# Remove Supabase resources
supabase stop
supabase migration down`,
      
      status: `# Check Supabase status
supabase status
supabase db remote commit`,
      
      help: `# Supabase CLI help
supabase --help
supabase db --help`
    };
  }

  // AWS Commands
  getAWSCommands() {
    return {
      list: `# List AWS resources
aws ec2 describe-instances --output table
aws s3 ls
aws lambda list-functions`,
      
      create: `# Create AWS resources
aws ec2 run-instances --image-id ami-12345678 --count 1 --instance-type t2.micro
aws s3 mb s3://my-bucket`,
      
      deploy: `# Deploy to AWS
aws s3 sync ./dist s3://my-bucket
aws lambda update-function-code --function-name MyFunction --zip-file fileb://function.zip`,
      
      delete: `# Delete AWS resources
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
aws s3 rb s3://my-bucket --force`,
      
      status: `# Check AWS status
aws sts get-caller-identity
aws ec2 describe-instance-status`,
      
      help: `# AWS CLI help
aws help
aws ec2 help`
    };
  }

  // GCP Commands
  getGCPCommands() {
    return {
      list: `# List GCP resources
gcloud compute instances list
gcloud app services list
gcloud functions list`,
      
      create: `# Create GCP resources
gcloud compute instances create my-instance --zone=us-central1-a
gcloud app create`,
      
      deploy: `# Deploy to GCP
gcloud app deploy
gcloud functions deploy myFunction --runtime nodejs18`,
      
      delete: `# Delete GCP resources
gcloud compute instances delete my-instance --zone=us-central1-a
gcloud app services delete myservice`,
      
      status: `# Check GCP status
gcloud auth list
gcloud config list`,
      
      help: `# GCP CLI help
gcloud help
gcloud compute help`
    };
  }

  // PostgreSQL Commands
  getPostgreSQLCommands() {
    return {
      connect: `# Connect to PostgreSQL
psql -h localhost -U username -d database_name
psql postgresql://username:password@localhost:5432/database_name`,
      
      backup: `# Backup PostgreSQL database
pg_dump -h localhost -U username database_name > backup.sql
pg_dump -h localhost -U username -t table_name database_name > table_backup.sql`,
      
      restore: `# Restore PostgreSQL database
psql -h localhost -U username database_name < backup.sql
pg_restore -h localhost -U username -d database_name backup.dump`,
      
      query: `# Query PostgreSQL
psql -c "SELECT * FROM users LIMIT 10;"
psql -c "\\dt"  # List tables`,
      
      help: `# PostgreSQL help
psql --help
pg_dump --help`
    };
  }

  // MongoDB Commands
  getMongoDBCommands() {
    return {
      connect: `# Connect to MongoDB
mongosh
mongosh "mongodb://localhost:27017/mydb"`,
      
      backup: `# Backup MongoDB
mongodump --db mydb --out ./backup
mongodump --collection mycollection --db mydb`,
      
      restore: `# Restore MongoDB
mongorestore ./backup
mongorestore --db mydb ./backup/mydb`,
      
      query: `# Query MongoDB
mongosh --eval "db.users.find().limit(10)"
mongosh --eval "show collections"`,
      
      help: `# MongoDB help
mongosh --help
mongodump --help`
    };
  }

  // MySQL Commands
  getMySQLCommands() {
    return {
      connect: `# Connect to MySQL
mysql -h localhost -u username -p database_name
mysql -h localhost -u username -p`,
      
      backup: `# Backup MySQL
mysqldump -u username -p database_name > backup.sql
mysqldump -u username -p --all-databases > all_backup.sql`,
      
      restore: `# Restore MySQL
mysql -u username -p database_name < backup.sql
mysql -u username -p < backup.sql`,
      
      query: `# Query MySQL
mysql -u username -p -e "SELECT * FROM users LIMIT 10;"
mysql -u username -p -e "SHOW TABLES;"`,
      
      help: `# MySQL help
mysql --help
mysqldump --help`
    };
  }

  generateGenericCommand(query) {
    return `# Generic command suggestions for: "${query}"
# Try being more specific about the service or operation you need`;
  }

  formatOutput(command, service) {
    return `
${chalk.bold.cyan(`🔧 ${service.toUpperCase()} Commands:`)}

${chalk.green(command)}

${chalk.yellow('💡 Pro Tips:')}
${chalk.gray('• Add --help to any command for more options')}
${chalk.gray('• Use --output table for better formatting')}
${chalk.gray('• Always test commands in development first')}
`;
  }
}