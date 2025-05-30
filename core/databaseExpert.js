import chalk from 'chalk';

export class DatabaseExpert {
  constructor() {
    this.dbTypes = {
      postgresql: {
        patterns: ['postgres', 'psql', 'pg_', 'postgresql'],
        port: 5432,
        connectionString: 'postgresql://user:password@localhost:5432/dbname'
      },
      mysql: {
        patterns: ['mysql', 'mariadb'],
        port: 3306,
        connectionString: 'mysql://user:password@localhost:3306/dbname'
      },
      mongodb: {
        patterns: ['mongo', 'mongodb', 'mongosh'],
        port: 27017,
        connectionString: 'mongodb://localhost:27017/dbname'
      },
      supabase: {
        patterns: ['supabase'],
        port: 5432,
        connectionString: 'postgresql://user:password@db.project.supabase.co:5432/postgres'
      },
      sqlite: {
        patterns: ['sqlite', 'sqlite3'],
        port: null,
        connectionString: 'sqlite://./database.db'
      }
    };

    this.queryTemplates = {
      postgresql: {
        select: 'SELECT * FROM {table} WHERE {condition} LIMIT {limit};',
        insert: 'INSERT INTO {table} ({columns}) VALUES ({values});',
        update: 'UPDATE {table} SET {updates} WHERE {condition};',
        delete: 'DELETE FROM {table} WHERE {condition};',
        createTable: 'CREATE TABLE {table} ({columns});',
        migration: 'ALTER TABLE {table} ADD COLUMN {column} {type};'
      },
      mysql: {
        select: 'SELECT * FROM {table} WHERE {condition} LIMIT {limit};',
        insert: 'INSERT INTO {table} ({columns}) VALUES ({values});',
        update: 'UPDATE {table} SET {updates} WHERE {condition};',
        delete: 'DELETE FROM {table} WHERE {condition};',
        createTable: 'CREATE TABLE {table} ({columns});',
        migration: 'ALTER TABLE {table} ADD COLUMN {column} {type};'
      },
      mongodb: {
        select: 'db.{collection}.find({filter}).limit({limit});',
        insert: 'db.{collection}.insertOne({document});',
        update: 'db.{collection}.updateOne({filter}, {$set: {updates}});',
        delete: 'db.{collection}.deleteOne({filter});',
        createCollection: 'db.createCollection("{collection}");',
        aggregate: 'db.{collection}.aggregate([{pipeline}]);'
      }
    };

    this.safetyPatterns = {
      dangerous: [
        /drop\s+database/i,
        /truncate\s+table/i,
        /delete\s+from\s+\w+(?!\s+where)/i,
        /rm\s+-rf/i,
        /--\s*$/m
      ],
      warning: [
        /delete\s+from/i,
        /update\s+\w+\s+set(?!\s+.*where)/i,
        /alter\s+table/i,
        /drop\s+table/i
      ]
    };
  }

  generateQuery(parsed) {
    const dbType = this.detectDatabaseType(parsed.cleaned);
    const operation = this.detectOperation(parsed.cleaned);
    const entities = this.extractEntities(parsed.cleaned);
    
    console.log(chalk.green(`🗄️  Generating ${operation} query for ${dbType}`));

    const query = this.buildQuery(dbType, operation, entities, parsed);
    const safety = this.analyzeSafety(query);

    return {
      dbType: dbType,
      operation: operation,
      query: query,
      explanation: this.generateExplanation(dbType, operation, entities),
      safety: safety,
      optimizations: this.suggestOptimizations(dbType, operation, entities),
      examples: this.generateExamples(dbType, operation)
    };
  }

  detectDatabaseType(input) {
    for (const [dbType, config] of Object.entries(this.dbTypes)) {
      if (config.patterns.some(pattern => input.includes(pattern))) {
        return dbType;
      }
    }
    return 'postgresql'; // Default
  }

