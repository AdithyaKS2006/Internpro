import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

export default function Register({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: '',
    department: '',
    phone: '',
    organization: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Supabase Auth SignUp
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            department: formData.department,
            phone: formData.phone,
            organization: formData.organization
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Optionally update the profile if metadata wasn't enough (but the trigger handles basic fields)
        // For extra fields like department/phone/organization which are not in the trigger yet (oops, I should update the trigger or do it here)
        // The trigger only did: name, role. 
        // I should update the other fields manually to be safe.

        await supabase.from('profiles').update({
          department: formData.department,
          phone: formData.phone,
          organization: formData.organization
        }).eq('id', data.user.id);

        const userWithProfile = { ...data.user, ...formData };
        localStorage.setItem('user', JSON.stringify(userWithProfile));
        setUser(userWithProfile);

        toast.success('Registration successful!');
        navigate('/');
      }

    } catch (error) {
      console.error('Signup Error:', error); // Log full error for debugging

      if (error.status === 429 || error.message?.includes('429')) {
        toast.error('Too many attempts. Please wait a while before trying again.');
      } else if (error.message?.includes('registered') || error.message?.includes('exists')) {
        toast.error('User already registered. Please login instead.');
      } else if (error.message?.includes('Password')) {
        toast.error(error.message); // likely "Password should be at least 6 characters"
      } else if (error.status === 400) {
        // 400 often means "User already registered" or invalid data
        if (error.message?.includes('password')) {
          toast.error(error.message);
        } else {
          toast.error('Registration failed. User may already exist. Try logging in.');
        }
      } else {
        toast.error(error.message || 'Registration failed. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GraduationCap className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Create Account</h1>
          <p className="text-gray-600">Start your internship journey</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="register-name-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="register-email-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                data-testid="register-password-input"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role">I am a</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} required>
                <SelectTrigger className="mt-1" data-testid="register-role-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student" data-testid="role-option-student">Student</SelectItem>
                  <SelectItem value="placement_staff" data-testid="role-option-placement">Placement Cell Staff</SelectItem>
                  <SelectItem value="faculty" data-testid="role-option-faculty">Faculty Mentor</SelectItem>
                  <SelectItem value="employer" data-testid="role-option-employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.role === 'student' || formData.role === 'faculty') && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="Computer Science"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  data-testid="register-department-input"
                  className="mt-1"
                />
              </div>
            )}

            {formData.role === 'employer' && (
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="Company Name"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  data-testid="register-organization-input"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="register-phone-input"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || !formData.role}
              data-testid="register-submit-btn"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline" data-testid="register-login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
