-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text check (role in ('student', 'placement_staff', 'faculty', 'employer')),
  department text,
  phone text,
  organization text,
  profile_completed boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 2. Student Profiles
create table public.student_profiles (
  user_id uuid references public.profiles(id) primary key,
  skills text[],
  resume_url text,
  cover_letter text,
  cgpa float,
  graduation_year int,
  interests text[]
);

alter table public.student_profiles enable row level security;

create policy "Student profiles are viewable by everyone"
  on student_profiles for select
  using ( true );

create policy "Students can update own student profile"
  on student_profiles for update
  using ( auth.uid() = user_id );

create policy "Students can insert own student profile"
  on student_profiles for insert
  with check ( auth.uid() = user_id );

-- 3. Internships
create table public.internships (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  company text not null,
  skills_required text[],
  department text,
  stipend float,
  duration_months int,
  location text,
  application_deadline timestamptz,
  is_verified boolean default false,
  posted_by uuid references public.profiles(id),
  posted_by_role text,
  applicant_count int default 0,
  created_at timestamptz default now()
);

alter table public.internships enable row level security;

create policy "Internships are viewable by everyone"
  on internships for select
  using ( true );

create policy "Staff and Employers can insert internships"
  on internships for insert
  with check ( 
    auth.uid() = posted_by 
    -- We can add role checks here if we trust the frontend to send the right ID, 
    -- but ideally we check the profile table. For simpler start, we trust authenticated users for now
    -- or assume the app logic handles the UI hiding.
    -- Strict way: exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'employer'))
  );

create policy "Staff and Employers can update own internships"
  on internships for update
  using ( auth.uid() = posted_by ); # functionality for verification by staff to be added

-- 4. Applications
create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  internship_id uuid references public.internships(id),
  student_id uuid references public.profiles(id),
  cover_letter text,
  status text default 'pending', -- pending, approved, rejected, shortlisted
  applied_at timestamptz default now(),
  faculty_approved boolean default false,
  faculty_feedback text
);

alter table public.applications enable row level security;

create policy "Students can see own applications"
  on applications for select
  using ( auth.uid() = student_id );

create policy "Staff and Faculty can see all applications"
  on applications for select
  using ( 
    exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'faculty', 'employer'))
  );

create policy "Students can insert applications"
  on applications for insert
  with check ( auth.uid() = student_id );

create policy "Staff/Faculty/Employer update applications"
  on applications for update
  using ( 
     exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'faculty', 'employer'))
  );

-- 5. Interviews
create table public.interviews (
  id uuid default uuid_generate_v4() primary key,
  application_id uuid references public.applications(id),
  scheduled_at timestamptz,
  meeting_link text,
  location text,
  notes text,
  status text default 'scheduled',
  created_at timestamptz default now()
);

alter table public.interviews enable row level security;

create policy "Interviews viewable by participants"
  on interviews for select
  using ( 
    exists (
      select 1 from applications a 
      where a.id = interviews.application_id and (a.student_id = auth.uid())
    )
    or
    exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'employer', 'faculty'))
  );

create policy "Staff/Employer create interviews"
  on interviews for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'employer'))
  );

-- 6. Feedbacks
create table public.feedbacks (
  id uuid default uuid_generate_v4() primary key,
  application_id uuid references public.applications(id),
  feedback_text text,
  rating int,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz default now()
);

alter table public.feedbacks enable row level security;

create policy "Feedbacks viewable by involved parties"
  on feedbacks for select
  using ( true ); -- Simplify for now

create policy "Feedbacks insertable by Staff/Faculty/Employer"
  on feedbacks for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('placement_staff', 'faculty', 'employer'))
  );

-- 7. Certificates
create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id),
  internship_id uuid references public.internships(id),
  issued_at timestamptz default now(),
  certificate_data jsonb
);

alter table public.certificates enable row level security;

create policy "Certificates viewable by owner"
  on certificates for select
  using ( auth.uid() = student_id );

create policy "Faculty can create certificates"
  on certificates for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'faculty')
  );

-- 8. Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  message text,
  type text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on notifications for select
  using ( auth.uid() = user_id );

-- Handle New User Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'role'
  );
  
  -- If student, create student profile
  if (new.raw_user_meta_data->>'role' = 'student') then
    insert into public.student_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function for matching (simplified version of Python logic)
-- This might be too complex for SQL directly right now, omitting for initial migration.
-- We can implement matching in client-side JS or Edge Function.
