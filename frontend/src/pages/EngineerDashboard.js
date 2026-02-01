import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { User, MapPin, Loader2 } from 'lucide-react';
import API_URL, { BACKEND_URL } from '../config';

const EngineerDashboard = () => {
  const navigate = useNavigate();
  const [engineerName, setEngineerName] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async () => {
    if (!engineerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/engineer/assigned/${engineerName}`);
      setTasks(response.data);
      setLoggedIn(true);
      toast.success(`Welcome, ${engineerName}! Found ${response.data.length} assigned task(s)`);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (issueId, status, notes = '') => {
    try {
      await axios.post(`${API_URL}/engineer/update`, {
        issueId,
        status,
        notes
      });
      toast.success(`Status updated to ${status}`);
      handleLogin(); // Refresh tasks
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Critical: 'bg-red-100 text-red-800',
      High: 'bg-orange-100 text-orange-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      Low: 'bg-green-100 text-green-800'
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

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <User className="w-6 h-6" />
                Engineer Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Name</Label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'View Assigned Tasks'}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Engineer Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {engineerName}</p>
          </div>
          <Button variant="outline" onClick={() => setLoggedIn(false)}>
            Logout
          </Button>
        </div>

        <div className="mb-6 bg-white rounded-lg p-4 shadow">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
              <p className="text-sm text-gray-600">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {tasks.filter(t => t.status === 'Assigned').length}
              </p>
              <p className="text-sm text-gray-600">Assigned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {tasks.filter(t => t.status === 'In Progress').length}
              </p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'Completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <Card className="text-center p-8">
            <p className="text-gray-600">No tasks assigned yet</p>
          </Card>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.issueId} className="shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{task.issueType}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Reported by: {task.userName} ({task.userPhone})
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {task.imageUrl && (
                      <img
                        src={`${BACKEND_URL}${task.imageUrl}`}
                        alt="Damage"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}

                    <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                      <p><strong>Description:</strong> {task.description || 'No description'}</p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <strong>Location:</strong> {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
                      </p>
                      <p><strong>Reported:</strong> {new Date(task.timestamp).toLocaleString()}</p>
                      {task.assignedDepartment && (
                        <p><strong>Department:</strong> {task.assignedDepartment}</p>
                      )}
                    </div>

                    {task.aiAnalysis && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                        <p className="font-semibold text-purple-900 mb-1">AI Analysis</p>
                        <p className="text-purple-700">{task.aiAnalysis.recommended_action}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {task.status !== 'In Progress' && task.status !== 'Completed' && (
                        <Button
                          className="flex-1"
                          onClick={() => handleStatusUpdate(task.issueId, 'In Progress', 'Started working on the issue')}
                        >
                          Start Work
                        </Button>
                      )}
                      {task.status === 'In Progress' && (
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusUpdate(task.issueId, 'Completed', 'Work completed successfully')}
                        >
                          Mark as Completed
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        Navigate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default EngineerDashboard;