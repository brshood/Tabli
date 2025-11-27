/**
 * Stress Test Script for Tabli Application
 * 
 * Tests the application with:
 * - 30 tables per restaurant
 * - 600 people (reservations/queue entries)
 * - 20 minute duration
 * 
 * Run with: npx ts-node scripts/stress-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:8080';
const TEST_DURATION_MS = 20 * 60 * 1000; // 20 minutes
const TOTAL_PEOPLE = 600;
const TABLES_PER_RESTAURANT = 30;
const NUM_RESTAURANTS = 2; // Test with 2 restaurants

interface TestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  errors: Array<{ timestamp: Date; error: string; endpoint: string }>;
  peakConcurrency: number;
}

interface TestRestaurant {
  id: string;
  name: string;
  tables: string[];
}

const metrics: TestMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
  errors: [],
  peakConcurrency: 0,
};

let responseTimes: number[] = [];
let currentConcurrency = 0;
let testRestaurants: TestRestaurant[] = [];

/**
 * Helper to make API requests and track metrics
 */
async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  metrics.totalRequests++;
  currentConcurrency++;
  metrics.peakConcurrency = Math.max(metrics.peakConcurrency, currentConcurrency);

  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseTime = Date.now() - startTime;
    responseTimes.push(responseTime);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    metrics.successfulRequests++;
    currentConcurrency--;
    return await response.json();
  } catch (error: any) {
    metrics.failedRequests++;
    metrics.errors.push({
      timestamp: new Date(),
      error: error.message,
      endpoint,
    });
    currentConcurrency--;
    throw error;
  }
}

/**
 * Setup: Get existing restaurants or use test data
 */
async function setupRestaurants(): Promise<void> {
  console.log('🔧 Setting up test restaurants...');
  
  try {
    // Get existing restaurants
    const response = await apiRequest('/restaurants');
    const restaurants = response.restaurants || [];
    
    if (restaurants.length < NUM_RESTAURANTS) {
      console.log(`⚠️  Only ${restaurants.length} restaurants found. Test requires at least ${NUM_RESTAURANTS}.`);
      console.log('   Please ensure restaurants are created and approved in the system.');
      process.exit(1);
    }

    // Use first N restaurants for testing
    testRestaurants = restaurants.slice(0, NUM_RESTAURANTS).map((r: any) => ({
      id: r.id || r._id,
      name: r.name,
      tables: [],
    }));

    console.log(`✅ Using ${testRestaurants.length} restaurants for testing:`);
    testRestaurants.forEach(r => console.log(`   - ${r.name} (ID: ${r.id})`));

    // Verify each restaurant has enough tables
    for (const restaurant of testRestaurants) {
      const tablesResponse = await apiRequest(`/tables?restaurantId=${restaurant.id}`);
      const tables = tablesResponse.items || [];
      restaurant.tables = tables.map((t: any) => t._id);
      
      if (tables.length < TABLES_PER_RESTAURANT) {
        console.log(`⚠️  Restaurant ${restaurant.name} has only ${tables.length} tables.`);
        console.log(`   Recommended: ${TABLES_PER_RESTAURANT} tables for full stress test.`);
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to setup restaurants:', error.message);
    process.exit(1);
  }
}

/**
 * Generate random customer data
 */
function generateCustomer(index: number) {
  const names = ['John', 'Jane', 'Mike', 'Sarah', 'Alex', 'Emma', 'Chris', 'Lisa', 'Tom', 'Anna'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  
  return {
    name: `${randomName} Test${index}`,
    email: `test${index}@stress-test.com`,
    phone: `+971${String(index).padStart(9, '0')}`,
    partySize: Math.floor(Math.random() * 6) + 1, // 1-6 people
  };
}

/**
 * Create a reservation or queue entry
 */
async function createReservation(restaurantId: string, customerIndex: number, mode: 'reserve' | 'waitlist'): Promise<void> {
  const customer = generateCustomer(customerIndex);
  
  try {
    await apiRequest('/reservations', 'POST', {
      restaurantId,
      mode,
      name: customer.name,
      partySize: customer.partySize,
      contactMethod: Math.random() > 0.5 ? 'email' : 'phone',
      email: customer.email,
      phone: customer.phone,
      gender: ['male', 'female', 'prefer-not-to-say'][Math.floor(Math.random() * 3)],
      seatingPreference: ['indoor', 'outdoor', 'no-preference'][Math.floor(Math.random() * 3)],
    });
  } catch (error: any) {
    // Expected some failures due to duplicate bookings
    if (!error.message.includes('409')) {
      console.error(`   Failed to create reservation: ${error.message}`);
    }
  }
}

/**
 * Simulate user activity: browsing restaurants
 */
async function simulateUserBrowsing(): Promise<void> {
  try {
    // Random restaurant from test set
    const restaurant = testRestaurants[Math.floor(Math.random() * testRestaurants.length)];
    
    // Fetch restaurant details
    await apiRequest(`/restaurants/${restaurant.id}`);
    
    // 50% chance to also fetch queue estimate
    if (Math.random() > 0.5) {
      await apiRequest(`/queue/${restaurant.id}/estimate?partySize=${Math.floor(Math.random() * 6) + 1}`);
    }
  } catch (error) {
    // Ignore errors in browsing
  }
}

/**
 * Main stress test execution
 */
async function runStressTest(): Promise<void> {
  console.log('\n🚀 Starting Stress Test...');
  console.log(`   Duration: ${TEST_DURATION_MS / 60000} minutes`);
  console.log(`   Total People: ${TOTAL_PEOPLE}`);
  console.log(`   Restaurants: ${testRestaurants.length}`);
  console.log(`   Tables per Restaurant: ~${TABLES_PER_RESTAURANT}\n`);

  const startTime = Date.now();
  const peoplePerRestaurant = Math.floor(TOTAL_PEOPLE / testRestaurants.length);
  
  // Phase 1: Create initial load of reservations (first 60% over first 5 minutes)
  const initialLoadCount = Math.floor(TOTAL_PEOPLE * 0.6);
  const initialLoadDuration = 5 * 60 * 1000; // 5 minutes
  
  console.log(`📥 Phase 1: Creating initial load (${initialLoadCount} people over 5 min)...`);
  
  const initialPromises: Promise<void>[] = [];
  for (let i = 0; i < initialLoadCount; i++) {
    const restaurant = testRestaurants[i % testRestaurants.length];
    const mode = Math.random() > 0.3 ? 'waitlist' : 'reserve';
    
    // Stagger requests over 5 minutes
    const delay = (initialLoadDuration / initialLoadCount) * i;
    
    const promise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        await createReservation(restaurant.id, i, mode);
        resolve();
      }, delay);
    });
    
    initialPromises.push(promise);
  }

  // Phase 2: Continuous activity for remaining duration
  console.log(`🔄 Phase 2: Continuous activity...`);
  
  const continuousActivity = setInterval(() => {
    // Create new reservations
    for (let i = 0; i < 5; i++) {
      const restaurant = testRestaurants[Math.floor(Math.random() * testRestaurants.length)];
      const customerIndex = initialLoadCount + Math.floor(Math.random() * 1000);
      createReservation(restaurant.id, customerIndex, Math.random() > 0.5 ? 'waitlist' : 'reserve');
    }
    
    // Simulate users browsing
    for (let i = 0; i < 10; i++) {
      simulateUserBrowsing();
    }
  }, 2000); // Every 2 seconds

  // Wait for test duration
  await Promise.all(initialPromises);
  
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      clearInterval(continuousActivity);
      resolve();
    }, TEST_DURATION_MS - (Date.now() - startTime));
  });

  console.log('\n✅ Stress test completed!\n');
}

