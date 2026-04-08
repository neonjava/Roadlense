# RoadFix - AI-Powered Road Damage Reporting System

An intelligent road damage reporting system that uses AI to analyze and prioritize infrastructure issues. Built with FastAPI, React, and Claude AI.

## 🚀 Features

- **AI-Powered Analysis**: Automatic damage severity assessment using Claude AI
- **Mobile-First**: Capacitor-based mobile app for Android
- **Real-time Reporting**: GPS-based location tracking
- **Multi-Role Support**: Citizen, Engineer, and Admin dashboards
- **Priority Management**: Contextual priority calculation based on damage severity and location density

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB
- Anthropic API Key (for AI analysis)

## 🛠️ Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from template:
```bash
cp .env.example .env
```

5. Configure environment variables in `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=roadfix
ANTHROPIC_API_KEY=your_api_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8100
```

6. Start the server:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

5. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

### Android Build

1. Build the React app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npm run build:android
```

3. Open in Android Studio:
```bash
npm run open:android
```

4. Build and run on device/emulator from Android Studio

## 📱 Android Permissions

The app requires the following permissions (already configured):
- Camera access
- Location access (GPS)
- Internet access
- External storage (for photo uploads)

## 🔧 Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for AI analysis | Yes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | No (defaults to localhost) |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_BACKEND_URL` | Backend API URL | Yes |

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /api/complaints/upload` - Upload damage photo
- `POST /api/complaints` - Create new complaint with AI analysis
- `GET /api/complaints` - Get all complaints (with filters)
- `GET /api/complaints/user/{phone}` - Get user's complaints
- `PATCH /api/complaints/{issue_id}` - Update complaint status
- `GET /api/stats/dashboard` - Get dashboard statistics

## 🏗️ Project Structure

```
gmu-hackk/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example       # Environment template
│   └── uploads/           # Uploaded images
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app component
│   ├── android/           # Android build files
│   ├── package.json       # Node dependencies
│   └── .env.example      # Environment template
└── README.md
```

## 🎯 Usage

### For Citizens
1. Open the app
2. Allow location and camera permissions
3. Take a photo of road damage
4. Fill in your details
5. Submit report
6. AI will analyze and prioritize automatically

### For Engineers
1. Navigate to `/engineer`
2. View assigned tasks
3. Update status with notes
4. Upload resolution photos

### For Admins
1. Navigate to `/admin`
2. View all complaints on map
3. Assign to departments/engineers
4. Monitor statistics

## 🔐 Security Notes

- CORS is configured via environment variables
- File uploads are validated (type, size)
- All endpoints have error handling
- Environment variables are validated on startup

## 🐛 Troubleshooting

### Android: API Connectivity Issues

**Problem:** Frontend works on PC but APIs don't work on Android (can't submit reports, admin/engineer dashboards don't load data)

**Root Cause:** The app is configured to use `http://localhost:8000`, which on Android refers to the device itself, not your PC.

**Solution:**

1. **Find your PC's local IP address:**
   - Linux: `ip addr show` or `hostname -I`
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac: `ifconfig` (look for inet under en0)
   - Example: `192.168.1.100`

2. **Update frontend configuration:**
   ```bash
   cd frontend
   # Edit .env file
   nano .env
   ```
   Change `REACT_APP_BACKEND_URL=http://localhost:8000` to:
   ```
   REACT_APP_BACKEND_URL=http://192.168.1.100:8000
   ```
   (Replace with YOUR PC's IP)

3. **Start backend with network access:**
   ```bash
   cd backend
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```
   Note the `--host 0.0.0.0` flag is required!

4. **Rebuild the Android app:**
   ```bash
   cd frontend
   npm run build:android
   npm run open:android
   ```

5. **Test connectivity:**
   - Open Chrome on your Android device
   - Visit: `http://YOUR_PC_IP:8000/api/health`
   - Should show: `{"status":"ok",...}`
   - If this fails, check firewall settings

**Important Notes:**
- Your Android device and PC must be on the **same WiFi network**
- You must rebuild the app after changing `.env` (environment variables are read at build time)
- Allow port 8000 in your firewall if needed

**For detailed Android setup instructions, see [ANDROID_SETUP.md](./ANDROID_SETUP.md)**

---

### Android: "Package Invalid" Error
- Ensure package name matches in:
  - `frontend/android/app/build.gradle` (applicationId)
  - `frontend/capacitor.config.json` (appId)
- Clean and rebuild: `cd android && ./gradlew clean`

### Android: Location Not Working
- Check AndroidManifest.xml has location permissions
- Enable location services on device
- Grant app permissions in device settings

### Backend: MongoDB Connection Failed
- Ensure MongoDB is running
- Check MONGO_URL in .env
- Verify network connectivity

### Frontend: API Calls Failing
- Check REACT_APP_BACKEND_URL is set correctly
- Verify backend is running
- Check CORS configuration in backend
- For Android, see "Android: API Connectivity Issues" above

### Firewall Configuration

If Android can't connect to backend:

**Linux (Ubuntu/Debian):**
```bash
sudo ufw allow 8000/tcp
```

**Linux (Fedora/RHEL):**
```bash
sudo firewall-cmd --add-port=8000/tcp --permanent
sudo firewall-cmd --reload
```

**Windows:**
- Windows Defender Firewall > Advanced Settings > Inbound Rules
- New Rule > Port > TCP > 8000 > Allow

## 📄 License

This project was created for GMU Hackathon.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions, please create an issue in the repository.

