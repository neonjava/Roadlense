import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import API_URL, { BACKEND_URL } from '../config';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const priorityColors = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e'
};

const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get(`${API_URL}/complaints`);
      setComplaints(response.data);

      if (response.data.length > 0) {
        const avgLat = response.data.reduce((sum, c) => sum + c.latitude, 0) / response.data.length;
        const avgLng = response.data.reduce((sum, c) => sum + c.longitude, 0) / response.data.length;
        setMapCenter([avgLat, avgLng]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('Failed to load complaints');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusUpdate = async (issueId, status) => {
    try {
      await axios.patch(`${API_URL}/complaints/${issueId}`, { status });
      toast.success(`Status updated to ${status}`);
      fetchComplaints();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignment = async (issueId) => {
    const dept = document.getElementById('department-select')?.value;
    const engineer = document.getElementById('engineer-input')?.value;

    if (!dept || !engineer) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await axios.patch(`${API_URL}/complaints/${issueId}`, {
        assignedDepartment: dept,
        assignedEngineer: engineer,
        status: 'Assigned'
      });
      toast.success('Issue assigned successfully');
      setSelectedComplaint(null);
      fetchComplaints();
      fetchStats();
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error('Failed to assign issue');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Critical: 'bg-red-100 text-red-800 border-red-300',
      High: 'bg-orange-100 text-orange-800 border-orange-300',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'bg-slate-100 text-slate-800',
      Assigned: 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-amber-100 text-amber-800',
      Completed: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">Road Damage Management System</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Home
          </Button>
        </div>
      </header>

      {stats && (
        <div className="bg-white border-b px-6 py-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-semibold">Total:</span> {stats.total}
            </div>
            <div>
              <span className="font-semibold">Pending:</span> {stats.by_status.pending}
            </div>
            <div>
              <span className="font-semibold">Assigned:</span> {stats.by_status.assigned}
            </div>
            <div>
              <span className="font-semibold">In Progress:</span> {stats.by_status.in_progress}
            </div>
            <div>
              <span className="font-semibold">Completed:</span> {stats.by_status.completed}
            </div>
            <div className="text-red-600">
              <span className="font-semibold">High Priority:</span> {stats.high_priority}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {!loading && (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {complaints.map((complaint) => (
                <Marker
                  key={complaint.issueId}
                  position={[complaint.latitude, complaint.longitude]}
                  icon={createCustomIcon(priorityColors[complaint.priority])}
                  eventHandlers={{
                    click: () => setSelectedComplaint(complaint)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">{complaint.issueType}</h3>
                      <p className="text-sm mb-2">{complaint.description || 'No description'}</p>
                      {complaint.imageUrl && (
                        <img
                          src={`${BACKEND_URL}${complaint.imageUrl}`}
                          alt="Damage"
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <div className="space-y-1 text-xs">
                        <p><strong>Reporter:</strong> {complaint.userName} ({complaint.userPhone})</p>
                        <p><strong>Priority:</strong> {complaint.priority}</p>
                        <p><strong>Status:</strong> {complaint.status}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="w-96 bg-white border-l border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Complaints</h2>
            <p className="text-sm text-slate-600">Total: {complaints.length}</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {complaints.map((complaint) => (
                <Card
                  key={complaint.issueId}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${selectedComplaint?.issueId === complaint.issueId ? 'ring-2 ring-blue-500' : ''
                    }`}
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{complaint.issueType}</h3>
                      <p className="text-xs text-slate-500">{complaint.userName}</p>
                    </div>
                    <Badge className={getPriorityColor(complaint.priority)}>
                      {complaint.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {new Date(complaint.timestamp).toLocaleString()}
                  </p>
                  <Badge className={getStatusColor(complaint.status)}>
                    {complaint.status}
                  </Badge>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-slate-900">{selectedComplaint.issueType}</h2>
                <Button variant="ghost" onClick={() => setSelectedComplaint(null)}>
                  ✕
                </Button>
              </div>

              {selectedComplaint.imageUrl && (
                <img
                  src={`${BACKEND_URL}${selectedComplaint.imageUrl}`}
                  alt="Damage"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}

              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(selectedComplaint.priority)}>
                    Priority: {selectedComplaint.priority}
                  </Badge>
                  <Badge className={getStatusColor(selectedComplaint.status)}>
                    {selectedComplaint.status}
                  </Badge>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Reporter:</strong> {selectedComplaint.userName}</p>
                  <p className="text-sm"><strong>Phone:</strong> {selectedComplaint.userPhone}</p>
                  <p className="text-sm"><strong>Description:</strong> {selectedComplaint.description || 'No description'}</p>
                  <p className="text-sm"><strong>Location:</strong> {selectedComplaint.latitude.toFixed(6)}, {selectedComplaint.longitude.toFixed(6)}</p>
                  <p className="text-sm"><strong>Reported:</strong> {new Date(selectedComplaint.timestamp).toLocaleString()}</p>
                  {selectedComplaint.assignedDepartment && (
                    <p className="text-sm"><strong>Department:</strong> {selectedComplaint.assignedDepartment}</p>
                  )}
                  {selectedComplaint.assignedEngineer && (
                    <p className="text-sm"><strong>Engineer:</strong> {selectedComplaint.assignedEngineer}</p>
                  )}
                </div>

                {selectedComplaint.aiAnalysis && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="font-semibold text-purple-900 mb-2">AI Analysis</p>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p><strong>Damage Type:</strong> {selectedComplaint.aiAnalysis.damage_type}</p>
                      <p><strong>Estimated Area:</strong> {selectedComplaint.aiAnalysis.estimated_area}</p>
                      <p><strong>Safety Risk:</strong> {selectedComplaint.aiAnalysis.safety_risk}</p>
                      <p><strong>Recommendation:</strong> {selectedComplaint.aiAnalysis.recommended_action}</p>
                      <p><strong>Confidence:</strong> {selectedComplaint.aiAnalysis.confidence}%</p>
                    </div>
                  </div>
                )}
              </div>

              <Tabs defaultValue="status" className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="status">Update Status</TabsTrigger>
                  <TabsTrigger value="assign">Assign</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedComplaint.issueId, 'Pending')}
                    >
                      Pending
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedComplaint.issueId, 'Assigned')}
                    >
                      Assigned
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedComplaint.issueId, 'In Progress')}
                    >
                      In Progress
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedComplaint.issueId, 'Completed')}
                    >
                      Completed
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="assign" className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Department</Label>
                    <select
                      className="w-full p-2 border rounded"
                      id="department-select"
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Water">Water</option>
                      <option value="Drainage">Drainage</option>
                      <option value="Electricity">Electricity</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Engineer/Contractor</Label>
                    <Input
                      type="text"
                      placeholder="Enter name"
                      id="engineer-input"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleAssignment(selectedComplaint.issueId)}
                  >
                    Assign Issue
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;