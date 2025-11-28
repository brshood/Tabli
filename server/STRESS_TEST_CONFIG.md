# Stress Test Configuration Guide

## Overview

For simulating a **really busy day**, we've temporarily increased rate limits by **50x** when `STRESS_TEST_MODE=true` is set.

## Current Rate Limits

### Normal Mode (Production)
- **Global Limiter**: 1,000 requests per 15 minutes
- **Staff Limiter**: 2,000 requests per 15 minutes  
- **Reservations Limiter**: 500 requests per 5 minutes
- **Auth Limiter**: 10 requests per 15 minutes (unchanged for security)

### Stress Test Mode (Busy Day Simulation)
- **Global Limiter**: **50,000 requests per 15 minutes** (50x increase)
- **Staff Limiter**: **100,000 requests per 15 minutes** (50x increase)
- **Reservations Limiter**: **25,000 requests per 5 minutes** (50x increase)
- **Auth Limiter**: 10 requests per 15 minutes (unchanged for security)

## How to Enable Stress Test Mode

### Option 1: Environment Variable (Recommended for Production)

Set the environment variable in your Railway/production environment:

```bash
STRESS_TEST_MODE=true
```

### Option 2: Temporary Code Change (For Quick Testing)

The code already checks for `process.env.STRESS_TEST_MODE === 'true'` in `server/src/app.ts`. 

## What Changed

1. **Rate limits increased 50x** when `STRESS_TEST_MODE=true`
2. **Queue route** gets staff limiter during stress test mode (for consistency)
3. **Auth limiter unchanged** (security should never be compromised)

## Expected Results

With stress test mode enabled, your comprehensive stress test should achieve:
- **Much lower failure rate** (target: < 10% instead of 75%)
- **More successful customer creations**
- **Successful seating operations**
- **Better simulation of busy day traffic**

## Recommendations

### For Stress Testing:
1. ✅ **Enable stress test mode** by setting `STRESS_TEST_MODE=true`
2. ✅ Run the comprehensive stress test
3. ✅ **Disable stress test mode** after testing (set to `false` or remove the env var)

### After Stress Testing:
- **Review the results** to understand system capacity
- **Consider** if normal rate limits need permanent adjustment
- **Monitor** actual production traffic patterns
- **Adjust** rate limits based on real-world usage

## Important Notes

⚠️ **Security**: Auth rate limits are NOT increased during stress test mode  
⚠️ **Temporary**: This is meant for testing only - revert after stress testing  
⚠️ **Production**: Only enable stress test mode when actively stress testing

## Example Usage

### Railway Environment Variable

1. Go to Railway dashboard
2. Select your service
3. Go to Variables tab
4. Add: `STRESS_TEST_MODE = true`
5. Redeploy
6. Run stress test
7. **Remove or set to `false` after testing**

### Local Testing

```bash
# Set environment variable
export STRESS_TEST_MODE=true

# Or in .env file
echo "STRESS_TEST_MODE=true" >> server/.env

# Run your server
cd server
npm run dev
```

## Reverting Changes

After stress testing, either:

1. **Set `STRESS_TEST_MODE=false`** (or remove the env var)
2. Or **remove the env variable** entirely

The code will automatically fall back to normal production limits.

