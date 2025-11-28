# Stress Test Script

A comprehensive stress testing harness for the Tabli API that simulates high user load.

## Usage

```bash
# Basic usage
npm run stress-test -- --restaurant-id <RESTAURANT_ID>

# With custom options
npm run stress-test -- \
  --url http://localhost:8080 \
  --restaurant-id <RESTAURANT_ID> \
  --concurrent 50 \
  --duration 60

# Or use tsx directly
tsx scripts/stress-test.ts --restaurant-id <RESTAURANT_ID> --concurrent 100 --duration 120
```

## Options

- `--url, -u <url>` - API base URL (default: `http://localhost:8080`)
- `--restaurant-id, -r <id>` - Restaurant ID to test against (**required**)
- `--concurrent, -c <number>` - Number of concurrent workers (default: `10`)
- `--duration, -d <seconds>` - Test duration in seconds (default: `30`)
- `--help, -h` - Show help message

## Test Scenarios

The stress test randomly executes these scenarios:

1. **Join Queue** - POST `/queue/:restaurantId/join`
2. **Get Queue Estimate** - GET `/queue/:restaurantId/estimate`
3. **Get Restaurants** - GET `/restaurants`
4. **Get Dashboard Summary** - GET `/dashboard/:restaurantId/summary`
5. **Get Reservations** - GET `/reservations?restaurantId=:id`
6. **Get Tables** - GET `/restaurants/:restaurantId/tables`

## Output

The script provides detailed statistics:

- Total requests, success/failure rates
- Requests per second
- Response time metrics (avg, min, max, p50, p95, p99)
- Status code distribution
- Top error messages

## Example Output

```
================================================================================
STRESS TEST RESULTS
================================================================================
Test Duration: 30.00s
API URL: http://localhost:8080
Restaurant ID: 507f1f77bcf86cd799439011
Concurrent Workers: 50

OVERALL STATISTICS:
  Total Requests: 1523
  Successful: 1501 (98.56%)
  Failed: 22 (1.44%)
  Requests/sec: 50.77

RESPONSE TIME (ms):
  Average: 145
  Min: 23
  Max: 892
  p50 (Median): 128
  p95: 342
  p99: 567

STATUS CODES:
  200: 1501 (98.56%)
  409: 18 (1.18%)
  500: 4 (0.26%)
================================================================================
```

## Exit Codes

- `0` - Test completed successfully (failure rate ≤ 10%)
- `1` - Test failed or failure rate > 10%

## Notes

- The script automatically generates unique customer data for each request
- Duplicate reservations may occur at high concurrency (409 status code is expected)
- Network errors are tracked separately from HTTP errors
- Results are stored in memory during the test

