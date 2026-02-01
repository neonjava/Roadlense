import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, History, AlertCircle, CheckCircle, User as UserIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

const MobileLanding = () => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState({
    location: 'pending',
    camera: 'pending'
  });
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    // Don't auto-request permissions on page load
    // Just set initial state - browser requires user gesture to request permissions
    setPermissions({
      location: 'pending',
      camera: 'pending'
    });
  }, []);

  const requestPermissions = async () => {
    // Request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissions(prev => ({ ...prev, location: 'granted' }));
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location permission denied:', error);
          setPermissions(prev => ({ ...prev, location: 'denied' }));
        }
      );
    } else {
      setPermissions(prev => ({ ...prev, location: 'denied' }));
    }

    // Request camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, camera: 'granted' }));
    } catch (error) {
      console.error('Camera permission denied:', error);
      setPermissions(prev => ({ ...prev, camera: 'denied' }));
    }
  };

  const allPermissionsGranted = permissions.location === 'granted' && permissions.camera === 'granted';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-6 pb-4">
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RoadFix</h1>
          <p className="text-gray-600">Report & Track Road Damage</p>
        </div>

        {!allPermissionsGranted && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-medium">Permissions Required</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location: {permissions.location === 'granted' ? '✓ Granted' : '✗ Required'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Camera: {permissions.camera === 'granted' ? '✓ Granted' : '✗ Required'}
                  </li>
                </ul>
                <Button
                  onClick={requestPermissions}
                  className="w-full mt-3"
                  size="sm"
                >
                  Grant Permissions
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Card className="shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Report Damage</CardTitle>
                  <CardDescription>Take photo & submit issue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full py-6 text-lg"
                disabled={!allPermissionsGranted}
                onClick={() => navigate('/report')}
              >
                {allPermissionsGranted ? 'Report New Issue' : 'Waiting for Permissions'}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <History className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">My Reports</CardTitle>
                  <CardDescription>Track your submissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full py-6 text-lg"
                onClick={() => navigate('/my-reports')}
              >
                View Past Reports
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="py-6"
              onClick={() => navigate('/admin')}
            >
              <UserIcon className="w-5 h-5 mr-2" />
              Admin
            </Button>
            <Button
              variant="outline"
              className="py-6"
              onClick={() => navigate('/engineer')}
            >
              <UserIcon className="w-5 h-5 mr-2" />
              Engineer
            </Button>
          </div>

          {currentLocation && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Current Location</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>📱 Mobile-First Experience</p>
          <p className="mt-1">🤖 AI-Powered Priority Detection</p>
          <p className="mt-1">📊 Real-Time Status Tracking</p>
        </div>
      </div>
    </div>
  );
};

export default MobileLanding;