
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the values from the file we viewed earlier or environment
const supabaseUrl = 'https://xsuebggchpfycqfxesvk.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdWViZ2djaHBmeWNxZnhlc3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODY4NTgsImV4cCI6MjA4NjQ2Mjg1OH0.grtaBESSyOVyqQ_7W5leohCGVS4_a6ZxRA9Qfz9z4Ns';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    const email = `test_user_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`1. Attempting Signup for ${email}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (signUpError) {
        console.error('Signup Failed:', signUpError);
        return;
    }
    console.log('Signup Successful:', signUpData.user ? 'User Created' : 'No User Returned (Unexpected)');

    if (signUpData.user && !signUpData.session) {
        console.warn('WARNING: User created but NO SESSION returned. This usually means "Confirm Email" is still ENABLED.');
    } else {
        console.log('Signup Session Active. Signing out now to test fresh login...');
        await supabase.auth.signOut();
        console.log('Signed out.');
    }

    console.log('2. Attempting Login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) {
        console.error('Login Failed:', signInError);
        if (signInError.message.includes('Email not confirmed')) {
            console.log('\nDIAGNOSIS: You successfully fixed the "Provider Disabled" error, but "Confirm Email" is still ON.');
        }
    } else {
        console.log('Login Successful! Session received.');
    }
}

testAuth();
