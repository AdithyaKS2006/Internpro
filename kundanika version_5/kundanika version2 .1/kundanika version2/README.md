# InternPro - Internship Management Platform (Supabase Edition)

A comprehensive platform for managing the internship process for students, faculty, placement staff, and employers.

## 🚀 Key Updates (v2 Migration)
This project has been migrated from a MERN stack (MongoDB, Express/FastAPI, React, Node) to a **React + Supabase** architecture.

- **Authentication**: Replaced custom JWT backend with **Supabase Auth**.
- **Database**: Migrated from MongoDB to **PostgreSQL** (hosted on Supabase).
- **Backend Logic**: Core logic (Notifications, Internship Matching, Certificate Generation) now runs directly in the database using **PostgreSQL Triggers and Functions**.
- **Performance**: Faster data fetching and real-time updates using Supabase Client.

## 📋 Prerequisites
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)

## 🛠️ Setup & Installation

The project now runs as a standalone frontend application connected to the Supabase cloud.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # Note: Legacy peer deps flag may be needed if warnings occur
    npm install --legacy-peer-deps
    ```

3.  **Environment Configuration**:
    Ensure your `frontend/.env` file contains the valid Supabase credentials:
    ```env
    REACT_APP_SUPABASE_URL=https://xsuebggchpfycqfxesvk.supabase.co
    REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
    ```

## ▶️ How to Run

Since the backend logic is now handled by Supabase, you only need to run the frontend.

1.  **Start the Application:**
    ```bash
    cd frontend
    npm start
    ```
    This will launch the app at `http://localhost:3000`.

## 🌐 Remote Access (Ngrok)
To share your local development server with others:

1.  Start ngrok for the frontend port:
    ```bash
    ngrok http 3000
    ```
2.  Share the generated URL (e.g., `https://xxxx.ngrok-free.app`).

## 🧩 Project Structure
- **/frontend**: React application (Main logic).
- **/frontend/src/supabaseClient.js**: Supabase configuration.
- **/backend**: *Legacy* Python/FastAPI server (No longer required for core functionality).
- **supabase_schema.sql**: Database schema definition.
- **supabase_functions.sql**: Database triggers and functions logic.

## 📝 Features
- **Student Dashboard**: View internships, apply, track status, view notifications.
- **Employer/Staff Dashboard**: Post internships, view applicants, analytics.
- **Faculty Dashboard**: Approve applications, generate certificates.
- **Automated Matching**: Database automatically matches students to internships based on skills.
- **Real-time Notifications**: Alerts for status changes, new applications, and interviews.
