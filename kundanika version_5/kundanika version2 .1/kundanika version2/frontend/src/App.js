import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import StudentDashboard from '@/pages/StudentDashboard';
import PlacementStaffDashboard from '@/pages/PlacementStaffDashboard';
import FacultyDashboard from '@/pages/FacultyDashboard';
import EmployerDashboard from '@/pages/EmployerDashboard';
import { Toaster } from '@/components/ui/sonner';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // If we don't have user state yet or if it changed, fetch profile
        // Note: fetchProfile handles setting user state
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Merge auth metadata with profile data if needed, but profiles table should have what we need
      // We essentially want the 'user' object to look like what the dashboards expect
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser({ ...authUser, ...data });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('token'); // Clear legacy items just in case
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" />;
    }
    return children;
  };

  const getDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case 'student':
        return <StudentDashboard user={user} logout={logout} />;
      case 'placement_staff':
        return <PlacementStaffDashboard user={user} logout={logout} />;
      case 'faculty':
        return <FacultyDashboard user={user} logout={logout} />;
      case 'employer':
        return <EmployerDashboard user={user} logout={logout} />;
      default:
        return <Navigate to="/" />;
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? getDashboard() : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {getDashboard()}
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