  detectOperation(input) {
    const operations = {
      select: ['select', 'find', 'get', 'fetch', 'query', 'search'],
      insert: ['insert', 'add', 'create', 'save'],
      update: ['update', 'modify', 'change', 'edit'],
      delete: ['delete', 'remove', 'drop'],
      migration: ['migrate', 'alter', 'schema', 'migration'],
      backup: ['backup', 'dump', 'export'],
      restore: ['restore', 'import', 'load']
    };

    for (const [operation, keywords] of Object.entries(operations)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return operation;
      }
    }

    return 'select'; // Default
  }

  extractEntities(input) {
    const words = input.split(/\s+/);
    const entities = {
      table: null,
      collection: null,
      columns: [],
      conditions: [],
      values: [],
      limit: 10
    };

    // Extract table/collection name (usually after FROM, INTO, or UPDATE)
    const tablePatterns = [
      /(?:from|into|update|table)\s+(\w+)/i,
      /(\w+)\s+(?:where|set)/i
    ];

    for (const pattern of tablePatterns) {
      const match = input.match(pattern);
      if (match) {
        entities.table = match[1];
        entities.collection = match[1];
        break;
      }
    }

    // Extract common table names if no explicit table found
    const commonTables = ['users', 'products', 'orders', 'customers', 'posts', 'comments'];
    if (!entities.table) {
      entities.table = commonTables.find(table => input.includes(table)) || 'table_name';
      entities.collection = entities.table;
    }

    // Extract limit
    const limitMatch = input.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      entities.limit = parseInt(limitMatch[1]);
    }

    return entities;
  }

  buildQuery(dbType, operation, entities, parsed) {
    const templates = this.queryTemplates[dbType];
    if (!templates || !templates[operation]) {
      return this.generateGenericQuery(dbType, operation, entities);
    }

    let template = templates[operation];
    
    // Replace placeholders
    template = template.replace('{table}', entities.table);
    template = template.replace('{collection}', entities.collection);
    template = template.replace('{limit}', entities.limit.toString());
    template = template.replace('{condition}', this.generateCondition(dbType, entities));
    template = template.replace('{columns}', this.generateColumns(entities));
    template = template.replace('{values}', this.generateValues(entities));
    template = template.replace('{updates}', this.generateUpdates(entities));

    return template;
  }

  generateCondition(dbType, entities) {
    if (dbType === 'mongodb') {
      return '{}'; // Empty filter for MongoDB
    }
    return 'id = 1'; // Default SQL condition
  }

  generateColumns(entities) {
    return entities.columns.length > 0 ? entities.columns.join(', ') : 'id, name, created_at';
  }

  generateValues(entities) {
    if (entities.values.length > 0) {
      return entities.values.map(v => `'${v}'`).join(', ');
    }
    return "'value1', 'value2', NOW()";
  }

  generateUpdates(entities) {
    return 'name = \'new_value\', updated_at = NOW()';
  }

  generateGenericQuery(dbType, operation, entities) {
    switch (dbType) {
      case 'mongodb':
        return `db.${entities.collection}.find({}).limit(${entities.limit});`;
      case 'postgresql':
      case 'mysql':
      case 'supabase':
      default:
        return `SELECT * FROM ${entities.table} LIMIT ${entities.limit};`;
    }
  }

  analyzeSafety(query) {
    const safety = {
      level: 'safe',
      warnings: [],
      recommendations: []
    };

    // Check for dangerous patterns
    for (const pattern of this.safetyPatterns.dangerous) {
      if (pattern.test(query)) {
        safety.level = 'dangerous';
        safety.warnings.push('This query may cause irreversible data loss');
        safety.recommendations.push('Test in development environment first');
        safety.recommendations.push('Create a backup before executing');
        break;
      }
    }

    // Check for warning patterns
    if (safety.level !== 'dangerous') {
      for (const pattern of this.safetyPatterns.warning) {
        if (pattern.test(query)) {
          safety.level = 'warning';
          safety.warnings.push('This query may modify or delete data');
          safety.recommendations.push('Verify the WHERE clause');
          break;
        }
      }
    }

    // Additional safety checks
    if (query.toLowerCase().includes('delete') && !query.toLowerCase().includes('where')) {
      safety.level = 'dangerous';
      safety.warnings.push('DELETE without WHERE clause will remove ALL records');
    }

    if (query.toLowerCase().includes('update') && !query.toLowerCase().includes('where')) {
      safety.level = 'warning';
      safety.warnings.push('UPDATE without WHERE clause will modify ALL records');
    }

    return safety;
  }

  suggestOptimizations(dbType, operation, entities) {
    const optimizations = [];

    if (operation === 'select') {
      optimizations.push('Consider adding indexes on frequently queried columns');
      optimizations.push('Use specific column names instead of SELECT *');
      optimizations.push('Add appropriate LIMIT clause to prevent large result sets');
    }

    if (dbType === 'postgresql' || dbType === 'mysql') {
      optimizations.push('Use EXPLAIN to analyze query performance');
      optimizations.push('Consider using prepared statements for repeated queries');
    }

    if (dbType === 'mongodb') {
      optimizations.push('Create compound indexes for multi-field queries');
      optimizations.push('Use projection to limit returned fields');
    }

    return optimizations;
  }

  generateExamples(dbType, operation) {
    const examples = [];

    switch (dbType) {
      case 'postgresql':
      case 'supabase':
        examples.push('-- Connect to database');
        examples.push('psql -h localhost -U username -d database_name');
        examples.push('');
        examples.push('-- Example queries');
        examples.push('SELECT * FROM users WHERE active = true LIMIT 10;');
        examples.push('INSERT INTO users (name, email) VALUES (\'John Doe\', \'john@example.com\');');
        break;

      case 'mongodb':
        examples.push('// Connect to MongoDB');
        examples.push('mongosh "mongodb://localhost:27017/mydb"');
        examples.push('');
        examples.push('// Example queries');
        examples.push('db.users.find({ active: true }).limit(10);');
        examples.push('db.users.insertOne({ name: "John Doe", email: "john@example.com" });');
        break;

      case 'mysql':
        examples.push('-- Connect to MySQL');
        examples.push('mysql -h localhost -u username -p database_name');
        examples.push('');
        examples.push('-- Example queries');
        examples.push('SELECT * FROM users WHERE active = 1 LIMIT 10;');
        examples.push('INSERT INTO users (name, email) VALUES (\'John Doe\', \'john@example.com\');');
        break;
    }

    return examples;
  }

  generateExplanation(dbType, operation, entities) {
    const explanations = {
      select: `Retrieves data from the ${entities.table} table/collection`,
      insert: `Adds new records to the ${entities.table} table/collection`,
      update: `Modifies existing records in the ${entities.table} table/collection`,
      delete: `Removes records from the ${entities.table} table/collection`,
      migration: `Alters the schema of the ${entities.table} table/collection`
    };

    const dbFeatures = {
      postgresql: 'with advanced SQL features and ACID compliance',
      mysql: 'with reliable performance and wide compatibility',
      mongodb: 'using document-based operations and flexible schema',
      supabase: 'with real-time subscriptions and built-in authentication',
      sqlite: 'with lightweight, file-based storage'
    };

    return `${explanations[operation]} in ${dbType} ${dbFeatures[dbType]}.`;
  }

  // CLI command generation for database operations
  generateCLICommands(dbType, operation) {
    const commands = {
      postgresql: {
        connect: 'psql -h localhost -U username -d database_name',
        backup: 'pg_dump -h localhost -U username database_name > backup.sql',
        restore: 'psql -h localhost -U username database_name < backup.sql',
        list: 'psql -c "\\dt"'
      },
      mysql: {
        connect: 'mysql -h localhost -u username -p database_name',
        backup: 'mysqldump -u username -p database_name > backup.sql',
        restore: 'mysql -u username -p database_name < backup.sql',
        list: 'mysql -u username -p -e "SHOW TABLES;"'
      },
      mongodb: {
        connect: 'mongosh "mongodb://localhost:27017/database_name"',
        backup: 'mongodump --db database_name --out ./backup',
        restore: 'mongorestore --db database_name ./backup/database_name',
        list: 'mongosh --eval "show collections"'
      },
      supabase: {
        connect: 'supabase db connect',
        backup: 'supabase db dump > backup.sql',
        restore: 'supabase db reset',
        list: 'supabase migration list'
      }
    };

    return commands[dbType] || {};
  }
}