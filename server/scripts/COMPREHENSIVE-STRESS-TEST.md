# Comprehensive Stress Test

This stress test simulates a realistic high-load scenario with multiple restaurants, tables, and customers.

## Configuration

- **50 restaurants** (configurable)
- **10-30 tables per restaurant** (random)
- **50-800 customers per restaurant** (random)
- **25-30 minutes average dwell time** (simulated when seating customers)

## Usage

### Basic Usage

```bash
npm run stress-test-comprehensive
```

### With Custom URL

```bash
npm run stress-test-comprehensive -- --url https://production-url.com
```

### With Custom Number of Restaurants

```bash
npm run stress-test-comprehensive -- --restaurants 100
```

### Full Example

```bash
npm run stress-test-comprehensive -- --url https://tabli-production-ef30.up.railway.app --restaurants 50
```

## How It Works

1. **Loads existing restaurants** from the database (up to the specified count)
2. **Creates tables** for each restaurant (10-30 tables, random)
3. **Creates customers** joining the queue (50-800 per restaurant, random)
4. **Seats customers** at tables to simulate active service

### Dwell Time Simulation

The script simulates 25-30 minute dwell times by:
- Seating customers at tables (sets `seatedAt` to current time)
- Attempting to adjust `seatedAt` to a time in the past (25-30 minutes ago)
- When customers checkout, their dwell time will be in the 25-30 minute range

**Note:** The actual dwell time adjustment depends on API support for updating `seatedAt`. If not supported, dwell times will be minimal (near 0), but the stress test will still create the load as requested.

## Output

The script provides detailed statistics:

- **Resources Created**: Number of restaurants, tables, and customers
- **Overall Statistics**: Total requests, success/failure rates, requests per second
- **Response Times**: Average, min, max, p50, p95, p99 percentiles
- **Status Codes**: Breakdown of HTTP status codes
- **Errors**: Top errors encountered
- **Restaurant Breakdown**: Individual statistics per restaurant

## Requirements

- The API must have existing restaurants in the database
- Restaurants must be approved (visible via `/restaurants` endpoint)
- Sufficient database capacity for the test data

## Example Output

```
================================================================================
COMPREHENSIVE STRESS TEST RESULTS
================================================================================
Test Duration: 125.43s
API URL: https://tabli-production-ef30.up.railway.app
Target Restaurants: 50
Restaurants Used: 50

RESOURCES CREATED:
  Restaurants: 50
  Tables: 1,250
  Customers (Queue Entries): 21,500

OVERALL STATISTICS:
  Total Requests: 23,250
  Successful: 21,800 (93.76%)
  Failed: 1,450 (6.24%)
  Requests/sec: 185.42

RESPONSE TIME (ms):
  Average: 1,245
  Min: 45
  Max: 5,230
  p50 (Median): 890
  p95: 3,210
  p99: 4,890
...
```

## Notes

- The test creates real data in your database
- Customers use unique email/phone combinations to avoid duplicate errors
- The test processes restaurants sequentially but customers in batches
- Small delays are added between batches to avoid overwhelming the server

