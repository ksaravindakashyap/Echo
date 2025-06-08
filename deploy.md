# Step-by-Step Deployment Checklist

## Prerequisites ✅
- [ ] GitHub repository is ready
- [ ] Code is committed and pushed
- [ ] Railway account created
- [ ] Netlify account created

## Step 1: Deploy Backend to Railway 🚀

### 1.1 Railway Setup
1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your Just-Chat repository**
6. **Important**: Select "Configure" and set root directory to `server/`

### 1.2 Environment Variables
In Railway dashboard, go to **Variables** tab and add:

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
SESSION_SECRET=your-super-secure-session-secret-key-minimum-32-characters-long
CLIENT_URL=https://your-netlify-app-name.netlify.app
```

**Important**: Replace `your-netlify-app-name` with your actual Netlify app name (you'll get this in step 2)

### 1.3 Verify Deployment
- [ ] Railway deployment succeeds
- [ ] Note your Railway URL (e.g., `https://just-chat-backend-production.railway.app`)
- [ ] Test health endpoint: `https://your-railway-url.railway.app/api/health`

---

## Step 2: Deploy Frontend to Netlify 🌐

### 2.1 Netlify Setup
1. **Go to Netlify**: https://netlify.com
2. **Sign in** with GitHub
3. **Click "New site from Git"**
4. **Choose your Just-Chat repository**
5. **Configure build settings**:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/build`

### 2.2 Environment Variables
In Netlify dashboard, go to **Site settings** → **Environment variables** and add:

```env
REACT_APP_API_URL=https://your-railway-url.railway.app
REACT_APP_SERVER_URL=https://your-railway-url.railway.app
```

**Important**: Replace `your-railway-url` with your actual Railway URL from Step 1.3

### 2.3 Update netlify.toml
Update the file `netlify.toml` in your root directory:

```toml
# Replace this line:
to = "https://your-backend-name.railway.app/api/:splat"

# With your actual Railway URL:
to = "https://your-actual-railway-url.railway.app/api/:splat"
```

---

## Step 3: Connect Frontend and Backend 🔗

### 3.1 Update Railway Environment
Now that you have your Netlify URL, update Railway:

1. **Go to Railway dashboard**
2. **Update CLIENT_URL** with your actual Netlify URL
3. **Redeploy** the service

### 3.2 Test Connection
- [ ] Open your Netlify app
- [ ] Open browser dev tools (F12) → Network tab
- [ ] Try to register/login
- [ ] Verify API calls are working (should see calls to `/api/...`)

---

## Step 4: Final Testing 🧪

### 4.1 Core Functionality Test
- [ ] **User Registration**: Create a new account
- [ ] **User Login**: Sign in with credentials
- [ ] **Create Room**: Create a public chat room
- [ ] **Join Room**: Join an existing room
- [ ] **Real-time Chat**: Send messages and see them in real-time
- [ ] **Private Room**: Create a private room with access code
- [ ] **Socket Connection**: Check that real-time features work

### 4.2 Error Checking
Open browser dev tools and check for:
- [ ] No CORS errors in console
- [ ] No 404 errors for API calls
- [ ] Socket.io connection successful
- [ ] No authentication errors

---

## Troubleshooting Guide 🔧

### Issue: CORS Errors
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
**Solution**: 
1. Check `CLIENT_URL` in Railway matches your Netlify URL exactly
2. Redeploy Railway backend

### Issue: Socket.io Won't Connect
```
WebSocket connection failed
```
**Solution**:
1. Verify `REACT_APP_SERVER_URL` in Netlify points to Railway URL
2. Check Railway logs for WebSocket errors

### Issue: API Calls Return 404
```
GET https://your-app.netlify.app/api/auth/login 404
```
**Solution**:
1. Update `netlify.toml` redirects with correct Railway URL
2. Redeploy Netlify

### Issue: JWT/Auth Errors
```
Invalid token / Authentication failed
```
**Solution**:
1. Ensure `JWT_SECRET` and `SESSION_SECRET` are set in Railway
2. Check that secrets are minimum 32 characters long

---

## Quick Commands 💻

### Check Railway Logs
```bash
# If you have Railway CLI installed
railway logs

# Or check in Railway dashboard → Deploy → View logs
```

### Test Endpoints
```bash
# Test backend health
curl https://your-railway-url.railway.app/api/health

# Test if frontend redirects work
curl -I https://your-netlify-app.netlify.app/api/health
```

### Local Development
```bash
# Test frontend build
cd client
npm run build
npm start

# Test backend
cd server
npm start
```

---

## Production URLs 📝

After deployment, save these URLs:

- **Frontend (Netlify)**: `https://your-app-name.netlify.app`
- **Backend (Railway)**: `https://your-backend-name.railway.app`
- **API Health Check**: `https://your-backend-name.railway.app/api/health`

---

## Next Steps 🎯

### Optional Enhancements
1. **Custom Domains**: Set up custom domains for both services
2. **Database Upgrade**: Migrate from SQLite to PostgreSQL on Railway
3. **Monitoring**: Set up uptime monitoring for your services
4. **SSL/Security**: Both platforms provide SSL by default
5. **Performance**: Add caching headers and optimize build

### Maintenance
- Both platforms auto-deploy when you push to GitHub
- Monitor logs regularly for errors
- Update dependencies periodically
- Backup your database data

---

*✅ Your Just-Chat application should now be fully deployed and functional!* 