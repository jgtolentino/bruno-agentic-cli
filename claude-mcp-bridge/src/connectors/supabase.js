const { createClient } = require('@supabase/supabase-js');

class SupabaseConnector {
    constructor(config) {
        this.client = createClient(config.url, config.key);
        this.config = config;
    }

    getMethods() {
        return [
            'executeSQL',
            'insertData',
            'updateData',
            'deleteData',
            'selectData',
            'createTable',
            'uploadFile',
            'executeFunction',
            'subscribeToChanges',
            'batchInsert',
            'upsertData',
            'getTableInfo',
            'createView',
            'executeRPC'
        ];
    }

    async executeSQL(data) {
        try {
            const { sql, params = [] } = data;
            
            // Use RPC to execute raw SQL (requires a stored procedure)
            const { data: result, error } = await this.client.rpc('execute_sql', {
                sql_query: sql,
                sql_params: params
            });

            if (error) {
                throw new Error(`SQL execution failed: ${error.message}`);
            }

            return {
                data: result,
                executed: true,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase executeSQL failed: ${error.message}`);
        }
    }

    async selectData(data) {
        try {
            const { 
                table, 
                columns = '*', 
                filters = {}, 
                orderBy, 
                limit, 
                offset 
            } = data;

            let query = this.client.from(table).select(columns);

            // Apply filters
            for (const [column, condition] of Object.entries(filters)) {
                if (typeof condition === 'object') {
                    // Handle complex conditions
                    for (const [operator, value] of Object.entries(condition)) {
                        switch (operator) {
                            case 'eq':
                                query = query.eq(column, value);
                                break;
                            case 'neq':
                                query = query.neq(column, value);
                                break;
                            case 'gt':
                                query = query.gt(column, value);
                                break;
                            case 'gte':
                                query = query.gte(column, value);
                                break;
                            case 'lt':
                                query = query.lt(column, value);
                                break;
                            case 'lte':
                                query = query.lte(column, value);
                                break;
                            case 'like':
                                query = query.like(column, value);
                                break;
                            case 'in':
                                query = query.in(column, value);
                                break;
                        }
                    }
                } else {
                    query = query.eq(column, condition);
                }
            }

            // Apply ordering
            if (orderBy) {
                const { column, ascending = true } = orderBy;
                query = query.order(column, { ascending });
            }

            // Apply pagination
            if (limit) query = query.limit(limit);
            if (offset) query = query.range(offset, offset + (limit || 100) - 1);

            const { data: result, error } = await query;

            if (error) {
                throw new Error(`Select query failed: ${error.message}`);
            }

            return {
                data: result,
                count: result.length,
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase selectData failed: ${error.message}`);
        }
    }

    async insertData(data) {
        try {
            const { table, records, returning = '*' } = data;

            const { data: result, error } = await this.client
                .from(table)
                .insert(records)
                .select(returning);

            if (error) {
                throw new Error(`Insert failed: ${error.message}`);
            }

            return {
                data: result,
                inserted: Array.isArray(records) ? records.length : 1,
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase insertData failed: ${error.message}`);
        }
    }

    async updateData(data) {
        try {
            const { table, updates, filters, returning = '*' } = data;

            let query = this.client.from(table).update(updates);

            // Apply filters
            for (const [column, value] of Object.entries(filters)) {
                query = query.eq(column, value);
            }

            const { data: result, error } = await query.select(returning);

            if (error) {
                throw new Error(`Update failed: ${error.message}`);
            }

            return {
                data: result,
                updated: result.length,
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase updateData failed: ${error.message}`);
        }
    }

    async upsertData(data) {
        try {
            const { table, records, onConflict, returning = '*' } = data;

            const { data: result, error } = await this.client
                .from(table)
                .upsert(records, { onConflict })
                .select(returning);

            if (error) {
                throw new Error(`Upsert failed: ${error.message}`);
            }

            return {
                data: result,
                upserted: Array.isArray(records) ? records.length : 1,
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase upsertData failed: ${error.message}`);
        }
    }

    async deleteData(data) {
        try {
            const { table, filters } = data;

            let query = this.client.from(table).delete();

            // Apply filters
            for (const [column, value] of Object.entries(filters)) {
                query = query.eq(column, value);
            }

            const { data: result, error } = await query;

            if (error) {
                throw new Error(`Delete failed: ${error.message}`);
            }

            return {
                deleted: true,
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase deleteData failed: ${error.message}`);
        }
    }

