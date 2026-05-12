const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentOrderFilter = 'pending';

async function init() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.user_metadata.role !== 'vendor') {
        window.location.href = 'index.html'; return;
    }
    loadProfile(user.id);
    loadStats(user.id);
    loadInventory(user.id);
}

async function loadProfile(userId) {
    const { data: p } = await supabaseClient.from('profiles').select('store_name, full_name').eq('id', userId).single();
    document.getElementById('vendorWelcome').innerText = `🏪 ${p?.store_name || p?.full_name || 'Vendor'} — Dashboard`;
}

async function loadStats(userId) {
    const { data: products } = await supabaseClient.from('products').select('id').eq('vendor_id', userId);
    const { data: items } = await supabaseClient.from('order_items').select('price_at_purchase, quantity').eq('vendor_id', userId);
    document.getElementById('activeItems').innerText = products?.length || 0;
    document.getElementById('totalOrders').innerText = items?.length || 0;
    const rev = items?.reduce((s, i) => s + (i.price_at_purchase * i.quantity), 0) || 0;
    document.getElementById('totalRevenue').innerText = `$${rev.toFixed(2)}`;
}

function switchTab(tab, btn) {
    document.querySelectorAll('[id$="Tab"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').style.display = 'block';
    btn.classList.add('active');

    if (tab === 'orders') {
        filterOrders('pending', document.getElementById('pendingBtn'));
    }
    if (tab === 'reviews') loadReviews();
}

async function filterOrders(filter, btn) {
    currentOrderFilter = filter;
    document.querySelectorAll('#ordersTab .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    await loadOrders(filter);
}

async function loadOrders(filter) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: items } = await supabaseClient.from('order_items').select('order_id, quantity, price_at_purchase, products(name, image_url)').eq('vendor_id', user.id);

    if (!items || items.length === 0) {
        document.getElementById('vendorOrders').innerHTML = emptyState('No orders found');
        return;
    }

    const orderIds = [...new Set(items.map(i => i.order_id))];
    let query = supabaseClient.from('orders').select('id, status, total_amount, address, phone, payment_method, created_at').in('id', orderIds);

    if (filter === 'pending') {
        query = query.or('status.eq.to-pay,status.eq.to-ship');
    } else if (filter === 'rejected') {
        query = query.eq('status', 'cancelled');
    } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
    }

    const { data: orders } = await query.order('created_at', { ascending: false });

    if (!orders || orders.length === 0) {
        document.getElementById('vendorOrders').innerHTML = emptyState(`No ${filter} orders`);
        return;
    }

    document.getElementById('vendorOrders').innerHTML = orders.map(o => {
        const myItems = items.filter(i => i.order_id === o.id);
        const canAct = ['to-pay', 'to-ship'].includes(o.status);

        return `
        <div class="order-card">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h4>Order #${o.id.slice(0,8).toUpperCase()}</h4>
                    <p>📍 ${o.address}</p>
                    <p>📞 ${o.phone}</p>
                    <p style="font-weight:700; color:#065f46;">$${o.total_amount.toFixed(2)}</p>
                </div>
                <span class="status-badge status-${o.status}">${o.status.replace(/-/g, ' ').toUpperCase()}</span>
            </div>
            <table class="order-items-table" style="margin-top:1rem; width:100%;">
                ${myItems.map(i => `<tr><td>${i.products?.name || 'Product'}</td><td style="text-align:right;">x${i.quantity}</td></tr>`).join('')}
            </table>
            ${canAct ? `
            <div style="display:flex; gap:10px; margin-top:1.25rem;">
                <button class="btn btn-danger" style="flex:1;" onclick="rejectOrder('${o.id}')">❌ Reject</button>
                <button class="btn btn-primary" style="flex:1;" onclick="approveOrder('${o.id}')">✅ Approve</button>
            </div>` : ''}
        </div>`;
    }).join('');
}

