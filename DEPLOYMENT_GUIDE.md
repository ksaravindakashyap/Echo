# Just-Chat Application Deployment Guide

## Overview
This guide covers deploying your Just-Chat application using:
- **Netlify** for the React frontend
- **Railway** for the Node.js backend

## Prerequisites
- GitHub account
- Netlify account
- Railway account
- Your application code pushed to GitHub

---

## Part 1: Backend Deployment on Railway

### Step 1: Prepare Your Backend

#### 1.1 Environment Variables Required
Your backend needs these environment variables:

```env
# Required Environment Variables
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.netlify.app
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
SESSION_SECRET=your-super-secure-session-secret-key-minimum-32-characters
```

#### 1.2 Update Server Configuration
Ensure your `server/src/index.js` has proper CORS configuration:

```javascript
// CORS should allow your Netlify URL
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
```

### Step 2: Deploy to Railway

#### 2.1 Connect to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your Just-Chat repository
6. Select the `server` folder as the root directory

#### 2.2 Configure Railway Deployment
1. In Railway dashboard, go to your project
2. Click on "Variables" tab
3. Add these environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=generate-a-strong-32-character-secret-key-here
   SESSION_SECRET=generate-another-strong-32-character-secret-key
   CLIENT_URL=https://your-app-name.netlify.app
   ```

#### 2.3 Railway Configuration File
Create `railway.toml` in your server directory:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### 2.4 Update Package.json Scripts
Ensure your `server/package.json` has the correct start script:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "init-db": "node src/db/init.js"
  }
}
```

### Step 3: Database Initialization
Railway will automatically run your SQLite database. The database file will be created in the container's filesystem.

---

## Part 2: Frontend Deployment on Netlify

### Step 1: Prepare Frontend Configuration

#### 1.1 Environment Variables for React
Create environment variables for your React app. In your `client` directory, you'll need:

```env
# Frontend Environment Variables
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_SERVER_URL=https://your-backend.railway.app
```

#### 1.2 Update API Configuration
Update your `client/src/lib/api.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

### Step 2: Update Netlify Configuration

#### 2.1 Update netlify.toml
Update your existing `netlify.toml` with your Railway backend URL:

```toml
[build]
  base = "client/"
  publish = "client/build"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# Redirect rules for SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# API proxy to Railway backend
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-name.railway.app/api/:splat"
  status = 200
  force = true

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Cache static assets
[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Step 3: Deploy to Netlify

#### 3.1 Connect to Netlify
1. Go to [Netlify.com](https://netlify.com)
2. Sign up/login with GitHub
3. Click "New site from Git"
4. Choose your Just-Chat repository
5. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`

#### 3.2 Configure Environment Variables
1. In Netlify dashboard, go to Site settings
2. Click "Environment variables"
3. Add these variables:
   ```
   REACT_APP_API_URL=https://your-backend-name.railway.app
   REACT_APP_SERVER_URL=https://your-backend-name.railway.app
   ```

---

## Part 3: Final Configuration & Testing

### Step 1: Update CORS Origins
After deployment, update your Railway environment variables:

1. Get your Netlify URL (e.g., `https://your-app-name.netlify.app`)
2. In Railway, update `CLIENT_URL` to your Netlify URL
3. Redeploy your Railway backend

### Step 2: Update Netlify Redirects
Update your `netlify.toml` with the actual Railway URL:

```toml
# API proxy to Railway backend
[[redirects]]
  from = "/api/*"
  to = "https://just-chat-backend-production.railway.app/api/:splat"
  status = 200
  force = true
```

### Step 3: Test All Functionality

#### 3.1 Test Checklist
- [ ] User registration works
- [ ] User login works
- [ ] JWT authentication works
- [ ] Chat rooms can be created
- [ ] Real-time messaging works
- [ ] Socket.io connection works
- [ ] Private rooms work with access codes
- [ ] User sessions persist

#### 3.2 Common Issues & Solutions

**Issue: CORS errors**
- Solution: Ensure `CLIENT_URL` in Railway matches your Netlify URL exactly

**Issue: Socket.io connection fails**
- Solution: Check that `REACT_APP_SERVER_URL` points to your Railway URL

**Issue: API calls fail**
- Solution: Verify netlify.toml redirects point to correct Railway URL

**Issue: Authentication doesn't work**
- Solution: Ensure JWT_SECRET and SESSION_SECRET are set in Railway

---

## Part 4: Advanced Configuration

### Step 1: Custom Domains (Optional)

#### 4.1 Netlify Custom Domain
1. In Netlify dashboard: Site settings → Domain management
2. Add custom domain
3. Update DNS records as instructed

#### 4.2 Railway Custom Domain
1. In Railway dashboard: Settings → Domains
2. Add custom domain
3. Update DNS records as instructed

### Step 2: SSL/HTTPS
Both Netlify and Railway provide automatic SSL certificates.

### Step 3: Monitoring & Logs

#### 4.1 Railway Logs
- View logs in Railway dashboard: Deploy → View logs

#### 4.2 Netlify Deploy Logs
- View deploy logs in Netlify dashboard: Deploys → Deploy log

---

## Part 5: Maintenance & Updates

### Step 1: Automated Deployments
Both platforms automatically deploy when you push to your GitHub repository.

### Step 2: Environment Management
- **Development**: Use local environment
- **Production**: Railway + Netlify with production environment variables

### Step 3: Database Backups
For production, consider migrating to Railway's PostgreSQL for better data persistence:

1. In Railway, add PostgreSQL service
2. Update your database connection code
3. Migrate from SQLite to PostgreSQL

---

## Quick Deployment Commands

### Deploy Backend to Railway
```bash
# 1. Push your code to GitHub
git add .
git commit -m "Prepare for Railway deployment"
git push origin main

# 2. Railway will automatically deploy
```

### Deploy Frontend to Netlify
```bash
# 1. Build locally to test
cd client
npm run build

# 2. Push to GitHub
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main

# 3. Netlify will automatically deploy
```

---

## Environment Variables Summary

### Railway (Backend)
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-app-name.netlify.app
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
SESSION_SECRET=your-super-secure-session-secret-minimum-32-chars
```

### Netlify (Frontend)
```env
REACT_APP_API_URL=https://your-backend-name.railway.app
REACT_APP_SERVER_URL=https://your-backend-name.railway.app
```

---

## Support & Troubleshooting

### Common Commands
```bash
# Check Railway logs
railway logs

# Check local build
cd client && npm run build
cd server && npm start

# Test API endpoints
curl https://your-backend-name.railway.app/api/health
```

### Need Help?
- Railway Documentation: https://docs.railway.app
- Netlify Documentation: https://docs.netlify.com
- Socket.io Documentation: https://socket.io/docs/

---

*This deployment guide ensures your Just-Chat application runs smoothly in production with all real-time features working correctly.* 