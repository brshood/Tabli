# Stress Test Mode: True vs False Comparison

## What Changes When `STRESS_TEST_MODE=true`

### 1. Global Rate Limiter (applies to ALL routes)
- **False (Normal)**: 1,000 requests per 15 minutes
- **True (Stress Test)**: **50,000 requests per 15 minutes** (50x increase)
- **Impact**: This affects every endpoint in your API

### 2. Staff Rate Limiter (for dashboard, analytics, reservations, tables)
- **False (Normal)**: 2,000 requests per 15 minutes
- **True (Stress Test)**: **100,000 requests per 15 minutes** (50x increase)
- **Impact**: Routes like `/dashboard`, `/analytics`, `/reservations`, `/tables` get higher limits

### 3. Reservations Rate Limiter (for booking/reservation endpoints)
- **False (Normal)**: 500 requests per 5 minutes
- **True (Stress Test)**: **25,000 requests per 5 minutes** (50x increase)
- **Impact**: The `/reservations` and `/queue` endpoints can handle way more traffic

### 4. Queue Route Middleware
- **False (Normal)**: Queue route has NO staff limiter (only global limiter)
- **True (Stress Test)**: Queue route gets staff limiter applied (for consistency)
- **Impact**: `/queue` endpoints get the higher 100,000/15min limit during stress test

### 5. Auth Rate Limiter
- **False (Normal)**: 10 requests per 15 minutes
- **True (Stress Test)**: **10 requests per 15 minutes** (UNCHANGED)
- **Impact**: Security is never compromised - auth limits stay the same

## Visual Comparison

| Limiter | Normal Mode | Stress Test Mode | Increase |
|---------|-------------|------------------|----------|
| **Global** | 1,000 / 15min | 50,000 / 15min | **50x** |
| **Staff** | 2,000 / 15min | 100,000 / 15min | **50x** |
| **Reservations** | 500 / 5min | 25,000 / 5min | **50x** |
| **Auth** | 10 / 15min | 10 / 15min | **0x** (unchanged) |
| **Queue Route** | Global only | Staff + Global | Higher effective limit |

## Expected Test Results

### With `STRESS_TEST_MODE=false` (Previous Run):
- ❌ **75.21% failure rate** (3,614 failures)
- ✅ Only 24.79% success rate
- ❌ Mostly 429 errors ("Too many requests")
- ✅ 1,191 successful requests out of 4,805 total

### With `STRESS_TEST_MODE=true` (Expected):
- ✅ **< 10% failure rate** (target)
- ✅ **> 90% success rate** (expected)
- ✅ Fewer 429 errors
- ✅ Most requests should succeed
- ✅ All table creations should work
- ✅ Most customer creations should work
- ✅ Seating operations should work

## Real-World Impact

During a **busy day simulation**:
- Multiple restaurants creating tables ✅
- Hundreds of customers joining queues ✅
- Staff seating customers simultaneously ✅
- Analytics and dashboard updates ✅
- Real-time notifications ✅

All of these operations will be allowed through instead of being blocked by rate limits!

