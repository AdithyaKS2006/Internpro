import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GraduationCap, LogOut, User, CheckCircle2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

export default function FacultyDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState('approvals');
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase.from('applications')
        .select('*, student_details:profiles!student_id(*), internship_details:internships!internship_id(*)');
      if (error) throw error;
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const approveApplication = async (applicationId) => {
    try {
      const { error } = await supabase.from('applications').update({
        faculty_approved: true,
        faculty_feedback: feedback[applicationId] || ''
      }).eq('id', applicationId);

      if (error) throw error;

      toast.success('Application approved!');
      fetchApplications();
      setFeedback({ ...feedback, [applicationId]: '' });
    } catch (error) {
      toast.error('Failed to approve application');
    }
  };

  const generateCertificate = async (applicationId) => {
    try {
      const app = applications.find(a => a.id === applicationId);
      if (!app) return;

      const certificateData = {
        student_name: app.student_details?.name,
        internship_title: app.internship_details?.title,
        company: app.internship_details?.company,
        completion_date: new Date().toISOString(),
        id: crypto.randomUUID()
      };

      const { error } = await supabase.from('certificates').insert({
        student_id: app.student_id,
        internship_id: app.internship_id,
        certificate_data: certificateData
      });

      if (error) throw error;
      toast.success('Certificate generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate certificate');
    }
  };

  const pendingApplications = applications.filter(app => !app.faculty_approved);
  const approvedApplications = applications.filter(app => app.faculty_approved && app.status === 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="glass border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-purple-600" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro - Faculty</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} data-testid="logout-btn">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8" data-testid="faculty-tabs">
            <TabsTrigger value="approvals" data-testid="tab-approvals">Pending Approvals</TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">Certificate Generation</TabsTrigger>
          </TabsList>

          {/* Pending Approvals */}
          <TabsContent value="approvals" data-testid="approvals-content">
            <div className="space-y-4">
              {pendingApplications.map((application) => (
                <Card key={application.id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                          {application.student_details?.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{application.student_details?.email}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Internship: <span className="font-medium">{application.internship_details?.title}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Company: {application.internship_details?.company}
                        </p>
                      </div>
                      <Badge className={`status-${application.status}`}>{application.status}</Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <Label htmlFor={`feedback-${application.id}`}>Feedback (Optional)</Label>
                        <Textarea
                          id={`feedback-${application.id}`}
                          placeholder="Provide feedback to the student..."
                          value={feedback[application.id] || ''}
                          onChange={(e) => setFeedback({ ...feedback, [application.id]: e.target.value })}
                          rows={3}
                          data-testid="feedback-textarea"
                        />
                      </div>
                      <Button
                        onClick={() => approveApplication(application.id)}
                        className="w-full"
                        data-testid="approve-application-btn"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve Application
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingApplications.length === 0 && (
                <div className="text-center py-12" data-testid="no-pending-message">
                  <CheckCircle2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Certificate Generation */}
          <TabsContent value="certificates" data-testid="certificates-content">
            <div className="space-y-4">
              {approvedApplications.map((application) => (
                <Card key={application.id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                          {application.student_details?.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                          Completed: {application.internship_details?.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Company: {application.internship_details?.company}
                        </p>
                        {application.faculty_feedback && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-700">Your Feedback: {application.faculty_feedback}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => generateCertificate(application.id)}
                        data-testid="generate-certificate-btn"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Generate Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {approvedApplications.length === 0 && (
                <div className="text-center py-12" data-testid="no-approved-message">
                  <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No approved internships for certificate generation</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
