-- Matching Function
CREATE OR REPLACE FUNCTION get_matched_students(target_internship_id uuid)
RETURNS TABLE (
  student_id uuid,
  name text,
  email text,
  match_score float,
  matching_skills text[]
) AS $$
DECLARE
  req_skills text[];
  target_dept text;
BEGIN
  -- Get internship details
  SELECT skills_required, department INTO req_skills, target_dept
  FROM public.internships WHERE id = target_internship_id;

  -- Default to empty array if null
  IF req_skills IS NULL THEN
    req_skills := '{}';
  END IF;

  RETURN QUERY
  SELECT 
    sp.user_id as student_id,
    p.name,
    p.email,
    (
      CASE 
        WHEN array_length(req_skills, 1) IS NULL OR array_length(req_skills, 1) = 0 THEN 0
        ELSE
          (
            (array_length(
              ARRAY(
                SELECT UNNEST(sp.skills) 
                INTERSECT 
                SELECT UNNEST(req_skills)
              ), 1
            )::float / array_length(req_skills, 1)::float) * 100
          )
      END
      + 
      CASE WHEN p.department = target_dept THEN 10 ELSE 0 END
    )::float as match_score,
    ARRAY(
        SELECT UNNEST(sp.skills) 
        INTERSECT 
        SELECT UNNEST(req_skills)
    ) as matching_skills
  FROM public.student_profiles sp
  JOIN public.profiles p ON p.id = sp.user_id
  WHERE p.role = 'student'
  -- Filter by match score >= 30
  AND (
      CASE 
        WHEN array_length(req_skills, 1) IS NULL OR array_length(req_skills, 1) = 0 THEN 0
        ELSE
          (
            (array_length(
              ARRAY(
                SELECT UNNEST(sp.skills) 
                INTERSECT 
                SELECT UNNEST(req_skills)
              ), 1
            )::float / array_length(req_skills, 1)::float) * 100
          )
      END
      + 
      CASE WHEN p.department = target_dept THEN 10 ELSE 0 END
  ) >= 30
  ORDER BY match_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify Staff on New Application
CREATE OR REPLACE FUNCTION notify_staff_new_application()
RETURNS TRIGGER AS $$
DECLARE
  internship_title text;
  company_name text;
BEGIN
  SELECT title, company INTO internship_title, company_name FROM public.internships WHERE id = NEW.internship_id;

  INSERT INTO public.notifications (user_id, message, type, created_at)
  SELECT id, 'New application for ' || internship_title || ' at ' || company_name, 'new_application', now()
  FROM public.profiles
  WHERE role = 'placement_staff';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_created ON public.applications;
CREATE TRIGGER on_application_created
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION notify_staff_new_application();

-- Trigger: Notify Student on Application Status Change
CREATE OR REPLACE FUNCTION notify_student_application_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type, created_at)
  VALUES (NEW.student_id, 'Your application status has been updated to ' || NEW.status, 'application_status', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_status_change ON public.applications;
CREATE TRIGGER on_application_status_change
AFTER UPDATE OF status ON public.applications
FOR EACH ROW 
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_student_application_status();

-- Trigger: Notify Student on Interview Scheduled
CREATE OR REPLACE FUNCTION notify_student_interview()
RETURNS TRIGGER AS $$
DECLARE
    app_student_id uuid;
    scheduled_time text;
BEGIN
    SELECT student_id INTO app_student_id FROM public.applications WHERE id = NEW.application_id;
    scheduled_time := to_char(NEW.scheduled_at, 'YYYY-MM-DD HH24:MI');

    INSERT INTO public.notifications (user_id, message, type, created_at)
    VALUES (app_student_id, 'Interview scheduled for ' || scheduled_time, 'interview_scheduled', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_interview_created ON public.interviews;
CREATE TRIGGER on_interview_created
AFTER INSERT ON public.interviews
FOR EACH ROW EXECUTE FUNCTION notify_student_interview();

-- Trigger: Notify Student on Certificate Generated
CREATE OR REPLACE FUNCTION notify_student_certificate()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, message, type, created_at)
    VALUES (NEW.student_id, 'Your internship certificate has been generated and is ready for download', 'certificate_generated', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_certificate_generated ON public.certificates;
CREATE TRIGGER on_certificate_generated
AFTER INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION notify_student_certificate();
