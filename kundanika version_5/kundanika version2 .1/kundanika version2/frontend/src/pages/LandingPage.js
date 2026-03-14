import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Briefcase, Users, TrendingUp, Award, Calendar } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass fixed top-0 w-full z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>InternPro</span>
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="ghost" data-testid="nav-login-btn">Login</Button>
              </Link>
              <Link to="/register">
                <Button data-testid="nav-register-btn">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk' }}>
            Your Gateway to
            <span className="gradient-text"> Industry Experience</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect students with top internship opportunities. Streamline applications, track progress, and build your career path.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8" data-testid="hero-get-started-btn">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-12 px-8" data-testid="hero-login-btn">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'Space Grotesk' }}>
            Everything You Need in One Platform
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Briefcase className="h-8 w-8 text-blue-600" />}
              title="Smart Matching"
              description="AI-powered recommendations match students with relevant internship opportunities based on skills and interests."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-emerald-600" />}
              title="Multi-Role Support"
              description="Seamless experience for students, faculty, placement staff, and employers all in one platform."
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-purple-600" />}
              title="Live Analytics"
              description="Track placement statistics, application trends, and success metrics in real-time dashboards."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8 text-orange-600" />}
              title="Interview Scheduling"
              description="Integrated calendar system syncs with academic schedules for hassle-free interview management."
            />
            <FeatureCard
              icon={<Award className="h-8 w-8 text-pink-600" />}
              title="Instant Certificates"
              description="Auto-generate internship completion certificates with digital verification."
            />
            <FeatureCard
              icon={<GraduationCap className="h-8 w-8 text-indigo-600" />}
              title="Faculty Oversight"
              description="Faculty mentors can review applications, provide feedback, and approve student placements."
            />
          </div>
        </div>
      </section>

      {/* Role-Based Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'Space Grotesk' }}>
            Designed for Every Stakeholder
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard
              title="Students"
              features={[
                "One-click applications",
                "Application tracking",
                "Personalized matches",
                "Digital certificates"
              ]}
              color="blue"
            />
            <RoleCard
              title="Placement Staff"
              features={[
                "Post opportunities",
                "Automated matching",
                "Analytics dashboard",
                "Bulk notifications"
              ]}
              color="emerald"
            />
            <RoleCard
              title="Faculty Mentors"
              features={[
                "Approve applications",
                "Submit feedback",
                "Generate certificates",
                "Monitor progress"
              ]}
              color="purple"
            />
            <RoleCard
              title="Employers"
              features={[
                "Post internships",
                "View candidates",
                "Schedule interviews",
                "Provide feedback"
              ]}
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk' }}>
            Ready to Transform Your Internship Process?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of institutions already using InternPro
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="h-12 px-8" data-testid="cta-register-btn">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GraduationCap className="h-6 w-6" />
            <span className="text-lg font-bold">InternPro</span>
          </div>
          <p className="text-sm">
            © 2025 InternPro. Empowering education and industry connections.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 bg-white card-hover">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function RoleCard({ title, features, color }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200'
  };

  return (
    <div className={`p-6 rounded-xl border bg-gradient-to-br ${colorClasses[color]}`}>
      <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>{title}</h3>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm">
            <span className="text-gray-700">✓ {feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
