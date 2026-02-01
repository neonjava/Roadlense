/**
 * Centralized API Configuration
 * 
 * This file manages the backend API URL for both web and mobile (Capacitor) environments.
 * It automatically detects the platform and provides the appropriate configuration.
 */

// Check if running in Capacitor (mobile app)
const isCapacitor = window.Capacitor !== undefined;

/**
 * Get the backend API URL
 * Priority:
 * 1. Environment variable (REACT_APP_BACKEND_URL)
 * 2. Fallback to localhost for web
 * 3. For mobile, you MUST set REACT_APP_BACKEND_URL to your PC's IP
 */
const getBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL;
  
  if (envUrl) {
    console.log(`[API Config] Using backend URL: ${envUrl}`);
    return envUrl;
  }
  
  // Fallback for web development
  if (!isCapacitor) {
    console.warn('[API Config] REACT_APP_BACKEND_URL not set, using localhost fallback');
    return 'http://localhost:8000';
  }
  
  // For mobile, we cannot use localhost
  console.error(
    '[API Config] ERROR: REACT_APP_BACKEND_URL is not configured!\n' +
    'For Android/iOS, you must set this to your PC\'s local IP address.\n' +
    'Example: REACT_APP_BACKEND_URL=http://192.168.1.100:8000\n' +
    'Find your PC IP:\n' +
    '  - Linux: ip addr show or hostname -I\n' +
    '  - Windows: ipconfig\n' +
    '  - Mac: ifconfig\n' +
    'Then update frontend/.env and rebuild: npm run build:android'
  );
  
  // Return a placeholder that will fail, forcing user to configure
  return 'http://CONFIGURE_YOUR_PC_IP:8000';
};

const BACKEND_URL = getBackendUrl();
const API_URL = `${BACKEND_URL}/api`;

/**
 * Test backend connectivity
 * @returns {Promise<boolean>} True if backend is reachable
 */
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[API Config] Backend connection successful:', data);
      return true;
    }
    
    console.error('[API Config] Backend returned error:', response.status);
    return false;
  } catch (error) {
    console.error('[API Config] Failed to connect to backend:', error.message);
    console.error('[API Config] Make sure:');
    console.error('  1. Backend is running on your PC');
    console.error('  2. Your device is on the same WiFi network');
    console.error('  3. REACT_APP_BACKEND_URL is set to your PC\'s IP');
    console.error('  4. Firewall allows connections on port 8000');
    return false;
  }
};

/**
 * Get configuration info for debugging
 */
export const getConfigInfo = () => ({
  platform: isCapacitor ? 'mobile' : 'web',
  backendUrl: BACKEND_URL,
  apiUrl: API_URL,
  envConfigured: !!process.env.REACT_APP_BACKEND_URL,
});

// Log configuration on load
console.log('[API Config] Configuration:', getConfigInfo());

export { BACKEND_URL, API_URL, isCapacitor };
export default API_URL;
