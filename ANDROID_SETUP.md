# Android Setup Guide for RoadFix

This guide will help you configure the RoadFix app to work on your Android device.

## The Problem

When you build the Android app, it cannot connect to `http://localhost:8000` because on Android, "localhost" refers to the Android device itself, not your PC. You need to configure the app to use your PC's local IP address instead.

## Step-by-Step Setup

### 1. Find Your PC's Local IP Address

Choose the method for your operating system:

**Linux:**
```bash
ip addr show
# OR
hostname -I
```
Look for an IP address like `192.168.1.100` or `192.168.0.100`

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet)

**Mac:**
```bash
ifconfig
```
Look for `inet` under `en0` (WiFi) or `en1` (Ethernet)

### 2. Ensure Same Network

Make sure your Android device and PC are connected to the **same WiFi network**. This is critical!

### 3. Configure Backend

#### Update Backend .env (if it exists)
The backend should already be configured correctly, but verify:

```bash
cd backend
cat .env
```

Make sure it has:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=roadfix
ANTHROPIC_API_KEY=your_key_here
ALLOWED_ORIGINS=
```

Leave `ALLOWED_ORIGINS` empty for development (allows all origins).

#### Start Backend with Network Access

**Important:** You must start the backend with `--host 0.0.0.0` to accept connections from your network:

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 4. Configure Frontend

Edit `frontend/.env` and replace `localhost` with your PC's IP:

```bash
cd frontend
nano .env  # or use any text editor
```

Change:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

To (replace with YOUR PC's IP):
```
REACT_APP_BACKEND_URL=http://192.168.1.100:8000
```

### 5. Rebuild the Android App

After changing `.env`, you **MUST** rebuild the app:

```bash
cd frontend
npm run build:android
```

This will:
1. Build the React app with your new configuration
2. Sync the build to the Android project

### 6. Open and Run in Android Studio

```bash
npm run open:android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Connect your Android device via USB (with USB debugging enabled)
   - OR use an Android emulator
3. Click the "Run" button (green play icon)
4. Select your device
5. Wait for the app to install and launch

### 7. Test Connectivity

Once the app is running on your Android device:

1. **Test Backend Connection:**
   - Open Chrome on your Android device
   - Navigate to: `http://YOUR_PC_IP:8000/api/health`
   - You should see: `{"status":"ok","message":"Backend is running and database is connected",...}`
   - If this fails, there's a network/firewall issue

2. **Test the App:**
   - Open the RoadFix app
   - Go to "Report Damage"
   - The location should be captured automatically
   - Take a photo and submit a report
   - Check the backend terminal - you should see the API requests

## Troubleshooting

### Cannot Connect to Backend

**Problem:** App shows connection errors, or admin/reports pages don't load.

**Solutions:**

1. **Check Firewall:**
   ```bash
   # Linux (Ubuntu/Debian)
   sudo ufw allow 8000/tcp
   
   # Linux (Fedora/RHEL)
   sudo firewall-cmd --add-port=8000/tcp --permanent
   sudo firewall-cmd --reload
   
   # Windows: Go to Windows Defender Firewall > Advanced Settings > Inbound Rules
   # Create new rule for port 8000
   ```

2. **Verify Backend is Running:**
   - Check your backend terminal - should show "Uvicorn running on http://0.0.0.0:8000"
   - Try accessing from PC browser: `http://localhost:8000/api/health`

3. **Verify Network:**
   - Ping your PC from Android using a network tool app
   - Or try accessing `http://YOUR_PC_IP:8000/api/health` from Android Chrome

4. **Check .env Configuration:**
   ```bash
   cd frontend
   cat .env
   ```
   Make sure it has your PC's IP, not localhost

5. **Rebuild After Changes:**
   - Always run `npm run build:android` after changing `.env`
   - The .env file is only read during build time!

### Location Not Working

**Problem:** App shows "Location unavailable" or "Location access denied"

**Solutions:**

1. **Grant Permissions:**
   - Go to Android Settings > Apps > RoadFix > Permissions
   - Enable Location permission
   - Enable Camera permission

2. **Enable Location Services:**
   - Go to Android Settings > Location
   - Turn on location services
   - Set to "High accuracy" mode

### Camera Not Working

**Problem:** Camera doesn't open or shows error

**Solutions:**

1. **Grant Camera Permission:**
   - Android Settings > Apps > RoadFix > Permissions > Camera > Allow

2. **Use Gallery Instead:**
   - If camera fails, use the "Choose from Gallery" option

### Build Errors

**Problem:** `npm run build:android` fails or Android Studio shows errors

**Solutions:**

1. **Clean and Rebuild:**
   ```bash
   cd frontend
   rm -rf build
   npm run build
   npm run build:android
   ```

2. **Clean Android Build:**
   ```bash
   cd frontend/android
   ./gradlew clean
   cd ../..
   npm run build:android
   ```

3. **Reinstall Dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build:android
   ```

## Network Security Configuration

The app is configured to allow HTTP traffic for development. The following files handle this:

- `frontend/android/app/src/main/res/xml/network_security_config.xml` - Allows HTTP
- `frontend/android/app/src/main/AndroidManifest.xml` - References the security config

**For Production:** You should:
1. Use HTTPS with a valid SSL certificate
2. Remove or modify the network security config
3. Update backend URL to use your production domain

## Quick Reference

### Development Workflow

1. Start backend:
   ```bash
   cd backend
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

2. For web development:
   ```bash
   cd frontend
   npm start
   ```

3. For Android development:
   - Update `frontend/.env` with PC IP
   - Run `npm run build:android`
   - Run `npm run open:android`
   - Build and run in Android Studio

### Important URLs

- Backend API: `http://YOUR_PC_IP:8000/api`
- Health Check: `http://YOUR_PC_IP:8000/api/health`
- API Docs: `http://YOUR_PC_IP:8000/docs`
- Web App: `http://localhost:3000` (when running `npm start`)

### Configuration Files

- Backend: `backend/.env`
- Frontend: `frontend/.env`
- Android Manifest: `frontend/android/app/src/main/AndroidManifest.xml`
- Network Security: `frontend/android/app/src/main/res/xml/network_security_config.xml`
- API Config: `frontend/src/config.js`

## Need More Help?

If you're still having issues:

1. Check the browser console (F12) for errors
2. Check the backend terminal for error messages
3. Check Android Logcat in Android Studio for mobile errors
4. Verify all steps above were followed exactly
5. Try restarting the backend server
6. Try rebuilding the Android app from scratch
