# Railway Backend Deployment Guide

## Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub repository with your code
- MongoDB Atlas connection string
- Environment variables ready

## Step 1: Create Railway Project

1. Go to https://railway.app and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Select the **`server`** directory as the root

## Step 2: Configure Environment Variables

In Railway dashboard, go to your service → **Variables** tab, add:

```
PORT=8080
NODE_ENV=production
MONGODB_URI=mongodb+srv://tabliteam_db_user:shNvnkHQU2iHNv09@cluster0.lz8m2xx.mongodb.net/?appName=Cluster0
JWT_SECRET=your-production-secret-key-here-change-this
CORS_ORIGIN=https://your-frontend-domain.netlify.app
```

**Optional (for notifications):**
```
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Step 3: Railway Configuration

Railway will automatically detect:
- **Root Directory**: `server`
- **Start Command**: `npm start` (from package.json)
- **Build Command**: `npm install` (from railway.json)

The `railway.json` file is already configured in your repo.

## Step 4: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Or click **"Deploy"** in the Railway dashboard
3. Wait for deployment to complete (usually 2-3 minutes)

## Step 5: Get Your Backend URL

1. Once deployed, Railway will provide a public URL like:
   ```
   https://your-app-name.up.railway.app
   ```
2. Copy this URL - you'll need it for your frontend

## Step 6: Update Frontend

In your frontend `.env` or Netlify environment variables:
```
VITE_API_URL=https://your-app-name.up.railway.app
```

## Step 7: Custom Domain (Optional)

1. In Railway dashboard → **Settings** → **Domains**
2. Click **"Generate Domain"** or add your custom domain
3. Update `CORS_ORIGIN` to match your frontend domain

## Troubleshooting

### Build Fails
- Check Railway logs: **Deployments** → Click deployment → **View Logs**
- Ensure `tsx` is in `dependencies` (not `devDependencies`)
- Verify Node.js version matches (>=18)

### Connection Errors
- Check MongoDB Atlas allows Railway IPs (or set IP whitelist to `0.0.0.0/0`)
- Verify `MONGODB_URI` is correct in Railway variables

### CORS Errors
- Ensure `CORS_ORIGIN` matches your frontend URL exactly
- For multiple origins, you'll need to update `server/src/app.ts` CORS config

## Monitoring

- **Logs**: View in Railway dashboard → **Deployments** → **View Logs**
- **Metrics**: Railway dashboard shows CPU, memory, and network usage
- **Health Check**: Test `https://your-app-name.up.railway.app/health`

## Auto-Deploy from GitHub

Railway automatically deploys when you:
1. Push to the `main` branch (default)
2. Or merge a pull request to `main`

To change the branch, go to **Settings** → **Source** → **Branch**

## Cost

- Railway offers a **free tier** with $5 credit/month
- After that: ~$5/month for small projects
- MongoDB Atlas: Free tier (M0) available

---

**Need Help?** Check Railway docs: https://docs.railway.app

