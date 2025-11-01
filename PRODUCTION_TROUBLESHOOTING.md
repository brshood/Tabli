# Production Troubleshooting Guide

## Issue: Code works on localhost but not on Netlify/Railway

### Fixed Issues
1. ✅ **Environment Variable Access**: Changed from `(import.meta as any)?.env?.VITE_API_URL` to `import.meta.env.VITE_API_URL`
2. ✅ **TypeScript Types**: Added `vite-env.d.ts` for proper TypeScript support
3. ✅ **Error Handling**: Enhanced error logging for better debugging

### Checklist to Verify

#### 1. Netlify Environment Variables
- [ ] Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
- [ ] Verify `VITE_API_URL` is set to: `https://tabli-production.up.railway.app` (your Railway URL)
- [ ] Make sure it's set for **Production** context (or all contexts)
- [ ] **Important**: After adding/updating, you MUST redeploy for changes to take effect

#### 2. Railway Environment Variables
- [ ] Go to Railway Dashboard → Your Service → Variables
- [ ] Verify:
  - `MONGODB_URI` is set
  - `JWT_SECRET` is set (and different from local dev)
  - `CORS_ORIGIN=https://tabli.netlify.app` (no trailing slash!)
  - `PORT` (Railway sets this automatically)

#### 3. Railway Service Status
- [ ] Check Railway Dashboard → Your Service → Deployments
- [ ] Latest deployment should be "Running" (green)
- [ ] Check logs for errors
- [ ] Test health endpoint: `https://tabli-production.up.railway.app/health`
  - Should return: `{"status":"ok"}`

#### 4. Frontend Build
- [ ] Netlify build should complete successfully
- [ ] Check Netlify deploy logs for any build errors
- [ ] Verify `VITE_API_URL` is being used (check browser console)

### Debugging Steps

#### Check Browser Console (Production)
1. Open your Netlify site: `https://tabli.netlify.app`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try signup/login
5. Look for:
   - Network errors
   - CORS errors
   - API URL being used (should be Railway URL, not localhost)

#### Check Network Tab
1. Open Developer Tools → Network tab
2. Try signup/login
3. Look for requests to `/auth/signup` or `/auth/login`
4. Check:
   - Request URL (should be Railway URL)
   - Response status (should be 200 or 400/409 for validation errors)
   - Response body (check for error messages)

#### Check Railway Logs
1. Railway Dashboard → Your Service → Logs
2. Try signup from production site
3. Check logs for:
   - Request received
   - Errors (especially MongoDB connection errors)
   - Stack traces

### Common Issues

#### Issue: "Network error" in browser
**Cause**: API_URL not set or Railway not running
**Fix**: 
- Verify `VITE_API_URL` in Netlify
- Redeploy Netlify
- Verify Railway service is running

#### Issue: CORS error
**Cause**: `CORS_ORIGIN` mismatch
**Fix**:
- Railway `CORS_ORIGIN` must exactly match `https://tabli.netlify.app` (no trailing slash, no http)
- Redeploy Railway after updating

#### Issue: 500 Internal Server Error
**Cause**: Backend error (check Railway logs)
**Fix**:
- Check Railway logs for detailed error
- Verify MongoDB connection
- Verify all required environment variables are set

#### Issue: Build fails on Netlify
**Cause**: TypeScript or build errors
**Fix**:
- Check Netlify build logs
- Verify all dependencies are in `package.json`
- Try building locally: `npm run build`

### Testing Checklist

1. ✅ Health check works: `https://tabli-production.up.railway.app/health`
2. ✅ Signup works from Netlify
3. ✅ Login works from Netlify
4. ✅ No CORS errors in browser console
5. ✅ API requests go to Railway (check Network tab)

### Next Steps

After fixing the environment variable access:
1. Commit and push changes
2. Netlify will auto-redeploy
3. Test signup/login from production
4. Check browser console for any remaining errors
5. Check Railway logs if issues persist

