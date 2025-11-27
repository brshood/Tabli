# Tabli Stress Test Script

## Overview

This stress test script simulates high-load scenarios to ensure the Tabli application can handle:
- **30 tables** per restaurant
- **600 concurrent users** (reservations + queue entries)
- **20 minutes** of sustained activity

## Prerequisites

1. Ensure the API server is running locally or configure `API_URL` environment variable
2. Have at least 2 approved restaurants in the system with tables configured
3. Install TypeScript and ts-node if not already installed:
   ```bash
   npm install -g typescript ts-node
   ```

## Running the Test

### Basic Usage

```bash
cd scripts
npx ts-node stress-test.ts
```

### With Custom API URL

```bash
API_URL=https://your-api-url.com npx ts-node stress-test.ts
```

## What the Test Does

### Phase 1: Initial Load (First 5 minutes)
- Creates 360 reservations/queue entries (60% of total)
- Staggers requests evenly over 5 minutes
- Simulates realistic customer signup patterns

### Phase 2: Continuous Activity (Remaining 15 minutes)
- Creates 5 new reservations every 2 seconds
- Simulates 10 users browsing restaurants every 2 seconds
- Tests sustained concurrent load

## Success Criteria

The test passes if ALL of the following conditions are met:

- ✅ **Success Rate**: ≥95% of requests complete successfully
- ✅ **95th Percentile Response Time**: <2000ms
- ✅ **Error Rate**: <5% of total requests

## Test Metrics

The script tracks and reports:

- Total requests made
- Successful vs failed requests
- Average, median, p95, and p99 response times
- Peak concurrent request count
- Detailed error logs

## Example Output

```
╔═══════════════════════════════════════════╗
║   TABLI STRESS TEST                       ║
║   30 Tables | 600 People | 20 Minutes     ║
╚═══════════════════════════════════════════╝

🔧 Setting up test restaurants...
✅ Using 2 restaurants for testing:
   - Al Fanar Restaurant (ID: 507f1f77...)
   - Arabian Tea House (ID: 507f1f88...)

🚀 Starting Stress Test...
   Duration: 20 minutes
   Total People: 600
   Restaurants: 2
   Tables per Restaurant: ~30

📥 Phase 1: Creating initial load (360 people over 5 min)...
🔄 Phase 2: Continuous activity...

✅ Stress test completed!

📊 STRESS TEST RESULTS
======================

Total Requests:       1,245
Successful:           1,189 (95.50%)
Failed:               56 (4.50%)
Peak Concurrency:     32 concurrent requests

Response Times:
  Average:            245.67ms
  Median (p50):       198ms
  95th percentile:    567ms
  99th percentile:    892ms

🎯 TEST VERDICT
================

Success Rate:         ✅ 95.50% (target: ≥95%)
95th Percentile:      ✅ 567ms (target: <2000ms)
Error Rate:           ✅ 4.50% (target: <5%)

🎉 STRESS TEST PASSED! Application handled the load successfully.
```

## Troubleshooting

### "Only X restaurants found"
- Ensure you have at least 2 restaurants created and **approved** in the admin panel
- Check that restaurants have tables configured

### High Error Rate
- Check server logs for backend errors
- Verify database connection and performance
- Monitor server resources (CPU, memory, database connections)

### Slow Response Times
- Check server resources and database query performance
- Review API endpoint implementations for optimization opportunities
- Consider adding database indexes for frequently queried fields

## Customization

You can modify the test parameters at the top of `stress-test.ts`:

```typescript
const TEST_DURATION_MS = 20 * 60 * 1000; // Test duration
const TOTAL_PEOPLE = 600;                // Total users to simulate
const TABLES_PER_RESTAURANT = 30;        // Expected tables per restaurant
const NUM_RESTAURANTS = 2;               // Number of restaurants to test
```

## Notes

- The script uses realistic customer data patterns
- Some duplicate booking errors are expected and acceptable
- The test simulates both immediate reservations and waitlist entries
- Real-time features (SSE, notifications) are not tested by this script

