import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, LogOut, User, Briefcase, FileText, Award, Bell, Search, X, ChevronRight, Star, Trophy, Target, BookOpen, Users, Globe, MessageCircle, BarChart3, Plus, Download, Github, Play, Video, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import InternshipCard from './InternshipCard';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

export default function StudentDashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState({});
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: "Hi there! I'm your career assistant. How can I help you today?", sender: 'bot' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Mock data for achievements
  const achievements = [
    { id: 1, name: 'Aptitude Ace', icon: Trophy, color: 'text-yellow-500' },
    { id: 2, name: 'Project Pro', icon: Star, color: 'text-blue-500' },
    { id: 3, name: 'Coding Champion', icon: Target, color: 'text-green-500' },
    { id: 4, name: 'Communication Expert', icon: MessageCircle, color: 'text-purple-500' },
    { id: 5, name: 'Team Player', icon: Users, color: 'text-pink-500' },
    { id: 6, name: 'Quick Learner', icon: BookOpen, color: 'text-orange-500' }
  ];

  // Mock data for skill analytics
  const [progress, setProgress] = useState({
    scores: { technical: 0, logical: 0, verbal: 0, soft_skills: 0, projects: 0 },
    radar_data: [
      { subject: 'Technical Skills', A: 0, fullMark: 100 },
      { subject: 'Logical Reasoning', A: 0, fullMark: 100 },
      { subject: 'Verbal Ability', A: 0, fullMark: 100 },
      { subject: 'Communication', A: 0, fullMark: 100 },
      { subject: 'Projects', A: 0, fullMark: 100 }
    ],
    total_points: 0,
    quizzes_completed: 0,
    courses_completed: 0,
    total_courses: 8,
    challenges_solved: 0,
    total_challenges: 1,
    aptitude_score: 0
  });

  // Mock data for opportunities
  const opportunities = [
    { id: 1, title: 'Software Engineering Intern', company: 'TechCorp', department: 'Engineering', stipend: '₹25,000', skills: ['React', 'Node.js'] },
    { id: 2, title: 'Data Analyst Intern', company: 'DataSystems', department: 'Analytics', stipend: '₹20,000', skills: ['Python', 'SQL'] },
    { id: 3, title: 'Marketing Intern', company: 'BrandBoost', department: 'Marketing', stipend: '₹15,000', skills: ['SEO', 'Content Writing'] }
  ];

  // Mock data for learning resources
  const learningResources = [
    { id: 1, title: 'Advanced JavaScript Course', platform: 'Coursera', type: 'Course' },
    { id: 2, title: 'Python for Data Science', platform: 'edX', type: 'Course' },
    { id: 3, title: 'Communication Skills Workshop', platform: 'NPTEL', type: 'Workshop' }
  ];

  // Mock data for challenges
  const challenges = [
    { id: 1, title: 'Build a Todo App', difficulty: 'Easy', reward: '100 pts' },
    { id: 2, title: 'Data Analysis Challenge', difficulty: 'Medium', reward: '200 pts' },
    { id: 3, title: 'Algorithm Optimization', difficulty: 'Hard', reward: '500 pts' }
  ];

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, internshipsRes, applicationsRes, certificatesRes, notificationsRes] = await Promise.all([
          supabase.from('student_profiles').select('*, profiles(*)').eq('user_id', user.id).single(),
          supabase.from('internships').select('*'),
          supabase.from('applications').select('*, internship_details:internships(*)').eq('student_id', user.id),
          supabase.from('certificates').select('*').eq('student_id', user.id),
          supabase.from('notifications').select('*').eq('user_id', user.id)
        ]);

        // Merge profile data
        if (profileRes.data) {
          const flatProfile = { ...profileRes.data.profiles, ...profileRes.data };
          delete flatProfile.profiles;
          setProfile(flatProfile);
        }

        setInternships(internshipsRes.data || []);
        setApplications(applicationsRes.data || []);
        setCertificates(certificatesRes.data || []);
        setNotifications(notificationsRes.data || []);
      } catch (error) {
        toast.error("Failed to load dashboard data.");
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchProgress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('http://localhost:8000/api/students/progress', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    fetchAllData();
    fetchProgress();
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('applications').select('*, internship_details:internships(*)').eq('student_id', user.id);
      if (error) throw error;
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id);
      if (error) throw error;
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const updateProfile = async () => {
    setProfileLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update profiles table
      const { error: profileError } = await supabase.from('profiles').update({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        department: profile.department || profile.major, // mapping major to department/major
        organization: profile.university
      }).eq('id', user.id);

      if (profileError) throw profileError;

      // Update student_profiles table
      const { error: studentError } = await supabase.from('student_profiles').upsert({
        user_id: user.id,
        skills: profile.skills,
        resume_url: profile.resume_url,
        cover_letter: profile.cover_letter,
        cgpa: profile.cgpa,
        graduation_year: profile.graduation_year,
        interests: profile.interests
      });

      if (studentError) throw studentError;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills?.includes(skillInput.trim())) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skill)
    });
  };

  const applyToInternship = async (internshipId) => {
    try {
      const { error } = await supabase.from('applications').insert({
        internship_id: internshipId,
        student_id: user.id,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Application submitted successfully!');
      fetchApplications();
    } catch (error) {
      toast.error(error.message || 'Failed to apply');
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const filteredInternships = internships.filter(internship =>
    internship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    internship.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    internship.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: chatInput,
        sender: 'user'
      };

      setChatMessages([...chatMessages, newMessage]);
      setChatInput('');

      // Simulate bot response
      setTimeout(() => {
        const botResponses = [
          "I found several Python internships that match your skills. Would you like me to show them to you?",
          "Based on your profile, I recommend focusing on improving your Technical Coding skills.",
          "I suggest checking out the Coursera course on Python for Data Science.",
          "Would you like help with resume building or interview preparation?",
          "I found a company that's hiring for a role matching your skills!"
        ];

        const botResponse = {
          id: chatMessages.length + 2,
          text: botResponses[Math.floor(Math.random() * botResponses.length)],
          sender: 'bot'
        };

        setChatMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GraduationCap className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="glass border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative" onClick={() => setActiveTab('notifications')} data-testid="notifications-icon-btn">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" data-testid="notification-count-badge">
                    {unreadCount}
                  </span>
                )}
              </Button>
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
          <TabsList className="grid w-full grid-cols-5 mb-8" data-testid="student-tabs">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="tab-opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="learning" data-testid="tab-learning">Learning</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Main Dashboard */}
          <TabsContent value="dashboard" data-testid="dashboard-content">
            <div className="space-y-8">
              {/* Achievement Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Achievements</h2>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
                <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
                  {achievements.map((achievement) => {
                    const IconComponent = achievement.icon;
                    return (
                      <Card key={achievement.id} className="min-w-[150px] flex-shrink-0">
                        <CardContent className="p-4 flex flex-col items-center">
                          <IconComponent className={`h-8 w-8 ${achievement.color} mb-2`} />
                          <h3 className="font-medium text-center text-sm">{achievement.name}</h3>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              {/* Career Chatbot */}
              <div className="fixed bottom-6 right-6 z-50">
                {chatOpen ? (
                  <Card className="w-80 h-96 flex flex-col">
                    <CardHeader className="p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Career Assistant</h3>
                        <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>×</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto">
                      <div className="space-y-3">
                        {chatMessages.map((message) => (
                          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                              <p className="text-sm">{message.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <form onSubmit={handleChatSubmit} className="p-4 border-t">
                      <div className="flex space-x-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1"
                        />
                        <Button type="submit" size="sm">Send</Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {['Help me find Python internships', 'Improve my coding skills', 'Resume tips'].map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => setChatInput(prompt)}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Button
                    size="lg"
                    className="rounded-full h-14 w-14 p-0 shadow-lg"
                    onClick={() => setChatOpen(true)}
                  >
                    <MessageCircle className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Skill Analytics */}
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Skill Analytics
                    </CardTitle>
                    <CardDescription>Your performance across key skill areas</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={progress.radar_data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Skills"
                          dataKey="A"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </section>

              {/* Progress Tracker Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center text-blue-700">
                      <TrendingUp className="mr-2 h-6 w-6" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600">Courses Completed</span>
                        <span className="text-blue-600 font-bold">{progress.courses_completed}/{progress.total_courses}</span>
                      </div>
                      <Progress value={(progress.courses_completed / progress.total_courses) * 100} className="h-2 bg-blue-100" indicatorClassName="bg-blue-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-600">Challenges Solved</span>
                        <span className="text-purple-600 font-bold">{progress.challenges_solved}/{progress.total_challenges}</span>
                      </div>
                      <Progress value={(progress.challenges_solved / progress.total_challenges) * 100} className="h-2 bg-purple-100" indicatorClassName="bg-purple-600" />
                    </div>

                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Aptitude Score</p>
                        <p className="text-2xl font-bold text-blue-900">{progress.aptitude_score}%</p>
                      </div>
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                        <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Skill Points</p>
                        <p className="text-2xl font-bold text-purple-900">{progress.total_points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center">
                      <Target className="mr-2 h-6 w-6" />
                      Current Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-md border border-white/20">
                      <h4 className="font-bold flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                        Next Milestone
                      </h4>
                      <p className="text-sm opacity-90 mt-1">Complete "Advanced React Patterns" to reach 75% Technical Score</p>
                      <Button variant="secondary" size="sm" className="mt-4 w-full bg-white text-indigo-700 hover:bg-white/90">
                        Resume Learning
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm opacity-80 pt-2">
                      <span>Daily Goal</span>
                      <span>2/3 hrs completed</span>
                    </div>
                    <Progress value={66} className="h-1.5 bg-white/20" indicatorClassName="bg-green-400" />
                  </CardContent>
                </Card>
              </section>

              {/* InternMatch Link */}
              <section>
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                      <div className="mb-4 md:mb-0">
                        <h3 className="text-xl font-bold mb-2">Global Opportunities</h3>
                        <p className="opacity-90">Discover international internships and exchange programs</p>
                      </div>
                      <Button
                        variant="secondary"
                        className="bg-white text-blue-600 hover:bg-gray-100"
                        onClick={() => window.open('https://internmatch.example.com', '_blank')}
                      >
                        View Global Opportunities
                        <Globe className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Quick Stats */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Briefcase className="h-10 w-10 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{applications.length}</p>
                        <p className="text-gray-500">Applications</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Award className="h-10 w-10 text-yellow-500" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{certificates.length}</p>
                        <p className="text-gray-500">Certificates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Star className="h-10 w-10 text-green-500" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{achievements.length}</p>
                        <p className="text-gray-500">Achievements</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Recent Applications */}
              <section>
                <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Recent Applications</h2>
                <div className="space-y-4">
                  {applications.slice(0, 3).map((application) => (
                    <Card key={application.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                              {application.internship_details?.title}
                            </h3>
                            <p className="text-gray-600 text-sm">{application.internship_details?.company}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {new Date(application.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`status-${application.status}`} data-testid="application-status-badge">
                            {application.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {applications.length === 0 && (
                    <div className="text-center py-8" data-testid="no-applications-message">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No applications yet</p>
                      <Button className="mt-4" onClick={() => setActiveTab('opportunities')}>
                        Browse Opportunities
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>

          {/* Profile & Portfolio */}
          <TabsContent value="profile" data-testid="profile-content">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Profile</CardTitle>
                  <CardDescription>Manage your personal information and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={profile.name || ''}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={profile.email || ''}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="+1 234 567 8900"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>University</Label>
                      <Input
                        placeholder="University Name"
                        value={profile.university || ''}
                        onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Major</Label>
                      <Input
                        placeholder="Computer Science"
                        value={profile.major || ''}
                        onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Graduation Year</Label>
                      <Input
                        type="number"
                        placeholder="2025"
                        value={profile.graduation_year || ''}
                        onChange={(e) => setProfile({ ...profile, graduation_year: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>CGPA</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="9.5"
                        value={profile.cgpa || ''}
                        onChange={(e) => setProfile({ ...profile, cgpa: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>LinkedIn Profile</Label>
                      <Input
                        placeholder="https://linkedin.com/in/username"
                        value={profile.linkedin || ''}
                        onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resume & Cover Letter</CardTitle>
                  <CardDescription>Manage your documents and professional materials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Resume URL</Label>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="https://drive.google.com/file/..."
                          value={profile.resume_url || ''}
                          onChange={(e) => setProfile({ ...profile, resume_url: e.target.value })}
                        />
                        <Button variant="outline" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Cover Letter Template</Label>
                      <div className="flex space-x-2">
                        <select className="w-full p-2 border rounded">
                          <option>Professional</option>
                          <option>Creative</option>
                          <option>Academic</option>
                        </select>
                        <Button variant="outline">
                          <FileEdit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Cover Letter</Label>
                    <Textarea
                      placeholder="Write a brief introduction about yourself..."
                      value={profile.cover_letter || ''}
                      onChange={(e) => setProfile({ ...profile, cover_letter: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download CV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skills & Certificates</CardTitle>
                  <CardDescription>Showcase your skills and earned certificates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Skills</Label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        placeholder="Add a skill"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <Button onClick={addSkill}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills?.map((skill) => (
                        <Badge key={skill} className="skill-badge py-2 px-3 text-base">
                          {skill}
                          <X
                            className="h-4 w-4 ml-2 cursor-pointer"
                            onClick={() => removeSkill(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Certificates</h3>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certificate
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {certificates.map((certificate) => (
                        <Card key={certificate.id} className="card-hover">
                          <CardContent className="p-4">
                            <Award className="h-8 w-8 text-yellow-500 mb-2" />
                            <h4 className="font-semibold text-sm mb-1">
                              {certificate.certificate_data.internship_title}
                            </h4>
                            <p className="text-gray-600 text-xs mb-1">{certificate.certificate_data.company}</p>
                            <p className="text-xs text-gray-500">
                              Issued: {new Date(certificate.issued_at).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}

                      {certificates.length === 0 && (
                        <div className="col-span-full text-center py-4">
                          <p className="text-gray-500">No certificates yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Showcase</CardTitle>
                  <CardDescription>Highlight your projects and GitHub repositories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Projects</h3>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Project
                      </Button>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Github className="h-5 w-5 mr-2" />
                        <h4 className="font-semibold">E-commerce Website</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">
                        A full-stack e-commerce platform built with React and Node.js
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">React</Badge>
                        <Badge variant="secondary">Node.js</Badge>
                        <Badge variant="secondary">MongoDB</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        View Repository
                      </Button>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Github className="h-5 w-5 mr-2" />
                        <h4 className="font-semibold">Mobile Weather App</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">
                        Cross-platform mobile app for weather forecasting using React Native
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">React Native</Badge>
                        <Badge variant="secondary">API Integration</Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        View Repository
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={updateProfile} disabled={profileLoading} className="w-full">
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </TabsContent>

          {/* Opportunities Section */}
          <TabsContent value="opportunities" data-testid="opportunities-content">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Internship Opportunities</h2>
                  <p className="text-gray-600">Find the perfect internship for your career goals</p>
                </div>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search opportunities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="grid md:grid-cols-2 gap-6">
                    {filteredInternships.map((internship) => (
                      <InternshipCard
                        key={internship.id}
                        internship={internship}
                        onApply={applyToInternship}
                        hasApplied={applications.some(app => app.internship_id === internship.id)}
                      />
                    ))}
                  </div>

                  {filteredInternships.length === 0 && (
                    <div className="text-center py-12" data-testid="no-internships-message">
                      <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No internships found</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommended for You</CardTitle>
                      <CardDescription>Based on your skills and interests</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {opportunities.map((opportunity) => (
                        <div key={opportunity.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <h3 className="font-semibold">{opportunity.title}</h3>
                          <p className="text-sm text-gray-600">{opportunity.company}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary">{opportunity.stipend}</Badge>
                            <Button size="sm" variant="outline">
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Company Profiles</CardTitle>
                      <CardDescription>Learn about top recruiters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                          <div>
                            <h4 className="font-semibold">Google</h4>
                            <p className="text-sm text-gray-600">Technology • Mountain View, CA</p>
                            <div className="flex items-center mt-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-gray-300 fill-current" />
                              <span className="text-xs text-gray-500 ml-1">(4.2)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                          <div>
                            <h4 className="font-semibold">Microsoft</h4>
                            <p className="text-sm text-gray-600">Technology • Redmond, WA</p>
                            <div className="flex items-center mt-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-500 ml-1">(4.8)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Learning & Preparation */}
          <TabsContent value="learning" data-testid="learning-content">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Learning & Preparation</h2>
                <p className="text-gray-600">Enhance your skills with curated resources and challenges</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Curated Skill-Development Resources
                      </CardTitle>
                      <CardDescription>Access courses from top platforms</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {learningResources.map((resource) => (
                          <div key={resource.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold">{resource.title}</h3>
                              <Badge variant="secondary">{resource.type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{resource.platform}</p>
                            <Button size="sm" variant="outline" className="w-full">
                              Enroll Now
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Mini Challenges
                      </CardTitle>
                      <CardDescription>Test your skills with practical tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {challenges.map((challenge) => (
                          <div key={challenge.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold">{challenge.title}</h3>
                              <Badge variant="outline">{challenge.difficulty}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-green-600 font-medium">{challenge.reward}</span>
                              <Button size="sm">
                                <Play className="h-4 w-4 mr-2" />
                                Start
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Trophy className="h-5 w-5 mr-2" />
                        Aptitude Practice
                      </CardTitle>
                      <CardDescription>Sharpen your logical reasoning and quantitative skills</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                          <Target className="h-6 w-6 mb-2" />
                          Logical Reasoning
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                          <BarChart3 className="h-6 w-6 mb-2" />
                          Quantitative Aptitude
                        </Button>
                        <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
                          <BookOpen className="h-6 w-6 mb-2" />
                          Verbal Ability
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Soft-Skill Zone
                      </CardTitle>
                      <CardDescription>Develop essential professional skills</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" className="w-full justify-start">
                        <Video className="h-4 w-4 mr-2" />
                        Mock Interview Simulator
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Video className="h-4 w-4 mr-2" />
                        Communication Skills
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Video className="h-4 w-4 mr-2" />
                        Email Etiquette
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Video className="h-4 w-4 mr-2" />
                        Body Language Tips
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileEdit className="h-4 w-4 mr-2" />
                        Resume Writing Guide
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileEdit className="h-4 w-4 mr-2" />
                        LinkedIn Building
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Tracker</CardTitle>
                      <CardDescription>Your learning journey insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Courses Completed</span>
                            <span className="text-sm font-medium">3/8</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '37.5%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Challenges Solved</span>
                            <span className="text-sm font-medium">12/20</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Aptitude Score</span>
                            <span className="text-sm font-medium">85%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" data-testid="notifications-content">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer ${notification.read ? 'opacity-60' : ''}`}
                  onClick={() => !notification.read && markNotificationRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Bell className={`h-5 w-5 mt-0.5 ${notification.read ? 'text-gray-400' : 'text-blue-600'}`} />
                      <div className="flex-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full" data-testid="unread-indicator"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-12" data-testid="no-notifications-message">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}