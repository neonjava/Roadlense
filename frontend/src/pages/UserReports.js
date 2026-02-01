import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { Phone, Search, MapPin, Calendar, Loader2 } from 'lucide-react';
import API_URL, { BACKEND_URL } from '../config';

const UserReports = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (phoneNumber.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/complaints/user/${phoneNumber}`);
      setReports(response.data);
      setSearched(true);

      if (response.data.length === 0) {
        toast.info('No reports found for this phone number');
      } else {
        toast.success(`Found ${response.data.length} report(s)`);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Back
          </Button>
          <h1 className="text-xl font-bold text-gray-900">My Reports</h1>
          <div className="w-16"></div>
        </div>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Enter Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searched && reports.length === 0 && (
          <Card className="text-center p-8">
            <p className="text-gray-600">No reports found</p>
            <Button className="mt-4" onClick={() => navigate('/report')}>
              Submit First Report
            </Button>
          </Card>
        )}

        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.issueId} className="shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{report.issueType}</CardTitle>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {report.imageUrl && (
                    <img
                      src={`${BACKEND_URL}${report.imageUrl}`}
                      alt="Damage"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  {report.description && (
                    <p className="text-sm text-gray-700">{report.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                    </span>
                  </div>

                  {report.aiAnalysis && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                      <p className="font-semibold text-purple-900 mb-1">AI Analysis</p>
                      <p className="text-purple-700">
                        {report.aiAnalysis.recommended_action}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Confidence: {report.aiAnalysis.confidence}%
                      </p>
                    </div>
                  )}

                  {report.statusHistory && report.statusHistory.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="font-semibold text-sm mb-2">Status Timeline</p>
                      <div className="space-y-2">
                        {report.statusHistory.map((history, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex justify-between">
                            <span className="font-medium">{history.status}</span>
                            <span>{new Date(history.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.assignedEngineer && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                      <p><strong>Assigned to:</strong> {report.assignedEngineer}</p>
                      {report.assignedDepartment && (
                        <p><strong>Department:</strong> {report.assignedDepartment}</p>
                      )}
                    </div>
                  )}

                  {report.resolutionImageUrl && (
                    <div>
                      <p className="font-semibold text-sm mb-2">Resolution Photo</p>
                      <img
                        src={`${BACKEND_URL}${report.resolutionImageUrl}`}
                        alt="Resolution"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default UserReports;