async function registerUser(email, password, selectedRole) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: selectedRole }
        }
    });

    if (data.user) {
        await supabase.from('profiles').insert([{
            id: data.user.id,
            email: email,
            role: selectedRole
        }]);
    }
}