async function approveOrder(orderId) {
    const { error } = await supabaseClient.from('orders').update({ status: 'to-receive' }).eq('id', orderId);
    if (error) showNotify('Error: ' + error.message, 'error');
    else {
        showNotify('Order approved successfully!', 'success');
        loadOrders(currentOrderFilter);
    }
}

async function rejectOrder(orderId) {
    const { error } = await supabaseClient.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    if (error) showNotify('Error: ' + error.message, 'error');
    else {
        showNotify('Order rejected.', 'success');
        loadOrders(currentOrderFilter);
    }
}

function emptyState(msg) {
    return `<div style="text-align:center; padding:4rem 2rem; background:#f9fafb; border-radius:16px;"><p style="font-size:3rem; margin:0 0 1rem 0;">📭</p><p style="color:#9ca3af;">${msg}</p></div>`;
}

function showNotify(message, type = 'info') {
    const icons = { info:'🔔', success:'✅', error:'❌', warning:'⚠️' };
    document.getElementById('notifyIcon').innerText = icons[type] || '🔔';
    document.getElementById('notifyTitle').innerText = type.toUpperCase();
    document.getElementById('notifyMessage').innerText = message;
    showModal('notifyModal');
}

function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function loadInventory(userId) {
    if (!userId) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id;
    }
    const { data: products } = await supabaseClient.from('products').select('*').eq('vendor_id', userId);
    if (!products || products.length === 0) {
        document.getElementById('vendorInventory').innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;"><p>No products yet.</p></div>`;
        return;
    }
    document.getElementById('vendorInventory').innerHTML = products.map(p => `
        <div class="product-item">
            <img src="${p.image_url}" onerror="this.style.background='#f3f4f6'">
            <div style="padding:1rem;">
                <div style="font-weight:600;">${p.name}</div>
                <div style="color:#065f46; font-weight:700;">$${p.price}</div>
                <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="deleteProduct('${p.id}')">🗑️ Remove</button>
            </div>
        </div>`).join('');
}

document.getElementById('addProductForm').addEventListener('submit', async e => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const file = document.getElementById('pImage').files[0];
    if (!file) return;
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    await supabaseClient.storage.from('product-images').upload(fileName, file);
    const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
    await supabaseClient.from('products').insert([{
        name: document.getElementById('pName').value,
        price: parseFloat(document.getElementById('pPrice').value),
        category: document.getElementById('pCategory').value,
        image_url: urlData.publicUrl,
        vendor_id: user.id
    }]);
    loadInventory(user.id);
});

async function deleteProduct(productId) {
    if (!confirm('Delete?')) return;
    await supabaseClient.from('products').delete().eq('id', productId);
    const { data: { user } } = await supabaseClient.auth.getUser();
    loadInventory(user.id);
}

async function loadReviews() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: revs } = await supabaseClient.from('reviews').select('*, products(name)').eq('vendor_id', user.id);
    document.getElementById('reviewSection').innerHTML = revs?.length ? revs.map(r => `
        <div class="order-card">
            <p><strong>${r.products?.name}</strong>: ${r.rating} stars</p>
            <p>"${r.comment || ''}"</p>
            <textarea id="reply-${r.id}" class="input">${r.vendor_reply || ''}</textarea>
            <button class="btn btn-primary" onclick="sendReply('${r.id}')">Reply</button>
        </div>`).join('') : `<p style="text-align:center; padding:3rem; color:#9ca3af;">No reviews yet.</p>`;
}

async function sendReply(id) {
    const val = document.getElementById(`reply-${id}`).value;
    await supabaseClient.from('reviews').update({ vendor_reply: val }).eq('id', id);
    showNotify('Reply saved', 'success');
}

function showLogoutModal() { showModal('logoutModal'); }
function closeLogoutModal() { closeModal('logoutModal'); }

async function confirmLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

function showMessages() {
    showModal('messagesModal');
}

function sendMessage() {
    showNotify('Message feature coming soon', 'info');
}

init();