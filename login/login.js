// login.js - Bitminded Login & Sign Up Authentication

// Supabase client setup
const SUPABASE_URL = 'https://jkikrzxzpyfjseirsqxb.supabase.co'; // Set your Supabase project URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWtyenh6cHlmanNlaXJzcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDk2MjUsImV4cCI6MjA3MzkyNTYyNX0.6Nb08-tnLHNzUCR2S8zb4Nv4hCj1rCTcqlOJebvrrps'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // Form switcher logic
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showLoginBtn = document.getElementById('show-login');
    const showSignupBtn = document.getElementById('show-signup');
    const authMessage = document.getElementById('auth-message');

    function showLogin() {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        showLoginBtn.classList.add('active');
        showSignupBtn.classList.remove('active');
        authMessage.textContent = '';
    }
    function showSignup() {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        showSignupBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        authMessage.textContent = '';
    }
    showLoginBtn.addEventListener('click', showLogin);
    showSignupBtn.addEventListener('click', showSignup);

    // Show correct form if ?signup=true in URL
    if (window.location.search.includes('signup=true')) {
        showSignup();
    } else {
        showLogin();
    }

    // Login logic (email + password)
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        authMessage.textContent = '';
        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) {
                authMessage.textContent = loginError.message;
                authMessage.style.color = 'red';
            } else {
                authMessage.textContent = 'Login successful!';
                authMessage.style.color = 'green';
                setTimeout(function() {
                    window.location.href = '../index.html';
                }, 1000);
            }
        } catch (err) {
            authMessage.textContent = 'Unexpected error. Please try again.';
            authMessage.style.color = 'red';
        }
    });

    // Sign Up logic
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        authMessage.textContent = '';
        if (password !== confirm) {
            authMessage.textContent = 'Passwords do not match.';
            authMessage.style.color = 'red';
            return;
        }
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            });
            if (error) {
                authMessage.textContent = error.message;
                authMessage.style.color = 'red';
            } else {
                authMessage.textContent = 'Sign up successful! Please check your email to verify your account.';
                authMessage.style.color = 'green';
                showLogin();
            }
        } catch (err) {
            authMessage.textContent = 'Unexpected error. Please try again.';
            authMessage.style.color = 'red';
        }
    });
});
