import requests
import sys
from datetime import datetime, timedelta

class InternshipPlatformTester:
    def __init__(self, base_url="http://127.0.0.1:8000/api"):
        self.base_url = base_url
        self.tokens = {}
        self.users = {}
        self.test_data = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, role=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if role and role in self.tokens:
            headers['Authorization'] = f'Bearer {self.tokens[role]}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_registration(self):
        """Test user registration for all roles"""
        print("\n" + "="*60)
        print("TESTING USER REGISTRATION")
        print("="*60)
        
        timestamp = datetime.now().strftime('%H%M%S')
        roles = [
            ('student', {'department': 'Computer Science'}),
            ('placement_staff', {'department': 'Placement Cell'}),
            ('faculty', {'department': 'Computer Science'}),
            ('employer', {'organization': 'Tech Corp'})
        ]
        
        for role, extra_data in roles:
            user_data = {
                'email': f'{role}_{timestamp}@test.com',
                'password': 'Test@123',
                'name': f'Test {role.title()}',
                'role': role,
                'phone': '+1234567890',
                **extra_data
            }
            
            success, response = self.run_test(
                f"Register {role}",
                "POST",
                "auth/register",
                200,
                data=user_data
            )
            
            if success and 'token' in response:
                self.tokens[role] = response['token']
                self.users[role] = response['user']
                print(f"   ✓ Token saved for {role}")

    def test_login(self):
        """Test login for registered users"""
        print("\n" + "="*60)
        print("TESTING USER LOGIN")
        print("="*60)
        
        for role in ['student', 'placement_staff', 'faculty', 'employer']:
            if role in self.users:
                login_data = {
                    'email': self.users[role]['email'],
                    'password': 'Test@123'
                }
                
                success, response = self.run_test(
                    f"Login {role}",
                    "POST",
                    "auth/login",
                    200,
                    data=login_data
                )
                
                if success and 'token' in response:
                    self.tokens[role] = response['token']

    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n" + "="*60)
        print("TESTING GET CURRENT USER")
        print("="*60)
        
        for role in ['student', 'placement_staff', 'faculty', 'employer']:
            if role in self.tokens:
                self.run_test(
                    f"Get current user ({role})",
                    "GET",
                    "auth/me",
                    200,
                    role=role
                )

    def test_student_profile(self):
        """Test student profile management"""
        print("\n" + "="*60)
        print("TESTING STUDENT PROFILE")
        print("="*60)
        
        if 'student' not in self.tokens:
            print("⚠️  Skipping - No student token available")
            return
        
        # Get profile
        self.run_test(
            "Get student profile",
            "GET",
            "students/profile",
            200,
            role='student'
        )
        
        # Update profile
        profile_data = {
            'user_id': self.users['student']['id'],
            'skills': ['Python', 'JavaScript', 'React'],
            'cgpa': 8.5,
            'graduation_year': 2025,
            'resume_url': 'https://example.com/resume.pdf',
            'cover_letter': 'I am a passionate student looking for internship opportunities.',
            'interests': ['Web Development', 'AI']
        }
        
        self.run_test(
            "Update student profile",
            "PUT",
            "students/profile",
            200,
            data=profile_data,
            role='student'
        )

    def test_internship_creation(self):
        """Test internship creation by placement staff and employer"""
        print("\n" + "="*60)
        print("TESTING INTERNSHIP CREATION")
        print("="*60)
        
        deadline = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Placement staff creates internship
        if 'placement_staff' in self.tokens:
            internship_data = {
                'title': 'Software Development Intern',
                'description': 'Work on exciting web development projects',
                'company': 'Tech Solutions Inc',
                'skills_required': ['Python', 'JavaScript', 'React'],
                'department': 'Computer Science',
                'stipend': 15000,
                'duration_months': 3,
                'location': 'Bangalore',
                'application_deadline': deadline
            }
            
            success, response = self.run_test(
                "Create internship (placement staff)",
                "POST",
                "internships",
                200,
                data=internship_data,
                role='placement_staff'
            )
            
            if success and 'id' in response:
                self.test_data['internship_id'] = response['id']
                print(f"   ✓ Internship ID saved: {response['id']}")
        
        # Employer creates internship
        if 'employer' in self.tokens:
            employer_internship = {
                'title': 'Data Science Intern',
                'description': 'Work on machine learning projects',
                'company': 'Tech Corp',
                'skills_required': ['Python', 'Machine Learning', 'Data Analysis'],
                'department': 'Computer Science',
                'stipend': 20000,
                'duration_months': 6,
                'location': 'Mumbai',
                'application_deadline': deadline
            }
            
            success, response = self.run_test(
                "Create internship (employer)",
                "POST",
                "internships",
                200,
                data=employer_internship,
                role='employer'
            )
            
            if success and 'id' in response:
                self.test_data['employer_internship_id'] = response['id']

    def test_get_internships(self):
        """Test fetching internships"""
        print("\n" + "="*60)
        print("TESTING GET INTERNSHIPS")
        print("="*60)
        
        if 'student' in self.tokens:
            self.run_test(
                "Get all internships",
                "GET",
                "internships",
                200,
                role='student'
            )
            
            # Test with filters
            self.run_test(
                "Get internships by department",
                "GET",
                "internships",
                200,
                role='student',
                params={'department': 'Computer Science'}
            )

    def test_verify_internship(self):
        """Test internship verification by placement staff"""
        print("\n" + "="*60)
        print("TESTING INTERNSHIP VERIFICATION")
        print("="*60)
        
        if 'placement_staff' in self.tokens and 'employer_internship_id' in self.test_data:
            self.run_test(
                "Verify employer internship",
                "PUT",
                f"internships/{self.test_data['employer_internship_id']}/verify",
                200,
                role='placement_staff'
            )

    def test_student_application(self):
        """Test student applying to internship"""
        print("\n" + "="*60)
        print("TESTING STUDENT APPLICATION")
        print("="*60)
        
        if 'student' not in self.tokens or 'internship_id' not in self.test_data:
            print("⚠️  Skipping - No student token or internship available")
            return
        
        application_data = {
            'internship_id': self.test_data['internship_id'],
            'student_id': self.users['student']['id'],
            'cover_letter': 'I am very interested in this opportunity.'
        }
        
        success, response = self.run_test(
            "Apply to internship",
            "POST",
            "applications",
            200,
            data=application_data,
            role='student'
        )
        
        if success and 'id' in response:
            self.test_data['application_id'] = response['id']
            print(f"   ✓ Application ID saved: {response['id']}")
        
        # Test duplicate application
        self.run_test(
            "Duplicate application (should fail)",
            "POST",
            "applications",
            400,
            data=application_data,
            role='student'
        )

    def test_get_applications(self):
        """Test fetching applications"""
        print("\n" + "="*60)
        print("TESTING GET APPLICATIONS")
        print("="*60)
        
        # Student gets their applications
        if 'student' in self.tokens:
            self.run_test(
                "Get student applications",
                "GET",
                "applications",
                200,
                role='student'
            )
        
        # Placement staff gets all applications
        if 'placement_staff' in self.tokens:
            self.run_test(
                "Get all applications (placement staff)",
                "GET",
                "applications",
                200,
                role='placement_staff'
            )

    def test_update_application_status(self):
        """Test updating application status"""
        print("\n" + "="*60)
        print("TESTING APPLICATION STATUS UPDATE")
        print("="*60)
        
        if 'placement_staff' not in self.tokens or 'application_id' not in self.test_data:
            print("⚠️  Skipping - No placement staff token or application available")
            return
        
        self.run_test(
            "Update application to shortlisted",
            "PUT",
            f"applications/{self.test_data['application_id']}/status",
            200,
            role='placement_staff',
            params={'status': 'shortlisted'}
        )

    def test_faculty_approval(self):
        """Test faculty approval of application"""
        print("\n" + "="*60)
        print("TESTING FACULTY APPROVAL")
        print("="*60)
        
        if 'faculty' not in self.tokens or 'application_id' not in self.test_data:
            print("⚠️  Skipping - No faculty token or application available")
            return
        
        self.run_test(
            "Faculty approve application",
            "PUT",
            f"applications/{self.test_data['application_id']}/faculty-approve",
            200,
            role='faculty',
            params={'feedback': 'Great candidate, approved!'}
        )

    def test_analytics(self):
        """Test analytics dashboard"""
        print("\n" + "="*60)
        print("TESTING ANALYTICS DASHBOARD")
        print("="*60)
        
        if 'placement_staff' in self.tokens:
            self.run_test(
                "Get analytics dashboard",
                "GET",
                "analytics/dashboard",
                200,
                role='placement_staff'
            )

    def test_notifications(self):
        """Test notifications"""
        print("\n" + "="*60)
        print("TESTING NOTIFICATIONS")
        print("="*60)
        
        if 'student' in self.tokens:
            success, response = self.run_test(
                "Get student notifications",
                "GET",
                "notifications",
                200,
                role='student'
            )
            
            # Mark first notification as read if exists
            if success and response and len(response) > 0:
                notification_id = response[0]['id']
                self.run_test(
                    "Mark notification as read",
                    "PUT",
                    f"notifications/{notification_id}/read",
                    200,
                    role='student'
                )

    def test_certificate_generation(self):
        """Test certificate generation"""
        print("\n" + "="*60)
        print("TESTING CERTIFICATE GENERATION")
        print("="*60)
        
        if 'faculty' not in self.tokens or 'application_id' not in self.test_data:
            print("⚠️  Skipping - No faculty token or application available")
            return
        
        # First update application to approved
        if 'placement_staff' in self.tokens:
            self.run_test(
                "Update application to approved",
                "PUT",
                f"applications/{self.test_data['application_id']}/status",
                200,
                role='placement_staff',
                params={'status': 'approved'}
            )
        
        # Generate certificate
        self.run_test(
            "Generate certificate",
            "POST",
            f"certificates/generate?application_id={self.test_data['application_id']}",
            200,
            role='faculty'
        )
        
        # Get certificates
        if 'student' in self.tokens:
            self.run_test(
                "Get student certificates",
                "GET",
                "certificates",
                200,
                role='student'
            )

    def test_matching_algorithm(self):
        """Test student matching algorithm"""
        print("\n" + "="*60)
        print("TESTING MATCHING ALGORITHM")
        print("="*60)
        
        if 'placement_staff' not in self.tokens or 'internship_id' not in self.test_data:
            print("⚠️  Skipping - No placement staff token or internship available")
            return
        
        self.run_test(
            "Get matched students for internship",
            "GET",
            f"matching/students/{self.test_data['internship_id']}",
            200,
            role='placement_staff'
        )

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test['test']}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                else:
                    print(f"    Expected: {test['expected']}, Got: {test.get('actual', 'N/A')}")
                print(f"    Endpoint: {test['endpoint']}")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    print("="*60)
    print("INTERNSHIP PLATFORM - COMPREHENSIVE API TESTING")
    print("="*60)
    
    tester = InternshipPlatformTester()
    
    # Run all tests in sequence
    tester.test_registration()
    tester.test_login()
    tester.test_get_current_user()
    tester.test_student_profile()
    tester.test_internship_creation()
    tester.test_get_internships()
    tester.test_verify_internship()
    tester.test_student_application()
    tester.test_get_applications()
    tester.test_update_application_status()
    tester.test_faculty_approval()
    tester.test_analytics()
    tester.test_notifications()
    tester.test_certificate_generation()
    tester.test_matching_algorithm()
    
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
