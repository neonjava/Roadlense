# Remote Access Setup Guide

This guide explains how to access your RoadFix app from anywhere, not just on the same WiFi network.

## Option 1: Ngrok (Quick & Easy for Testing)

Ngrok creates a public URL that tunnels to your local server. Perfect for development and testing.

### Step 1: Start Your Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Create Ngrok Tunnel for Backend

Open a new terminal:

```bash
ngrok http 8000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

### Step 3: Update Frontend Configuration

Edit `frontend/.env`:

```bash
cd frontend
nano .env
```

Change to your ngrok URL:
```
REACT_APP_BACKEND_URL=https://abc123.ngrok-free.app
```

**Important:** Use the HTTPS URL, not HTTP!

### Step 4: Rebuild Android App

```bash
npm run build:android
npm run open:android
```

Then in Android Studio:
1. Build → Clean Project
2. Build → Rebuild Project
3. Run the app

### Step 5: Update Network Security Config (for Ngrok)

Since ngrok provides HTTPS, you can actually remove the cleartext traffic config or update it.

Edit `frontend/android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow HTTPS from ngrok -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- Only allow cleartext for localhost during development -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

### Ngrok Limitations

- **Free tier:** URL changes every time you restart ngrok
- **Session timeout:** Free sessions expire after 2 hours
- **Rate limits:** Limited requests per minute

### Keeping the Same URL

To get a permanent URL, you need an ngrok account:

1. Sign up at https://ngrok.com
2. Get your auth token
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Use a static domain (paid feature) or reserved domain (free with account)

---

## Option 2: Deploy to Cloud (Production)

For a permanent solution, deploy to cloud platforms.

### Backend Deployment Options

#### A. Render (Recommended - Free Tier Available)

1. **Create account** at https://render.com
2. **Create new Web Service**
3. **Connect GitHub repo** or upload code
4. **Configure:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     - `MONGO_URL`: Your MongoDB connection string
     - `DB_NAME`: roadfix
     - `ANTHROPIC_API_KEY`: Your API key
     - `ALLOWED_ORIGINS`: Leave empty for development

5. **Deploy** - You'll get a URL like `https://roadfix-api.onrender.com`

#### B. Railway

1. Go to https://railway.app
2. Create new project
3. Deploy from GitHub
4. Add environment variables
5. Get your deployment URL

#### C. Fly.io

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch` (in backend directory)
4. Deploy: `fly deploy`

### Frontend Deployment Options

#### A. Vercel (Recommended for React)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Set environment variable:**
   - In Vercel dashboard, add `REACT_APP_BACKEND_URL` with your backend URL

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

#### B. Netlify

1. Install CLI: `npm install -g netlify-cli`
2. Build: `npm run build`
3. Deploy: `netlify deploy --prod --dir=build`

### MongoDB Hosting

For production, you need a cloud MongoDB:

#### MongoDB Atlas (Free Tier Available)

1. **Sign up** at https://www.mongodb.com/cloud/atlas
2. **Create cluster** (free M0 tier)
3. **Create database user**
4. **Whitelist IP:** Add `0.0.0.0/0` (allow from anywhere)
5. **Get connection string:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/roadfix
   ```
6. **Update backend .env:**
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   DB_NAME=roadfix
   ```

---

## Option 3: VPS Deployment (Advanced)

Deploy to a VPS like DigitalOcean, AWS EC2, or Linode.

### Requirements
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt - free)
- Nginx for reverse proxy
- PM2 or systemd for process management

### Quick VPS Setup

1. **Get a VPS** (DigitalOcean Droplet, AWS EC2, etc.)

2. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3-pip nginx mongodb
   ```

3. **Clone your repo:**
   ```bash
   git clone https://github.com/yourusername/roadfix.git
   cd roadfix
   ```

4. **Setup backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

6. **Start backend with PM2:**
   ```bash
   pm2 start "uvicorn server:app --host 0.0.0.0 --port 8000" --name roadfix-api
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location / {
           root /var/www/roadfix;
           try_files $uri /index.html;
       }
   }
   ```

8. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Recommended Approach

### For Development/Testing:
✅ **Use Ngrok** - Fastest and easiest

### For Production:
✅ **Backend:** Render or Railway (free tier)  
✅ **Frontend:** Vercel or Netlify (free tier)  
✅ **Database:** MongoDB Atlas (free tier)

### Cost Breakdown (Free Tier)
- Backend (Render): Free (sleeps after inactivity)
- Frontend (Vercel): Free (unlimited bandwidth)
- Database (MongoDB Atlas): Free (512MB storage)
- **Total: $0/month**

---

## Quick Start with Ngrok (Right Now)

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Terminal 2 - Ngrok:**
   ```bash
   ngrok http 8000
   ```
   Copy the HTTPS URL

3. **Update frontend/.env:**
   ```
   REACT_APP_BACKEND_URL=https://YOUR-NGROK-URL.ngrok-free.app
   ```

4. **Rebuild Android:**
   ```bash
   cd frontend
   npm run build:android
   ```

5. **Test:** Your app now works from anywhere! 🎉

---

## Troubleshooting

### Ngrok "ERR_NGROK_108"
- You hit the free tier limit
- Wait or upgrade to paid plan

### Backend Not Accessible
- Check CORS settings in backend
- Ensure `ALLOWED_ORIGINS` is empty or includes ngrok URL

### Android Still Can't Connect
- Make sure you're using HTTPS URL from ngrok
- Rebuild the Android app after changing .env
- Check network security config allows HTTPS

### Frontend Shows Old Backend URL
- Clear app data on Android
- Uninstall and reinstall the app
- Make sure you rebuilt after changing .env
