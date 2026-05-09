const supabaseUrl = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 1. Security Check: Ensure only Admins stay on this page
async function checkAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.user_metadata.role !== 'admin') {
        window.location.href = 'index.html';
    }
}

// 2. Combined Dashboard and Analytics Loader
async function loadDashboard() {
    try {
        // Fetch Active Vendor Count
        const { count: vCount } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'vendor');

        // Fetch Total Platform Sales/Orders
        const { data: orders, error: orderError } = await supabaseClient
            .from('orders')
            .select('total_amount');

        // Fetch Global Inventory
        const { data: products, error: productError } = await supabaseClient
            .from('products')
            .select('*');

        if (orderError || productError) throw new Error("Data fetching failed");

        // --- Update Analytics Cards ---
        document.getElementById('totalVendors').innerText = vCount || 0;
        document.getElementById('totalOrders').innerText = orders?.length || 0;
        
        const revenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        document.getElementById('totalRevenue').innerText = `$${revenue.toFixed(2)}`;

        // --- Update Product Oversight List ---
        const list = document.getElementById('adminProductList');
        if (products && products.length > 0) {
            list.innerHTML = products.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td><small>${p.vendor_id.substring(0,8)}...</small></td>
                    <td>$${p.price}</td>
                    <td>
                        <button class="btn btn-danger" 
                                style="padding: 5px 10px; font-size: 0.8rem;" 
                                onclick="deleteProduct('${p.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = `<tr><td colspan="4" style="text-align:center">No products found.</td></tr>`;
        }

    } catch (err) {
        console.error("Dashboard error:", err.message);
    }
}

// 3. Product Management Logic
async function deleteProduct(id) {
    if (confirm("Are you sure you want to remove this product from the marketplace?")) {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error deleting product: " + error.message);
        } else {
            loadDashboard(); // Refresh stats and list
        }
    }
}

// 4. Authentication Logic
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// Initialize Page
checkAdmin();
loadDashboard();