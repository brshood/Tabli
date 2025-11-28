#!/usr/bin/env tsx
/**
 * Stress Test Harness for Tabli API
 * 
 * Usage:
 *   tsx scripts/stress-test.ts --help
 *   tsx scripts/stress-test.ts --url http://localhost:8080 --restaurant-id <id> --concurrent 50 --duration 60
 * 
 * This script simulates high user load by making concurrent requests to various API endpoints.
 */

import 'dotenv/config';

interface TestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface Statistics {
  total: number;
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

class StressTest {
  private apiUrl: string;
  private restaurantId: string;
  private concurrent: number;
  private duration: number; // seconds
  private results: TestResult[] = [];
  private running = false;
  private startTime = 0;

  constructor(options: {
    apiUrl: string;
    restaurantId: string;
    concurrent?: number;
    duration?: number;
  }) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '');
    this.restaurantId = options.restaurantId;
    this.concurrent = options.concurrent || 10;
    this.duration = options.duration || 30;
  }

  /**
   * Generate random customer data
   */
  private generateCustomerData(index: number) {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const domains = ['test.com', 'example.com', 'demo.org'];
    const name = `${names[index % names.length]}${Math.floor(index / names.length)}`;
    const email = `${name.toLowerCase()}${index}@${domains[index % domains.length]}`;
    const phone = `555${String(index).padStart(7, '0')}`;
    
    return {
      name,
      email,
      phone,
      partySize: Math.floor(Math.random() * 5) + 1, // 1-5
      contactMethod: Math.random() > 0.5 ? 'email' : 'phone' as 'email' | 'phone',
    };
  }

  /**
   * Make a request and measure response time
   */
  private async makeRequest(
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

      // Try to read response body (but don't fail if it fails)
      let error: string | undefined;
      if (!success) {
        try {
          const errorData = await response.text();
          error = errorData.substring(0, 200); // Limit error message length
        } catch {
          error = `HTTP ${statusCode}`;
        }
      }

      return {
        endpoint,
        method,
        statusCode,
        responseTime,
        success,
        error,
        timestamp: startTime,
      };
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint,
        method,
        statusCode: 0,
        responseTime,
        success: false,
        error: err.message || 'Network error',
        timestamp: startTime,
      };
    }
  }

  /**
   * Test: Join queue
   */
  private async testJoinQueue(index: number): Promise<TestResult> {
    const customer = this.generateCustomerData(index);
    return this.makeRequest(
      `/queue/${this.restaurantId}/join`,
      'POST',
      {
        partySize: customer.partySize,
        contactMethod: customer.contactMethod,
        phone: customer.phone,
        email: customer.email,
        name: customer.name,
      }
    );
  }

  /**
   * Test: Get queue estimate
   */
  private async testGetQueueEstimate(): Promise<TestResult> {
    return this.makeRequest(
      `/queue/${this.restaurantId}/estimate`,
      'GET'
    );
  }

  /**
   * Test: Get restaurants list
   */
  private async testGetRestaurants(): Promise<TestResult> {
    return this.makeRequest('/restaurants', 'GET');
  }

  /**
   * Test: Get dashboard summary
   */
  private async testGetDashboardSummary(): Promise<TestResult> {
    return this.makeRequest(
      `/dashboard/${this.restaurantId}/summary`,
      'GET'
    );
  }

  /**
   * Test: Get reservations
   */
  private async testGetReservations(): Promise<TestResult> {
    return this.makeRequest(
      `/reservations?restaurantId=${this.restaurantId}`,
      'GET'
    );
  }

  /**
   * Test: Get tables
   */
  private async testGetTables(): Promise<TestResult> {
    return this.makeRequest(
      `/restaurants/${this.restaurantId}/tables`,
      'GET'
    );
  }

  /**
   * Run a single test scenario
   */
  private async runTestScenario(scenario: () => Promise<TestResult>): Promise<TestResult> {
    const result = await scenario();
    this.results.push(result);
    return result;
  }

  /**
   * Worker function that continuously runs tests
   */
  private async worker(workerId: number): Promise<void> {
    let testIndex = workerId;
    const scenarios = [
      () => this.testJoinQueue(testIndex++),
      () => this.testGetQueueEstimate(),
      () => this.testGetRestaurants(),
      () => this.testGetDashboardSummary(),
      () => this.testGetReservations(),
      () => this.testGetTables(),
    ];

    while (this.running) {
      // Randomly select a test scenario
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      
      try {
        await this.runTestScenario(scenario);
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error);
      }

      // Small delay between requests to avoid hammering the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Calculate statistics from results
   */
  private calculateStatistics(): Statistics {
    if (this.results.length === 0) {
      return {
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
      .filter((error, index, self) => self.indexOf(error) === index) // Unique errors
      .slice(0, 10); // Limit to first 10 unique errors

    return {
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
   * Print statistics to console
   */
  private printStatistics(stats: Statistics, elapsed: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('STRESS TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Test Duration: ${elapsed.toFixed(2)}s`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Restaurant ID: ${this.restaurantId}`);
    console.log(`Concurrent Workers: ${this.concurrent}`);
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
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run the stress test
   */
  async run(): Promise<void> {
    console.log('Starting stress test...');
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Restaurant ID: ${this.restaurantId}`);
    console.log(`Concurrent Workers: ${this.concurrent}`);
    console.log(`Duration: ${this.duration}s`);
    console.log('');

    this.running = true;
    this.startTime = Date.now();
    this.results = [];

    // Start all workers
    const workers = Array.from({ length: this.concurrent }, (_, i) => this.worker(i));

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, this.duration * 1000));

    // Stop all workers
    this.running = false;
    console.log('Stopping workers...');

    // Wait for all workers to finish
    await Promise.all(workers);

    const elapsed = (Date.now() - this.startTime) / 1000;
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
  restaurantId: string;
  concurrent: number;
  duration: number;
} {
  const args = process.argv.slice(2);
  let apiUrl = 'http://localhost:8080';
  let restaurantId = '';
  let concurrent = 10;
  let duration = 30;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
      case '-u':
        apiUrl = args[++i];
        break;
      case '--restaurant-id':
      case '-r':
        restaurantId = args[++i];
        break;
      case '--concurrent':
      case '-c':
        concurrent = parseInt(args[++i], 10);
        break;
      case '--duration':
      case '-d':
        duration = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
Stress Test Harness for Tabli API

Usage:
  tsx scripts/stress-test.ts [options]

Options:
  --url, -u <url>              API base URL (default: http://localhost:8080)
  --restaurant-id, -r <id>     Restaurant ID to test against (required)
  --concurrent, -c <number>    Number of concurrent workers (default: 10)
  --duration, -d <seconds>     Test duration in seconds (default: 30)
  --help, -h                   Show this help message

Examples:
  tsx scripts/stress-test.ts -r 507f1f77bcf86cd799439011 -c 50 -d 60
  tsx scripts/stress-test.ts --url http://staging.example.com --restaurant-id <id> --concurrent 100 --duration 120
        `);
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (!restaurantId) {
    console.error('ERROR: --restaurant-id is required!');
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  return { apiUrl, restaurantId, concurrent, duration };
}

// Main execution
async function main() {
  const options = parseArgs();
  const test = new StressTest(options);
  
  try {
    await test.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run main when this file is executed directly
if (import.meta.url.endsWith(process.argv[1]) || import.meta.url.includes('stress-test.ts')) {
  main();
}

