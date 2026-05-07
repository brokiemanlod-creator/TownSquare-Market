const supabaseUrl = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const supabaseKey = 'sb_publishable_3Q2CdkwYf8MT8DV8dzdKww_pDZ9HlFU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata.role !== 'admin') {
        window.location.href = 'index.html';
    }
}

async function loadDashboard() {
    const { count: vCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor');
    const { data: orders } = await supabase.from('orders').select('total_amount');
    document.getElementById('totalVendors').innerText = vCount || 0;
    document.getElementById('totalOrders').innerText = orders?.length || 0;
    const revenue = orders?.reduce((a, b) => a + Number(b.total_amount), 0) || 0;
    document.getElementById('totalRevenue').innerText = `$${revenue.toFixed(2)}`;
    const { data: products } = await supabase.from('products').select('*');
    const list = document.getElementById('adminProductList');
    list.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.vendor_id.substring(0,8)}...</td>
            <td>$${p.price}</td>
            <td><button class="btn btn-danger" style="padding: 5px 10px;" onclick="deleteProduct('${p.id}')">Delete</button></td>
        </tr>
    `).join('');
}

async function deleteProduct(id) {
    if(confirm("Are you sure?")) {
        await supabase.from('products').delete().eq('id', id);
        loadDashboard();
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

checkAdmin();
loadDashboard();