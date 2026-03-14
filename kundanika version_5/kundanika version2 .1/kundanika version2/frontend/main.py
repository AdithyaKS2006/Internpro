from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Assume 'app' is your existing FastAPI instance.
# If you create your app in a different file, this middleware should be added there.
app = FastAPI()

# --- CORS Configuration ---

# This is the list of origins that are allowed to make requests to your API.
# You should restrict this to your actual frontend origins for security.
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://172.18.16.1:3000",  # The origin from your error message
    "https://172.18.16.1:3000",
    # Add any other frontend URLs you use for development or production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Specifies the allowed origins.
    allow_credentials=True,    # Allows cookies to be included in requests.
    allow_methods=["*"],         # Allows all HTTP methods (GET, POST, PUT, etc.).
    allow_headers=["*"],         # Allows all headers, including 'Authorization'.
)

# --- Your existing API routes and application logic go here ---

# Example placeholder for your existing routes
@app.get("/")
def read_root():
    return {"message": "API is running"}

# You would then include your existing routers as you normally would
# from .routers import auth, students, internships
#
# app.include_router(auth.router)
# app.include_router(students.router)
# ... and so on