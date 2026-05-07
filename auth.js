const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const fullName = document.getElementById('signup-name').value;
    const role = document.getElementById('signup-role').value;

    if(!email || !password) return alert("Please fill in all fields");

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: role } }
    });

    if (error) {
        alert(error.message);
    } else {
        alert('Registration Successful! Please check your email for a confirmation link (or try logging in if you disabled confirmation).');
        
        // Clear the signup fields
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-name').value = '';
        
        // Automatically switch back to login section
        document.getElementById('signup-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
    }
});

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
    } else {
        const role = data.user.user_metadata.role;
        if (role === 'admin') window.location.href = 'admin.html';
        else if (role === 'vendor') window.location.href = 'vendor.html';
        else window.location.href = 'customer.html';
    }
});

document.getElementById('show-signup').onclick = (e) => {
    e.preventDefault();
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'block';
};

document.getElementById('show-login').onclick = (e) => {
    e.preventDefault();
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
};