from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

print(f"Loaded CORS origins: {[origin.strip() for origin in os.environ.get('CORS_ORIGINS', '*').split(',') if origin.strip()]}")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class UserRole(BaseModel):
    STUDENT: str = "student"
    PLACEMENT_STAFF: str = "placement_staff"
    FACULTY: str = "faculty"
    EMPLOYER: str = "employer"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str

class UserRegister(UserBase):
    password: str
    department: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    department: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    profile_completed: bool = False
    created_at: str

class StudentProfile(BaseModel):
    user_id: str
    skills: List[str] = []
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    interests: List[str] = []

class InternshipBase(BaseModel):
    title: str
    description: str
    company: str
    skills_required: List[str]
    department: str
    stipend: Optional[float] = None
    duration_months: int
    location: str
    application_deadline: str
    is_verified: bool = False

class InternshipCreate(InternshipBase):
    pass

class Internship(InternshipBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    posted_by: str
    posted_by_role: str
    created_at: str
    applicant_count: int = 0

class ApplicationBase(BaseModel):
    internship_id: str
    student_id: str
    cover_letter: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class Application(ApplicationBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    status: str  # pending, approved, rejected, shortlisted
    applied_at: str
    faculty_approved: bool = False
    faculty_feedback: Optional[str] = None

class InterviewBase(BaseModel):
    application_id: str
    scheduled_at: str
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class Interview(InterviewBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    status: str  # scheduled, completed, cancelled

class FeedbackBase(BaseModel):
    application_id: str
    feedback_text: str
    rating: Optional[int] = None

class FeedbackCreate(FeedbackBase):
    pass

class Feedback(FeedbackBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    submitted_by: str
    submitted_at: str

class Certificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    student_id: str
    internship_id: str
    issued_at: str
    certificate_data: Dict[str, Any]

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    message: str
    type: str
    read: bool = False
    created_at: str

# ===== UTILITY FUNCTIONS =====

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def create_notification(user_id: str, message: str, notification_type: str):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "message": message,
        "type": notification_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

def match_students_to_internship(internship: Dict, students: List[Dict]) -> List[Dict]:
    """Simple rule-based matching algorithm"""
    matched = []
    required_skills = set(internship.get('skills_required', []))
    
    for student in students:
        profile = student.get('profile', {})
        student_skills = set(profile.get('skills', []))
        
        # Calculate match score
        matching_skills = required_skills.intersection(student_skills)
        if not required_skills:
            match_score = 0
        else:
            match_score = (len(matching_skills) / len(required_skills)) * 100
        
        # Department match
        if internship.get('department') == student.get('department'):
            match_score += 10
        
        if match_score >= 30:  # Minimum 30% match
            matched.append({
                "student_id": student['id'],
                "name": student['name'],
                "email": student['email'],
                "match_score": round(match_score, 2),
                "matching_skills": list(matching_skills)
            })
    
    return sorted(matched, key=lambda x: x['match_score'], reverse=True)

# ===== AUTHENTICATION ENDPOINTS =====

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "password_hash": hashed_pwd,
        "department": user_data.department,
        "phone": user_data.phone,
        "organization": user_data.organization,
        "profile_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create student profile if role is student
    if user_data.role == "student":
        profile_doc = {
            "user_id": user_id,
            "skills": [],
            "interests": [],
            "resume_url": None,
            "cover_letter": None,
            "cgpa": None,
            "graduation_year": None
        }
        await db.student_profiles.insert_one(profile_doc)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'], user['role'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "department": user.get('department'),
            "organization": user.get('organization')
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===== STUDENT PROFILE ENDPOINTS =====

@api_router.get("/students/profile")
async def get_student_profile(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can access this")
    
    profile = await db.student_profiles.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    return profile or {}

@api_router.put("/students/profile")
async def update_student_profile(profile_data: StudentProfile, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can update profile")
    
    profile_dict = profile_data.model_dump()
    profile_dict['user_id'] = current_user['user_id']
    
    await db.student_profiles.update_one(
        {"user_id": current_user['user_id']},
        {"$set": profile_dict},
        upsert=True
    )
    
    # Mark profile as completed
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {"profile_completed": True}}
    )
    
    return {"message": "Profile updated successfully"}

# ===== INTERNSHIP ENDPOINTS =====

@api_router.post("/internships", response_model=Internship)
async def create_internship(internship: InternshipCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['placement_staff', 'employer']:
        raise HTTPException(status_code=403, detail="Only placement staff or employers can post internships")
    
    internship_id = str(uuid.uuid4())
    internship_doc = internship.model_dump()
    internship_doc.update({
        "id": internship_id,
        "posted_by": current_user['user_id'],
        "posted_by_role": current_user['role'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "applicant_count": 0,
        "is_verified": current_user['role'] == 'placement_staff'  # Auto-verify if posted by staff
    })
    
    await db.internships.insert_one(internship_doc)
    
    # Notify matching students
    if internship_doc['is_verified']:
        students = await db.users.find({"role": "student"}, {"_id": 0}).to_list(1000)
        for student in students:
            student['profile'] = await db.student_profiles.find_one({"user_id": student['id']}, {"_id": 0}) or {}
        
        matched_students = match_students_to_internship(internship_doc, students)
        
        for match in matched_students[:20]:  # Top 20 matches
            await create_notification(
                match['student_id'],
                f"New internship match: {internship.title} at {internship.company} ({match['match_score']}% match)",
                "internship_match"
            )
    
    return Internship(**internship_doc)

@api_router.get("/internships", response_model=List[Internship])
async def get_internships(
    department: Optional[str] = None,
    skills: Optional[str] = None,
    verified_only: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    query = {}
    if verified_only:
        query["is_verified"] = True
    if department:
        query["department"] = department
    if skills:
        skill_list = skills.split(',')
        query["skills_required"] = {"$in": skill_list}
    
    internships = await db.internships.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return internships

@api_router.get("/internships/{internship_id}", response_model=Internship)
async def get_internship(internship_id: str, current_user: Dict = Depends(get_current_user)):
    internship = await db.internships.find_one({"id": internship_id}, {"_id": 0})
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    return internship

@api_router.put("/internships/{internship_id}/verify")
async def verify_internship(internship_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'placement_staff':
        raise HTTPException(status_code=403, detail="Only placement staff can verify internships")
    
    result = await db.internships.update_one(
        {"id": internship_id},
        {"$set": {"is_verified": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Internship not found")
    
    return {"message": "Internship verified successfully"}

@api_router.delete("/internships/{internship_id}")
async def delete_internship(internship_id: str, current_user: Dict = Depends(get_current_user)):
    internship = await db.internships.find_one({"id": internship_id})
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    
    if internship['posted_by'] != current_user['user_id'] and current_user['role'] != 'placement_staff':
        raise HTTPException(status_code=403, detail="Not authorized to delete this internship")
    
    await db.internships.delete_one({"id": internship_id})
    return {"message": "Internship deleted successfully"}

# ===== APPLICATION ENDPOINTS =====

@api_router.post("/applications", response_model=Application)
async def create_application(application: ApplicationCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can apply")
    
    # Check if already applied
    existing = await db.applications.find_one({
        "internship_id": application.internship_id,
        "student_id": current_user['user_id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this internship")
    
    application_id = str(uuid.uuid4())
    application_doc = {
        "id": application_id,
        "internship_id": application.internship_id,
        "student_id": current_user['user_id'],
        "cover_letter": application.cover_letter,
        "status": "pending",
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "faculty_approved": False,
        "faculty_feedback": None
    }
    
    await db.applications.insert_one(application_doc)
    
    # Increment applicant count
    await db.internships.update_one(
        {"id": application.internship_id},
        {"$inc": {"applicant_count": 1}}
    )
    
    # Notify placement staff
    staff_users = await db.users.find({"role": "placement_staff"}, {"_id": 0}).to_list(100)
    internship = await db.internships.find_one({"id": application.internship_id})
    for staff in staff_users:
        await create_notification(
            staff['id'],
            f"New application for {internship['title']}",
            "new_application"
        )
    
    return Application(**application_doc)

@api_router.get("/applications", response_model=List[Application])
async def get_applications(
    internship_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    query = {}
    
    if current_user['role'] == 'student':
        query["student_id"] = current_user['user_id']
    elif internship_id:
        query["internship_id"] = internship_id
    
    applications = await db.applications.find(query, {"_id": 0}).sort("applied_at", -1).to_list(1000)
    
    # Enrich with student and internship details
    for app in applications:
        student = await db.users.find_one({"id": app['student_id']}, {"_id": 0, "password_hash": 0})
        internship = await db.internships.find_one({"id": app['internship_id']}, {"_id": 0})
        app['student_details'] = student
        app['internship_details'] = internship
    
    return applications

@api_router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    status: str,
    current_user: Dict = Depends(get_current_user)
):
    if current_user['role'] not in ['placement_staff', 'employer', 'faculty']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    application = await db.applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    await db.applications.update_one(
        {"id": application_id},
        {"$set": {"status": status}}
    )
    
    # Notify student
    await create_notification(
        application['student_id'],
        f"Your application status has been updated to: {status}",
        "application_status"
    )
    
    return {"message": "Application status updated"}

@api_router.put("/applications/{application_id}/faculty-approve")
async def faculty_approve_application(
    application_id: str,
    feedback: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    if current_user['role'] != 'faculty':
        raise HTTPException(status_code=403, detail="Only faculty can approve applications")
    
    await db.applications.update_one(
        {"id": application_id},
        {"$set": {
            "faculty_approved": True,
            "faculty_feedback": feedback
        }}
    )
    
    application = await db.applications.find_one({"id": application_id})
    await create_notification(
        application['student_id'],
        "Your application has been approved by faculty mentor",
        "faculty_approval"
    )
    
    return {"message": "Application approved by faculty"}

# ===== INTERVIEW ENDPOINTS =====

@api_router.post("/interviews", response_model=Interview)
async def create_interview(interview: InterviewCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['placement_staff', 'employer']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    interview_id = str(uuid.uuid4())
    interview_doc = interview.model_dump()
    interview_doc.update({
        "id": interview_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "scheduled"
    })
    
    await db.interviews.insert_one(interview_doc)
    
    # Get application details and notify student
    application = await db.applications.find_one({"id": interview.application_id})
    if application:
        await create_notification(
            application['student_id'],
            f"Interview scheduled for {interview.scheduled_at}",
            "interview_scheduled"
        )
    
    return Interview(**interview_doc)

@api_router.get("/interviews", response_model=List[Interview])
async def get_interviews(current_user: Dict = Depends(get_current_user)):
    # Get user's applications first if student
    if current_user['role'] == 'student':
        applications = await db.applications.find({"student_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
        app_ids = [app['id'] for app in applications]
        interviews = await db.interviews.find({"application_id": {"$in": app_ids}}, {"_id": 0}).to_list(1000)
    else:
        interviews = await db.interviews.find({}, {"_id": 0}).to_list(1000)
    
    # Enrich with application details
    for interview in interviews:
        application = await db.applications.find_one({"id": interview['application_id']}, {"_id": 0})
        interview['application_details'] = application
    
    return interviews

# ===== FEEDBACK ENDPOINTS =====

@api_router.post("/feedback", response_model=Feedback)
async def create_feedback(feedback: FeedbackCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['faculty', 'employer']:
        raise HTTPException(status_code=403, detail="Only faculty or employers can submit feedback")
    
    feedback_id = str(uuid.uuid4())
    feedback_doc = feedback.model_dump()
    feedback_doc.update({
        "id": feedback_id,
        "submitted_by": current_user['user_id'],
        "submitted_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.feedbacks.insert_one(feedback_doc)
    
    return Feedback(**feedback_doc)

@api_router.get("/feedback/{application_id}", response_model=List[Feedback])
async def get_feedback(application_id: str, current_user: Dict = Depends(get_current_user)):
    feedbacks = await db.feedbacks.find({"application_id": application_id}, {"_id": 0}).to_list(100)
    return feedbacks

# ===== CERTIFICATE ENDPOINTS =====

@api_router.post("/certificates/generate")
async def generate_certificate(application_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'faculty':
        raise HTTPException(status_code=403, detail="Only faculty can generate certificates")
    
    application = await db.applications.find_one({"id": application_id})
    if not application or application['status'] != 'approved':
        raise HTTPException(status_code=400, detail="Application must be approved to generate certificate")
    
    # Check if certificate already exists
    existing = await db.certificates.find_one({
        "student_id": application['student_id'],
        "internship_id": application['internship_id']
    })
    if existing:
        return {"message": "Certificate already generated", "certificate_id": existing['id']}
    
    student = await db.users.find_one({"id": application['student_id']})
    internship = await db.internships.find_one({"id": application['internship_id']})
    
    certificate_id = str(uuid.uuid4())
    certificate_doc = {
        "id": certificate_id,
        "student_id": application['student_id'],
        "internship_id": application['internship_id'],
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "certificate_data": {
            "student_name": student['name'],
            "internship_title": internship['title'],
            "company": internship['company'],
            "duration": internship['duration_months'],
            "issued_by": current_user['user_id']
        }
    }
    
    await db.certificates.insert_one(certificate_doc)
    
    await create_notification(
        application['student_id'],
        "Your internship certificate has been generated and is ready for download",
        "certificate_generated"
    )
    
    return {"message": "Certificate generated successfully", "certificate_id": certificate_id}

@api_router.get("/certificates", response_model=List[Certificate])
async def get_certificates(current_user: Dict = Depends(get_current_user)):
    query = {}
    if current_user['role'] == 'student':
        query["student_id"] = current_user['user_id']
    
    certificates = await db.certificates.find(query, {"_id": 0}).to_list(1000)
    return certificates

# ===== NOTIFICATION ENDPOINTS =====

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: Dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: Dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

# ===== ANALYTICS ENDPOINTS =====

@api_router.get("/analytics/dashboard")
async def get_analytics(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'placement_staff':
        raise HTTPException(status_code=403, detail="Only placement staff can access analytics")
    
    total_internships = await db.internships.count_documents({"is_verified": True})
    total_applications = await db.applications.count_documents({})
    total_students = await db.users.count_documents({"role": "student"})
    
    # Application status breakdown
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_breakdown = await db.applications.aggregate(status_pipeline).to_list(100)
    
    # Department-wise statistics
    dept_pipeline = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    dept_stats = await db.internships.aggregate(dept_pipeline).to_list(100)
    
    return {
        "total_internships": total_internships,
        "total_applications": total_applications,
        "total_students": total_students,
        "status_breakdown": status_breakdown,
        "department_stats": dept_stats
    }

# ===== MATCHING ENDPOINT =====

@api_router.get("/matching/students/{internship_id}")
async def get_matched_students(internship_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] not in ['placement_staff', 'employer']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    internship = await db.internships.find_one({"id": internship_id}, {"_id": 0})
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Get profiles
    for student in students:
        profile = await db.student_profiles.find_one({"user_id": student['id']}, {"_id": 0})
        student['profile'] = profile or {}
    
    matched_students = match_students_to_internship(internship, students)
    
    return {"matches": matched_students[:50]}  # Top 50 matches

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "InternPro API is running", "status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in os.environ.get('CORS_ORIGINS', '*').split(',') if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
