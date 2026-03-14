import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GraduationCap, LogOut, User, Plus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

export default function EmployerDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState('post');
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
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

  const fetchInternships = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('internships').select('*');
      if (error) throw error;
      // Filter for my internships (posted_by is user.id)
      const myInternships = data.filter(i => i.posted_by === user.id);
      setInternships(myInternships);
    } catch (error) {
      toast.error('Failed to fetch internships');
    }
  }, [user.id]);

  const fetchApplications = useCallback(async () => {
    try {
      // Need applications for MY internships.
      // So fetch applications where internship_id is in my internships list.
      // Or fetch all and filter client side.
      // Better: join with internships and filter by posted_by.

      const { data, error } = await supabase.from('applications')
        .select('*, student_details:profiles!student_id(*), internship_details:internships!internship_id(*)')
      //.eq('internship_details.posted_by', user.id); // Nested filtering in Supabase is tricky with exact syntax.
      // It's often easier to fetch and filter if dataset is small, or use !inner join to filter.

      if (error) throw error;

      // Filter client side for now to be safe with syntax
      const myApplications = data.filter(app => app.internship_details?.posted_by === user.id);
      setApplications(myApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }, [user.id]);

  useEffect(() => {
    fetchInternships();
    fetchApplications();
  }, [fetchInternships, fetchApplications]);

  const createInternship = async () => {
    try {
      const dataToSubmit = {
        ...formData,
        company: user.organization || formData.company,
        posted_by: user.id,
        posted_by_role: 'employer'
      };

      const { error } = await supabase.from('internships').insert(dataToSubmit);
      if (error) throw error;

      toast.success('Internship request submitted! Awaiting approval from placement cell.');
      setShowCreateDialog(false);
      fetchInternships();
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="glass border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-orange-600" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro - Employer</span>
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
          <TabsList className="grid w-full grid-cols-2 mb-8" data-testid="employer-tabs">
            <TabsTrigger value="post" data-testid="tab-post">My Internships</TabsTrigger>
            <TabsTrigger value="candidates" data-testid="tab-candidates">Candidates</TabsTrigger>
          </TabsList>

          {/* Post Internships */}
          <TabsContent value="post" data-testid="post-content">
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
                    <DialogTitle>Post Internship Opportunity</DialogTitle>
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
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the internship role..."
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
                      Submit for Approval
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
                        <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
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

            {internships.length === 0 && (
              <div className="text-center py-12" data-testid="no-internships-message">
                <Plus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No internships posted yet</p>
              </div>
            )}
          </TabsContent>

          {/* View Candidates */}
          <TabsContent value="candidates" data-testid="candidates-content">
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                          {application.student_details?.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{application.student_details?.email}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Applied for: {application.internship_details?.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Applied on: {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`status-${application.status}`}>{application.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {applications.length === 0 && (
                <div className="text-center py-12" data-testid="no-candidates-message">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No candidates yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
