import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, LogOut, User, Plus, Users, Briefcase, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

export default function PlacementStaffDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    skills_required: [],
    department: '',
    stipend: '',
    duration_months: 3,
    location: '',
    application_deadline: ''
  });

  useEffect(() => {
    fetchInternships();
    fetchApplications();
    fetchAnalytics();
  }, []);

  const fetchInternships = async () => {
    try {
      const { data, error } = await supabase.from('internships').select('*');
      if (error) throw error;
      setInternships(data);
    } catch (error) {
      toast.error('Failed to fetch internships');
    }
  };

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

  const fetchAnalytics = async () => {
    try {
      // Fetch counts and data for client-side aggregation
      const { count: internshipsCount } = await supabase.from('internships').select('*', { count: 'exact', head: true });
      const { count: applicationsCount } = await supabase.from('applications').select('*', { count: 'exact', head: true });
      const { count: studentsCount } = await supabase.from('student_profiles').select('*', { count: 'exact', head: true });

      // Aggregations (using data we already fetched or fetching specifically if needed)
      // Since we already fetch internships and applications in other effects, we can use state, 
      // but fetchAnalytics is called in useEffect parallel to others, so better to fetch or rely on subsequent renders.
      // For simplicity/robustness, let's just use the arrays we are setting or fetch if needed.
      // But here we are inside fetchAnalytics, we can't depend on state being updated yet.

      const { data: appData } = await supabase.from('applications').select('status');
      const statusBreakdown = appData?.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const { data: intData } = await supabase.from('internships').select('department');
      const deptStats = intData?.reduce((acc, curr) => {
        acc[curr.department] = (acc[curr.department] || 0) + 1;
        return acc;
      }, {}) || {};

      setAnalytics({
        total_internships: internshipsCount,
        total_applications: applicationsCount,
        total_students: studentsCount,
        status_breakdown: Object.keys(statusBreakdown).map(k => ({ _id: k, count: statusBreakdown[k] })),
        department_stats: Object.keys(deptStats).map(k => ({ _id: k, count: deptStats[k] }))
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createInternship = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('internships').insert({
        ...formData,
        posted_by: user.id,
        posted_by_role: 'placement_staff'
      });

      if (error) throw error;

      toast.success('Internship posted successfully!');
      setShowCreateDialog(false);
      fetchInternships();
      fetchAnalytics();
      setFormData({
        title: '',
        description: '',
        company: '',
        skills_required: [],
        department: '',
        stipend: '',
        duration_months: 3,
        location: '',
        application_deadline: ''
      });
    } catch (error) {
      toast.error('Failed to create internship');
    }
  };

  const verifyInternship = async (internshipId) => {
    try {
      const { error } = await supabase.from('internships').update({ is_verified: true }).eq('id', internshipId);
      if (error) throw error;

      toast.success('Internship verified!');
      fetchInternships();
    } catch (error) {
      toast.error('Failed to verify internship');
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
      if (error) throw error;

      toast.success('Application status updated!');
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills_required.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills_required: [...formData.skills_required, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required.filter(s => s !== skill)
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="glass border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro - Placement Cell</span>
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
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="placement-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Analytics</TabsTrigger>
            <TabsTrigger value="internships" data-testid="tab-internships">Internships</TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">Applications</TabsTrigger>
          </TabsList>

          {/* Analytics Overview */}
          <TabsContent value="overview" data-testid="overview-content">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Internships"
                value={analytics.total_internships || 0}
                icon={<Briefcase className="h-8 w-8 text-emerald-600" />}
              />
              <StatCard
                title="Total Applications"
                value={analytics.total_applications || 0}
                icon={<Users className="h-8 w-8 text-blue-600" />}
              />
              <StatCard
                title="Active Students"
                value={analytics.total_students || 0}
                icon={<GraduationCap className="h-8 w-8 text-purple-600" />}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.status_breakdown?.map((item) => (
                      <div key={item._id} className="flex justify-between items-center">
                        <span className="capitalize">{item._id}</span>
                        <Badge>{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department-wise Internships</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.department_stats?.map((item) => (
                      <div key={item._id} className="flex justify-between items-center">
                        <span>{item._id}</span>
                        <Badge>{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Internships Management */}
          <TabsContent value="internships" data-testid="internships-content">
            <div className="mb-6">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="create-internship-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Post New Internship
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Post New Internship</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        placeholder="Software Development Intern"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        data-testid="internship-title-input"
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        placeholder="Tech Corp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        data-testid="internship-company-input"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the internship..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        data-testid="internship-description-input"
                      />
                    </div>
                    <div>
                      <Label>Required Skills</Label>
                      <div className="flex space-x-2 mb-2">
                        <Input
                          placeholder="Add a skill"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          data-testid="internship-skill-input"
                        />
                        <Button onClick={addSkill} data-testid="add-skill-btn">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills_required.map((skill) => (
                          <Badge key={skill} className="skill-badge">
                            {skill}
                            <X className="h-3 w-3 ml-2 cursor-pointer" onClick={() => removeSkill(skill)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Department</Label>
                        <Input
                          placeholder="Computer Science"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          data-testid="internship-department-input"
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input
                          placeholder="Bangalore"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          data-testid="internship-location-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Stipend (per month)</Label>
                        <Input
                          type="number"
                          placeholder="15000"
                          value={formData.stipend}
                          onChange={(e) => setFormData({ ...formData, stipend: parseFloat(e.target.value) })}
                          data-testid="internship-stipend-input"
                        />
                      </div>
                      <div>
                        <Label>Duration (months)</Label>
                        <Input
                          type="number"
                          placeholder="3"
                          value={formData.duration_months}
                          onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                          data-testid="internship-duration-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Application Deadline</Label>
                      <Input
                        type="date"
                        value={formData.application_deadline}
                        onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                        data-testid="internship-deadline-input"
                      />
                    </div>
                    <Button onClick={createInternship} className="w-full" data-testid="submit-internship-btn">
                      Post Internship
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {internships.map((internship) => (
                <Card key={internship.id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                        {internship.title}
                      </h3>
                      {internship.is_verified ? (
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => verifyInternship(internship.id)}
                          data-testid="verify-internship-btn"
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{internship.company}</p>
                    <p className="text-sm text-gray-500 mb-3">{internship.description.slice(0, 100)}...</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{internship.applicant_count} applicants</Badge>
                      <span className="text-sm text-gray-500">{internship.department}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Applications Management */}
          <TabsContent value="applications" data-testid="applications-content">
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                          {application.student_details?.name}
                        </h3>
                        <p className="text-gray-600">{application.student_details?.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Applied for: {application.internship_details?.title}
                        </p>
                      </div>
                      <Badge className={`status-${application.status}`}>{application.status}</Badge>
                    </div>

                    <div className="flex space-x-2">
                      <Select
                        value={application.status}
                        onValueChange={(value) => updateApplicationStatus(application.id, value)}
                      >
                        <SelectTrigger className="w-40" data-testid="status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {applications.length === 0 && (
                <div className="text-center py-12" data-testid="no-applications-message">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No applications yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
