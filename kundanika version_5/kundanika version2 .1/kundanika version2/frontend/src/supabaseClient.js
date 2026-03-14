
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xsuebggchpfycqfxesvk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdWViZ2djaHBmeWNxZnhlc3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODY4NTgsImV4cCI6MjA4NjQ2Mjg1OH0.grtaBESSyOVyqQ_7W5leohCGVS4_a6ZxRA9Qfz9z4Ns'

export const supabase = createClient(supabaseUrl, supabaseKey)
