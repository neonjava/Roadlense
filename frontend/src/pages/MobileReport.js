import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Camera as CameraIcon, MapPin, User, Phone, Loader2, AlertCircle, X, Upload } from 'lucide-react';
import API_URL from '../config';

// Import Capacitor plugins
const isCapacitor = window.Capacitor !== undefined;
let Camera, Geolocation;

const MobileReport = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    latitude: null,
    longitude: null,
    issueType: 'Pothole',
    description: '',
    userName: '',
    userPhone: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capacitorReady, setCapacitorReady] = useState(!isCapacitor);

  useEffect(() => {
    // Load Capacitor plugins if available
    if (isCapacitor) {
      Promise.all([
        import('@capacitor/camera'),
        import('@capacitor/geolocation')
      ]).then(([cameraModule, geoModule]) => {
        Camera = cameraModule.Camera;
        Geolocation = geoModule.Geolocation;
        setCapacitorReady(true);
      }).catch(error => {
        console.error('Failed to load Capacitor plugins:', error);
        setCapacitorReady(true); // Continue anyway, will use web APIs
      });
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('roadfix_user');
    if (savedUser) {
      try {
        const { name, phone } = JSON.parse(savedUser);
        setFormData(prev => ({ ...prev, userName: name, userPhone: phone }));
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }

    // Wait for Capacitor to be ready before getting location
    if (capacitorReady) {
      getCurrentLocation();
    }
  }, [capacitorReady]);

  const getCurrentLocation = async () => {
    try {
      if (isCapacitor && Geolocation) {
        // Use native Geolocation
        const position = await Geolocation.getCurrentPosition();
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setLocationStatus('Location captured ✓');
      } else if (navigator.geolocation) {
        // Use web Geolocation
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFormData(prev => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }));
            setLocationStatus('Location captured ✓');
          },
          (error) => {
            setLocationStatus('Location access denied');
            toast.error('Please enable location access');
          }
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('Location unavailable');
    }
  };

  const takePicture = async () => {
    try {
      if (isCapacitor && Camera) {
        // Use native camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'dataUrl',
          source: 'camera'
        });

        setImagePreview(image.dataUrl);

        // Convert dataUrl to Blob
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `road-damage-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedImage(file);

        toast.success('Photo captured!');
      } else {
        toast.error('Native camera not available. Please use file upload.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast.error('Failed to capture photo');
      }
    }
  };

  const selectFromGallery = async () => {
    try {
      if (isCapacitor && Camera) {
        // Use native photo picker
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'dataUrl',
          source: 'photos'
        });

        setImagePreview(image.dataUrl);

        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `road-damage-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedImage(file);

        toast.success('Image selected!');
      } else {
        // Fallback to file input
        document.getElementById('file-input')?.click();
      }
    } catch (error) {
      console.error('Gallery error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast.error('Failed to select image');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please use an image under 10MB.');
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      toast.success('Image selected!');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      toast.error('Location not available. Please enable GPS.');
      return;
    }

    if (!selectedImage) {
      toast.error('Please upload a photo of the damage');
      return;
    }

    if (!formData.userName || !formData.userPhone) {
      toast.error('Please provide your name and phone number');
      return;
    }

    if (formData.userPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);

    try {
      localStorage.setItem('roadfix_user', JSON.stringify({
        name: formData.userName,
        phone: formData.userPhone
      }));

      const formDataImage = new FormData();
      formDataImage.append('file', selectedImage);

      const uploadResponse = await axios.post(`${API_URL}/complaints/upload`, formDataImage, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = uploadResponse.data.imageUrl;

      toast.info('🤖 AI analyzing damage...');

      const complaintData = {
        latitude: formData.latitude,
        longitude: formData.longitude,
        issueType: formData.issueType,
        description: formData.description,
        userName: formData.userName,
        userPhone: formData.userPhone
      };

      const response = await axios.post(
        `${API_URL}/complaints?imageUrl=${encodeURIComponent(imageUrl)}`,
        complaintData
      );

      setIsAnalyzing(false);

      if (response.data.aiAnalysis) {
        const analysis = response.data.aiAnalysis;
        toast.success(
          `Report submitted! AI Priority: ${analysis.priority} | Severity: ${analysis.severity}`,
          { duration: 5000 }
        );
      } else {
        toast.success('Report submitted successfully!');
      }

      setTimeout(() => {
        navigate('/my-reports');
      }, 2000);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Failed to submit report. Please try again.');
      setIsAnalyzing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-700"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Report Damage</h1>
          <div className="w-16"></div>
        </div>

        <Card className="shadow-xl border-2 border-blue-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className={`p-4 rounded-lg border-2 ${formData.latitude
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
              }`}>
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${formData.latitude ? 'text-green-600' : 'text-amber-600'
                  }`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{locationStatus}</p>
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Information
              </h3>

              <div>
                <Label className="text-sm font-medium">Name *</Label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Phone Number *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <Input
                    type="tel"
                    placeholder="10-digit phone number"
                    value={formData.userPhone}
                    onChange={(e) => setFormData({ ...formData, userPhone: e.target.value.replace(/\D/g, '') })}
                    maxLength={10}
                    className="flex-1"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold text-gray-900">
                Issue Type *
              </Label>
              <select
                className="w-full p-3 mt-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
              >
                <option value="Pothole">Pothole</option>
                <option value="Crack">Crack</option>
                <option value="Waterlogging">Waterlogging</option>
                <option value="Road collapse">Road collapse</option>
              </select>
            </div>

            <div>
              <Label className="text-base font-semibold text-gray-900">
                Description (Optional)
              </Label>
              <textarea
                className="w-full p-3 mt-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Provide additional details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <CameraIcon className="w-5 h-5" />
                Photo Evidence *
              </Label>

              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={takePicture}
                    className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Take Photo
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={selectFromGallery}
                    className="w-full py-6 border-2 border-dashed hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Choose from Gallery
                  </Button>
                </div>
              )}
            </div>

            {isAnalyzing && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <div>
                    <p className="font-medium text-purple-900">AI Analysis in Progress</p>
                    <p className="text-sm text-purple-700">Determining damage severity and priority...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Your report will be analyzed by AI and assigned appropriate priority
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting || !formData.latitude || !selectedImage || !formData.userName || !formData.userPhone}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isAnalyzing ? 'Analyzing...' : 'Submitting...'}
                </>
              ) : (
                '📤 Submit Report'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default MobileReport;
