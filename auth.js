const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3Q2CdkwYf8MT8DV8dzdKww_pDZ9HlFU';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const fullName = document.getElementById('signup-name').value;
    const role = document.getElementById('signup-role').value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: role } }
    });

    if (error) alert(error.message);
    else alert('Success! You can now sign in.');
});

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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