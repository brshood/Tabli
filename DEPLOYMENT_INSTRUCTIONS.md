# Deployment Instructions for Stress Test Mode

## ✅ Step 1: Check Railway Environment Variable

In Railway dashboard:
1. Go to your service → **Variables** tab
2. Find `STRESS_TEST_MODE`
3. **Important**: Value should be `true` (NO quotes)
   - ✅ Correct: `STRESS_TEST_MODE=true`
   - ❌ Wrong: `STRESS_TEST_MODE="true"`
4. If it has quotes, edit it and remove them

## ✅ Step 2: Deploy the Code Changes

Your code is committed to the `vapid` branch. Railway needs to deploy it:

### Option A: Merge to Main (Recommended)
```bash
git checkout main
git merge vapid
git push origin main
```
Railway will auto-deploy from `main` branch.

### Option B: Change Railway to Watch `vapid` Branch
1. Railway Dashboard → Your Service → **Settings** → **Source**
2. Change branch from `main` to `vapid`
3. Railway will auto-deploy

### Option C: Manual Redeploy (if already watching correct branch)
1. Railway Dashboard → Your Service
2. Click **"Deploy"** or **"Redeploy"**
3. Wait for deployment to complete (~2-3 minutes)

## ✅ Step 3: Verify Deployment

After deployment:
1. Check Railway logs - should see the server starting
2. Wait 1-2 minutes for full restart
3. Run the stress test again

## Expected Results After Deployment

With `STRESS_TEST_MODE=true` and code deployed:
- ✅ **< 10% failure rate** (instead of 95%)
- ✅ **Most customer creations succeed**
- ✅ **Seating operations work**
- ✅ **Fewer 429 errors**

## Quick Test

After deployment, check Railway logs for any errors, then run:
```bash
npm run stress-test-comprehensive -- --url https://tabli-production-ef30.up.railway.app --restaurants 9
```

