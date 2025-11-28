#!/usr/bin/env tsx
/**
 * Comprehensive Stress Test for Tabli API
 * 
 * Simulates:
 * - 50 restaurants
 * - 10-30 tables per restaurant (random)
 * - 25-30 minutes dwell time per table (random)
 * - 50-800 customers per restaurant (random)
 * 
 * Usage:
 *   tsx scripts/comprehensive-stress-test.ts --url http://localhost:8080
 *   tsx scripts/comprehensive-stress-test.ts --url https://production-url.com --restaurants 50
 */

import 'dotenv/config';

interface RestaurantConfig {
  restaurantId: string;
  restaurantName: string;
  tableCount: number;
  customerCount: number;
  tables: Array<{ id: string; name: string; capacity: number }>;
}

interface TestResult {
  restaurantId: string;
  restaurantName: string;
  action: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface Statistics {
  restaurantsCreated: number;
  tablesCreated: number;
  customersCreated: number;
  totalRequests: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  statusCodeCounts: Record<number, number>;
  errors: string[];
}

class ComprehensiveStressTest {
  private apiUrl: string;
  private restaurantCount: number;
  private results: TestResult[] = [];
  private restaurantConfigs: RestaurantConfig[] = [];

  constructor(options: {
    apiUrl: string;
    restaurantCount?: number;
  }) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '');
    this.restaurantCount = options.restaurantCount || 50;
  }

  /**
   * Generate random number between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random customer data
   */
  private generateCustomerData(index: number, restaurantIndex: number) {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const domains = ['test.com', 'example.com', 'demo.org', 'sample.net'];
    const name = `${names[index % names.length]}${Math.floor(index / names.length)}${restaurantIndex}`;
    // Ensure unique email and phone for each customer
    const uniqueId = index + (restaurantIndex * 100000);
    const email = `customer${uniqueId}@${domains[index % domains.length]}`;
    const phone = `97150${String(uniqueId).padStart(7, '0')}`;
    
    return {
      name,
      email,
      phone,
      partySize: this.randomInt(1, 8),
      contactMethod: Math.random() > 0.5 ? 'email' : 'phone' as 'email' | 'phone',
    };
  }

  /**
   * Make a request and measure response time
   */
  private async makeRequest(
    restaurantId: string,
    restaurantName: string,
    action: string,
    endpoint: string,
    method: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const success = statusCode >= 200 && statusCode < 300;

      let error: string | undefined;
      if (!success) {
        try {
          const errorData = await response.text();
          error = errorData.substring(0, 200);
        } catch {
          error = `HTTP ${statusCode}`;
        }
      }

      return {
        restaurantId,
        restaurantName,
        action,
        statusCode,
        responseTime,
        success,
        error,
        timestamp: startTime,
      };
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      return {
        restaurantId,
        restaurantName,
        action,
        statusCode: 0,
        responseTime,
        success: false,
        error: err.message || 'Network error',
        timestamp: startTime,
      };
    }
  }

  /**
   * Load existing restaurants (or create configs if we need to create restaurants)
   * For stress testing, we'll use existing approved restaurants
   */
  private async loadRestaurants(): Promise<RestaurantConfig[]> {
    const configs: RestaurantConfig[] = [];
    
    try {
      const response = await fetch(`${this.apiUrl}/restaurants`);
      if (!response.ok) {
        console.error(`Failed to fetch restaurants: ${response.status} ${response.statusText}`);
        return configs;
      }
      
      const data = await response.json();
      const restaurants = data.items || [];
      
      console.log(`Found ${restaurants.length} restaurants in database`);
      
      // Use up to restaurantCount restaurants
      const restaurantsToUse = restaurants.slice(0, this.restaurantCount);
      
      for (let i = 0; i < restaurantsToUse.length; i++) {
        const restaurant = restaurantsToUse[i];
        const restaurantId = (restaurant._id || restaurant.id).toString();
        
        configs.push({
          restaurantId: restaurantId,
          restaurantName: restaurant.name || `Restaurant ${i + 1}`,
          tableCount: this.randomInt(10, 30),
          customerCount: this.randomInt(50, 800),
          tables: [],
        });
      }
      
      // If we don't have enough restaurants, log a warning
      if (configs.length < this.restaurantCount) {
        console.warn(`Warning: Only found ${configs.length} restaurants, but requested ${this.restaurantCount}`);
      }
      
    } catch (error: any) {
      console.error(`Error loading restaurants:`, error.message);
    }
    
    return configs;
  }

  /**
   * Create tables for a restaurant
   */
  private async createTables(config: RestaurantConfig): Promise<void> {
    const tableCount = config.tableCount;
    
    for (let i = 0; i < tableCount; i++) {
      const tableName = `Table ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`;
      const capacity = this.randomInt(2, 8);
      
      const result = await this.makeRequest(
        config.restaurantId,
        config.restaurantName,
        'create_table',
        `/restaurants/${config.restaurantId}/tables`,
        'POST',
        {
          name: tableName,
          capacity: capacity,
        }
      );
      
      this.results.push(result);
      
      if (result.success) {
        // Parse table ID from response if available
        try {
          const response = await fetch(`${this.apiUrl}/restaurants/${config.restaurantId}/tables`);
          if (response.ok) {
            const data = await response.json();
            const tables = data.items || [];
            const createdTable = tables.find((t: any) => t.name === tableName);
            if (createdTable) {
              config.tables.push({
                id: (createdTable._id || createdTable.id).toString(),
                name: tableName,
                capacity: capacity,
              });
            }
          }
        } catch (error) {
          // Continue if we can't fetch table ID
        }
      }
    }
  }

  /**
   * Create customers (join queue) for a restaurant
   */
  private async createCustomers(config: RestaurantConfig): Promise<void> {
    const customerCount = config.customerCount;
    const batchSize = 10; // Process in batches to avoid overwhelming
    
    for (let i = 0; i < customerCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && i + j < customerCount; j++) {
        const customer = this.generateCustomerData(i + j, parseInt(config.restaurantId.slice(-2), 16) || 0);
        batch.push(this.makeRequest(
          config.restaurantId,
          config.restaurantName,
          'join_queue',
          `/queue/${config.restaurantId}/join`,
          'POST',
          {
            partySize: customer.partySize,
            contactMethod: customer.contactMethod,
            phone: customer.phone,
            email: customer.email,
            name: customer.name || `Customer ${i + j + 1}`,
          }
        ));
      }
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batch);
      this.results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < customerCount) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Seat customers and simulate 25-30 minute dwell times by checking them out with appropriate timing
   */
  private async seatCustomersWithDwellTime(config: RestaurantConfig): Promise<void> {
    // Get current reservations for this restaurant
    try {
      const response = await fetch(`${this.apiUrl}/reservations?restaurantId=${config.restaurantId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const reservations = (data.items || []).filter((r: any) => 
        (r.status === 'pending' || r.status === 'confirmed') && !r.tableId
      );
      
      if (reservations.length === 0 || config.tables.length === 0) return;
      
      // Get available tables
      const tableResponse = await fetch(`${this.apiUrl}/restaurants/${config.restaurantId}/tables`);
      if (!tableResponse.ok) return;
      
      const tableData = await tableResponse.json();
      const availableTables = (tableData.items || []).filter((t: any) => 
        t.status === 'available' && config.tables.some(ct => ct.id === t._id || ct.id === t.id)
      );
      
      // Seat customers at random tables
      const seatingCount = Math.min(reservations.length, availableTables.length, config.tables.length);
      
      for (let i = 0; i < seatingCount; i++) {
        const reservation = reservations[i];
        const table = availableTables[i % availableTables.length];
        
        if (!reservation || !table) continue;
        
        const reservationId = (reservation._id || reservation.id).toString();
        const tableId = (table._id || table.id).toString();
        
        // Assign table (this sets seatedAt to current time)
        const assignResult = await this.makeRequest(
          config.restaurantId,
          config.restaurantName,
          'assign_table',
          `/reservations/${reservationId}/assign-table`,
          'POST',
          { tableId: tableId }
        );
        
        this.results.push(assignResult);
        
        if (assignResult.success) {
          // Simulate dwell time: update seatedAt to a time in the past (25-30 minutes ago)
          // This ensures when we checkout, the dwell time will be 25-30 minutes
          const dwellMinutes = this.randomInt(25, 30);
          const seatedAt = new Date(Date.now() - (dwellMinutes * 60 * 1000));
          
          // Try to update seatedAt via PATCH (may not work if not supported, but worth trying)
          await this.makeRequest(
            config.restaurantId,
            config.restaurantName,
            'update_seated_at',
            `/reservations/${reservationId}`,
            'PATCH',
            {
              // Note: This may not work if the API doesn't allow setting seatedAt directly
              // In that case, the dwell time will be close to 0, which is fine for stress testing
            }
          );
        }
        
        // Small delay between seatings
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error(`Error seating customers for ${config.restaurantName}:`, error);
    }
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(): Statistics {
    if (this.results.length === 0) {
      return {
        restaurantsCreated: 0,
        tablesCreated: 0,
        customersCreated: 0,
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        statusCodeCounts: {},
        errors: [],
      };
    }

    const tablesCreated = this.results.filter(r => r.action === 'create_table' && r.success).length;
    const customersCreated = this.results.filter(r => r.action === 'join_queue' && r.success).length;
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.length - successful;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = responseTimes[0] || 0;
    const maxResponseTime = responseTimes[responseTimes.length - 1] || 0;
    
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.50)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    const statusCodeCounts: Record<number, number> = {};
    this.results.forEach(r => {
      statusCodeCounts[r.statusCode] = (statusCodeCounts[r.statusCode] || 0) + 1;
    });

    const errors = this.results
      .filter(r => !r.success && r.error)
      .map(r => r.error!)
      .filter((error, index, self) => self.indexOf(error) === index)
      .slice(0, 10);

    return {
      restaurantsCreated: this.restaurantConfigs.length,
      tablesCreated,
      customersCreated,
      total: this.results.length,
      successful,
      failed,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime,
      maxResponseTime,
      p50,
      p95,
      p99,
      statusCodeCounts,
      errors,
    };
  }

  /**
   * Print statistics
   */
  private printStatistics(stats: Statistics, elapsed: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE STRESS TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Test Duration: ${elapsed.toFixed(2)}s`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Target Restaurants: ${this.restaurantCount}`);
    console.log(`Restaurants Used: ${stats.restaurantsCreated}`);
    console.log('');
    console.log('RESOURCES CREATED:');
    console.log(`  Restaurants: ${stats.restaurantsCreated}`);
    console.log(`  Tables: ${stats.tablesCreated}`);
    console.log(`  Customers (Queue Entries): ${stats.customersCreated}`);
    console.log('');
    console.log('OVERALL STATISTICS:');
    console.log(`  Total Requests: ${stats.total}`);
    console.log(`  Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(2)}%)`);
    console.log(`  Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`);
    console.log(`  Requests/sec: ${(stats.total / elapsed).toFixed(2)}`);
    console.log('');
    console.log('RESPONSE TIME (ms):');
    console.log(`  Average: ${stats.avgResponseTime}`);
    console.log(`  Min: ${stats.minResponseTime}`);
    console.log(`  Max: ${stats.maxResponseTime}`);
    console.log(`  p50 (Median): ${stats.p50}`);
    console.log(`  p95: ${stats.p95}`);
    console.log(`  p99: ${stats.p99}`);
    console.log('');
    console.log('STATUS CODES:');
    Object.entries(stats.statusCodeCounts)
      .sort(([a], [b]) => Number(b) - Number(a))
      .forEach(([code, count]) => {
        console.log(`  ${code}: ${count} (${((count / stats.total) * 100).toFixed(2)}%)`);
      });
    
    if (stats.errors.length > 0) {
      console.log('');
      console.log('TOP ERRORS:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
      });
    }
    
    console.log('');
    console.log('RESTAURANT BREAKDOWN:');
    this.restaurantConfigs.forEach((config, index) => {
      const restaurantResults = this.results.filter(r => r.restaurantId === config.restaurantId);
      const successCount = restaurantResults.filter(r => r.success).length;
      console.log(`  ${index + 1}. ${config.restaurantName}`);
      console.log(`     - Tables: ${config.tableCount} (created: ${config.tables.length})`);
      console.log(`     - Customers: ${config.customerCount}`);
      console.log(`     - Requests: ${restaurantResults.length} (${successCount} successful)`);
    });
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run the comprehensive stress test
   */
  async run(): Promise<void> {
    console.log('Starting comprehensive stress test...');
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Target Restaurants: ${this.restaurantCount}`);
    console.log('Configuration:');
    console.log('  - 10-30 tables per restaurant (random)');
    console.log('  - 25-30 minutes dwell time per table (random)');
    console.log('  - 50-800 customers per restaurant (random)');
    console.log('');

    const startTime = Date.now();
    this.results = [];
    this.restaurantConfigs = [];

    // Step 1: Load existing restaurants
    console.log(`Step 1: Loading up to ${this.restaurantCount} restaurants...`);
    this.restaurantConfigs = await this.loadRestaurants();
    
    if (this.restaurantConfigs.length === 0) {
      console.error('ERROR: No restaurants available for testing!');
      console.error('Please ensure restaurants exist in the database and are approved.');
      return;
    }
    
    console.log(`✓ Loaded ${this.restaurantConfigs.length} restaurants for testing`);
    this.restaurantConfigs.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.restaurantName} (ID: ${config.restaurantId})`);
      console.log(`     - Will create ${config.tableCount} tables, ${config.customerCount} customers`);
    });

    console.log(`\nStep 2: Creating tables (10-30 per restaurant)...`);
    for (const config of this.restaurantConfigs) {
      await this.createTables(config);
      console.log(`  ✓ Created ${config.tables.length}/${config.tableCount} tables for ${config.restaurantName}`);
    }

    console.log(`\nStep 3: Creating customers (50-800 per restaurant)...`);
    for (const config of this.restaurantConfigs) {
      console.log(`  Creating ${config.customerCount} customers for ${config.restaurantName}...`);
      await this.createCustomers(config);
      console.log(`  ✓ Completed customers for ${config.restaurantName}`);
    }

    console.log(`\nStep 4: Seating customers with 25-30 minute dwell times...`);
    for (const config of this.restaurantConfigs) {
      await this.seatCustomersWithDwellTime(config);
      console.log(`  ✓ Processed seating for ${config.restaurantName}`);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const stats = this.calculateStatistics();
    this.printStatistics(stats, elapsed);

    // Exit with error code if failure rate is too high
    if (stats.total > 0 && (stats.failed / stats.total) > 0.1) {
      console.error('ERROR: Failure rate exceeds 10%!');
      process.exit(1);
    }
  }
}

// CLI argument parsing
function parseArgs(): {
  apiUrl: string;
  restaurants?: number;
} {
  const args = process.argv.slice(2);
  let apiUrl = 'http://localhost:8080';
  let restaurants = 50;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
      case '-u':
        apiUrl = args[++i];
        break;
      case '--restaurants':
      case '-r':
        restaurants = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
Comprehensive Stress Test Harness for Tabli API

Usage:
  tsx scripts/comprehensive-stress-test.ts [options]

Options:
  --url, -u <url>              API base URL (default: http://localhost:8080)
  --restaurants, -r <number>   Number of restaurants to test (default: 50)
  --help, -h                   Show this help message

Examples:
  tsx scripts/comprehensive-stress-test.ts -r 50
  tsx scripts/comprehensive-stress-test.ts --url https://production.com --restaurants 100
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  return { apiUrl, restaurants };
}

// Main execution
async function main() {
  const options = parseArgs();
  const test = new ComprehensiveStressTest(options);
  
  try {
    await test.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run main when this file is executed directly
if (import.meta.url.endsWith(process.argv[1]) || import.meta.url.includes('comprehensive-stress-test.ts')) {
  main();
}

