const supabaseUrl = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.user_metadata.role !== 'admin') {
        window.location.href = 'index.html';
    }
}

async function loadDashboard() {
    const { count: vCount } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor');
    const { data: orders } = await supabaseClient.from('orders').select('total_amount');
    document.getElementById('totalVendors').innerText = vCount || 0;
    document.getElementById('totalOrders').innerText = orders?.length || 0;
    const revenue = orders?.reduce((a, b) => a + Number(b.total_amount), 0) || 0;
    document.getElementById('totalRevenue').innerText = `$${revenue.toFixed(2)}`;
    const { data: products } = await supabaseClient.from('products').select('*');
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
        await supabaseClient.from('products').delete().eq('id', id);
        loadDashboard();
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

checkAdmin();
loadDashboard();