/**
 * Print test results
 */
function printResults(): void {
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const p50 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)] || 0;
  const p95 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0;
  const p99 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0;

  console.log('📊 STRESS TEST RESULTS');
  console.log('======================\n');
  console.log(`Total Requests:       ${metrics.totalRequests}`);
  console.log(`Successful:           ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed:               ${metrics.failedRequests} (${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Peak Concurrency:     ${metrics.peakConcurrency} concurrent requests\n`);
  
  console.log('Response Times:');
  console.log(`  Average:            ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Median (p50):       ${p50}ms`);
  console.log(`  95th percentile:    ${p95}ms`);
  console.log(`  99th percentile:    ${p99}ms\n`);

  if (metrics.errors.length > 0) {
    console.log(`⚠️  Errors (showing first 10 of ${metrics.errors.length}):`);
    metrics.errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.endpoint}: ${err.error}`);
    });
    console.log();
  }

  // Pass/Fail Criteria
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  const pass = successRate >= 95 && p95 < 2000 && metrics.failedRequests < metrics.totalRequests * 0.05;

  console.log('🎯 TEST VERDICT');
  console.log('================\n');
  console.log(`Success Rate:         ${pass && successRate >= 95 ? '✅' : '❌'} ${successRate.toFixed(2)}% (target: ≥95%)`);
  console.log(`95th Percentile:      ${pass && p95 < 2000 ? '✅' : '❌'} ${p95}ms (target: <2000ms)`);
  console.log(`Error Rate:           ${pass && metrics.failedRequests < metrics.totalRequests * 0.05 ? '✅' : '❌'} ${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}% (target: <5%)\n`);
  
  if (pass) {
    console.log('🎉 STRESS TEST PASSED! Application handled the load successfully.\n');
    process.exit(0);
  } else {
    console.log('❌ STRESS TEST FAILED! Application did not meet performance criteria.\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   TABLI STRESS TEST                       ║');
  console.log('║   30 Tables | 600 People | 20 Minutes     ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    await setupRestaurants();
    await runStressTest();
    printResults();
  } catch (error: any) {
    console.error('\n❌ Stress test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
main();