    async batchInsert(data) {
        try {
            const { table, records, batchSize = 100 } = data;
            const results = [];

            // Process in batches to avoid limits
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                
                const { data: result, error } = await this.client
                    .from(table)
                    .insert(batch)
                    .select();

                if (error) {
                    throw new Error(`Batch insert failed: ${error.message}`);
                }

                results.push(...result);
                
                // Small delay between batches
                if (i + batchSize < records.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            return {
                data: results,
                inserted: results.length,
                batches: Math.ceil(records.length / batchSize),
                table,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase batchInsert failed: ${error.message}`);
        }
    }

    async executeRPC(data) {
        try {
            const { functionName, params = {} } = data;

            const { data: result, error } = await this.client.rpc(functionName, params);

            if (error) {
                throw new Error(`RPC execution failed: ${error.message}`);
            }

            return {
                data: result,
                function: functionName,
                executed: true,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase executeRPC failed: ${error.message}`);
        }
    }

    async getTableInfo(data) {
        try {
            const { table } = data;

            // Get table structure
            const { data: columns, error } = await this.client
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable, column_default')
                .eq('table_name', table);

            if (error) {
                throw new Error(`Table info query failed: ${error.message}`);
            }

            // Get row count
            const { count, error: countError } = await this.client
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (countError) {
                throw new Error(`Row count query failed: ${countError.message}`);
            }

            return {
                table,
                columns: columns || [],
                rowCount: count || 0,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase getTableInfo failed: ${error.message}`);
        }
    }

    async uploadFile(data) {
        try {
            const { bucket, path, file, contentType, cacheControl = '3600' } = data;

            const { data: result, error } = await this.client.storage
                .from(bucket)
                .upload(path, file, {
                    contentType,
                    cacheControl
                });

            if (error) {
                throw new Error(`File upload failed: ${error.message}`);
            }

            // Get public URL
            const { data: urlData } = this.client.storage
                .from(bucket)
                .getPublicUrl(path);

            return {
                path: result.path,
                url: urlData.publicUrl,
                bucket,
                uploaded: true,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase uploadFile failed: ${error.message}`);
        }
    }

    // Helper method to generate SQL from Claude descriptions
    generateSQLFromDescription(description, tableName) {
        const sql = {
            select: [],
            from: tableName,
            where: [],
            orderBy: [],
            limit: null
        };

        // Simple parsing logic for common patterns
        if (description.includes('count')) {
            sql.select.push('COUNT(*)');
        } else if (description.includes('all')) {
            sql.select.push('*');
        }

        if (description.includes('where')) {
            // Extract simple where conditions
            // This is a basic implementation
        }

        if (description.includes('order by')) {
            // Extract order by clauses
        }

        return this.buildSQLQuery(sql);
    }

    buildSQLQuery(sqlObj) {
        let query = `SELECT ${sqlObj.select.join(', ')} FROM ${sqlObj.from}`;
        
        if (sqlObj.where.length > 0) {
            query += ` WHERE ${sqlObj.where.join(' AND ')}`;
        }
        
        if (sqlObj.orderBy.length > 0) {
            query += ` ORDER BY ${sqlObj.orderBy.join(', ')}`;
        }
        
        if (sqlObj.limit) {
            query += ` LIMIT ${sqlObj.limit}`;
        }

        return query;
    }

    // Method to handle dashboard-specific queries
    async getDashboardData(data) {
        try {
            const { 
                metric, 
                dateRange, 
                filters = {}, 
                groupBy 
            } = data;

            let query;

            switch (metric) {
                case 'brand_performance':
                    query = this.client
                        .from('brand_performance_view')
                        .select('*');
                    break;
                case 'sales_trends':
                    query = this.client
                        .from('daily_sales_summary')
                        .select('*');
                    break;
                case 'product_mix':
                    query = this.client
                        .from('product_category_sales')
                        .select('*');
                    break;
                default:
                    throw new Error(`Unknown metric: ${metric}`);
            }

            // Apply date range filter
            if (dateRange) {
                query = query
                    .gte('date', dateRange.start)
                    .lte('date', dateRange.end);
            }

            // Apply additional filters
            for (const [key, value] of Object.entries(filters)) {
                query = query.eq(key, value);
            }

            const { data: result, error } = await query;

            if (error) {
                throw new Error(`Dashboard query failed: ${error.message}`);
            }

            return {
                data: result,
                metric,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Supabase getDashboardData failed: ${error.message}`);
        }
    }
}

module.exports = SupabaseConnector;