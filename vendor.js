const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkVendor() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.user_metadata.role !== 'vendor') {
        window.location.href = 'index.html';
    } else {
        loadShopDetails(user.id);
    }
}

async function loadShopDetails(userId) {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (profile && profile.store_name) {
        document.getElementById('vendorWelcome').innerText = `Managing: ${profile.store_name}`;
    }
}

async function updateShopName() {
    const name = prompt("Enter your Shop Name:");
    if (!name) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('profiles').update({ store_name: name }).eq('id', user.id);
    location.reload();
}

async function loadVendorInventory() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: products } = await supabaseClient.from('products').select('*').eq('vendor_id', user.id);
    
    document.getElementById('activeItems').innerText = products?.length || 0;
    const inventoryGrid = document.getElementById('vendorInventory');
    inventoryGrid.innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.image_url}" class="product-img">
            <h4>${p.name}</h4>
            <p style="color: var(--accent); font-weight: 700;">$${p.price}</p>
            <button class="btn btn-danger" style="margin-top: 10px; padding: 5px;" onclick="deleteItem('${p.id}')">Remove</button>
        </div>
    `).join('');
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const file = document.getElementById('pImage').files[0];
    const fileName = `${user.id}/${Date.now()}_${file.name}`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('product-images')
        .upload(fileName, file);

    if (uploadError) return alert("Upload failed! Check Storage Policies.");

    const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);

    await supabaseClient.from('products').insert([{
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        category: document.getElementById('pCategory').value,
        image_url: urlData.publicUrl,
        vendor_id: user.id
    }]);

    alert("Product Added!");
    document.getElementById('addProductForm').reset();
    loadVendorInventory();
});

async function deleteItem(id) {
    if (confirm("Delete product?")) {
        await supabaseClient.from('products').delete().eq('id', id);
        loadVendorInventory();
    }
}

function showLogoutModal() { document.getElementById('logoutModal').style.display = 'flex'; }
function closeLogoutModal() { document.getElementById('logoutModal').style.display = 'none'; }
async function confirmLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

checkVendor();
loadVendorInventory();

function showMessages() {
    document.getElementById('messagesModal').style.display = 'flex';
    // TODO: Load messages
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;
    // TODO: Send message
    input.value = '';
}