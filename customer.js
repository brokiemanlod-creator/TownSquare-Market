const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cart = JSON.parse(localStorage.getItem('ts_cart')) || [];
let selectedItems = [];
let pendingProduct = null;
let pendingCancelId = null;
let pendingDeleteId = null;
let currentOrderTab = 'to-receive';

loadProducts();
updateCartBadge();

function showSection(name) {
    document.getElementById('marketplaceSection').style.display = name === 'marketplace' ? 'block' : 'none';
    document.getElementById('purchasesSection').style.display  = name === 'purchases'    ? 'block' : 'none';
    if (name === 'purchases') loadMyOrders('to-receive');
}

function setOrderTab(btn, status) {
    document.querySelectorAll('#tabGroup button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentOrderTab = status;
    loadMyOrders(status);
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function showModal(id)  { document.getElementById(id).style.display = 'flex'; }

function showNotify(message, type = 'info') {
    const icons = { info: '🔔', success: '✅', error: '❌', warning: '⚠️' };
    document.getElementById('notifyIcon').innerText    = icons[type] || '🔔';
    document.getElementById('notifyTitle').innerText   = type.toUpperCase();
    document.getElementById('notifyMessage').innerText = message;
    showModal('notifyModal');
}

function showLogoutModal() { showModal('logoutModal'); }
async function doLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function loadProducts() {
    const cat = document.getElementById('filterCat').value;
    let q = supabaseClient.from('products').select('*, profiles(store_name)');
    if (cat !== 'all') q = q.eq('category', cat);
    const { data: products } = await q;

    document.getElementById('productGrid').innerHTML = (products || []).map(p => `
        <div class="product-card">
            <img src="${p.image_url}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23e0e0e0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>No Image</text></svg>'">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-vendor">🏪 ${p.profiles?.store_name || 'Vendor'}</div>
                <div class="product-footer">
                    <span class="product-price">$${p.price}</span>
                    <button class="btn btn-primary" style="padding:0.6rem 1.2rem;" onclick='openQtyModal(${JSON.stringify(p)})'>Buy</button>
                </div>
            </div>
        </div>`).join('');
}

function openQtyModal(p) {
    pendingProduct = p;
    document.getElementById('qtyProductName').innerText  = p.name;
    document.getElementById('qtyProductPrice').innerText = `$${p.price}`;
    document.getElementById('qtyProductImage').src       = p.image_url || '';
    document.getElementById('qtyInput').value = '1';
    showModal('quantityModal');
}
function increaseQty() { const i = document.getElementById('qtyInput'); i.value = parseInt(i.value) + 1; }
function decreaseQty() { const i = document.getElementById('qtyInput'); if (parseInt(i.value) > 1) i.value = parseInt(i.value) - 1; }

function confirmAddToCart() {
    if (!pendingProduct) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    const existing = cart.find(i => i.id === pendingProduct.id);
    if (existing) existing.qty += qty;
    else cart.push({ id: pendingProduct.id, name: pendingProduct.name, price: parseFloat(pendingProduct.price), vendorId: pendingProduct.vendor_id, image_url: pendingProduct.image_url, qty });
    saveCart();
    updateCartBadge();
    showNotify(`${pendingProduct.name} added (x${qty})!`, 'success');
    closeModal('quantityModal');
    pendingProduct = null;
}

function confirmBuyNow() {
    if (!pendingProduct) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    selectedItems = [{ id: pendingProduct.id, name: pendingProduct.name, price: parseFloat(pendingProduct.price), vendorId: pendingProduct.vendor_id, image_url: pendingProduct.image_url, qty }];
    closeModal('quantityModal');
    showModal('checkoutModal');
    setTimeout(initMap, 300);
    pendingProduct = null;
}

function saveCart()      { localStorage.setItem('ts_cart', JSON.stringify(cart)); }
function updateCartBadge() {
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const el = document.getElementById('cart-status');
    if (count > 0) { 
        el.style.display = 'block'; 
        document.getElementById('cartCount').innerText = count; 
    }
    else el.style.display = 'none';
}

function showCartModal() {
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:2rem;">Your cart is empty</p>';
        totalEl.innerText = '$0.00';
    } else {
        list.innerHTML = cart.map(item => `
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid #e5e7eb;">
                <img src="${item.image_url}" style="width:80px; height:80px; object-fit:cover; border-radius:10px; flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; color:#1f2937; margin-bottom:0.25rem;">${item.name}</div>
                    <div style="font-size:0.9rem; color:#6b7280;">$${item.price.toFixed(2)} each</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:0.3rem 0.5rem;">
                    <button onclick="changeCartQty('${item.id}',-1)" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:#065f46; font-weight:700; padding:0 4px;">−</button>
                    <span style="width:28px; text-align:center; font-weight:700; color:#065f46;">${item.qty}</span>
                    <button onclick="changeCartQty('${item.id}',1)" style="background:none; border:none; cursor:pointer; font-size:1.1rem; color:#065f46; font-weight:700; padding:0 4px;">+</button>
                </div>
                <div style="text-align:right; min-width:80px;">
                    <div style="font-weight:700; color:#065f46;">$${(item.price * item.qty).toFixed(2)}</div>
                    <button class="delete-btn" onclick="removeCartItem('${item.id}')" style="margin-top:0.25rem; padding:0.35rem 0.6rem;">🗑️</button>
                </div>
            </div>`).join('');
        
        const total = cart.reduce((a,b) => a + b.price * b.qty, 0);
        totalEl.innerText = `$${total.toFixed(2)}`;
    }
    showModal('cartModal');
}

function changeCartQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartBadge();
    showCartModal();
}

function removeCartItem(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartBadge();
    showCartModal();
}

function openCheckout() {
    if (!cart.length) { showNotify('Your cart is empty', 'warning'); return; }
    selectedItems = JSON.parse(JSON.stringify(cart));
    closeModal('cartModal');
    showModal('checkoutModal');
}

function togglePayment() {
    const radios = document.getElementsByName('payType');
    let val = '';
    for (const r of radios) if (r.checked) { val = r.value; break; }

    const show = id => document.getElementById(id).style.display = 'block';
    const hide = id => document.getElementById(id).style.display = 'none';

    hide('paymentDetails');
    ['gcashFields','paymayaFields','cardFields','bankFields'].forEach(hide);

    if (val === 'GCash')        { show('paymentDetails'); show('gcashFields'); }
    if (val === 'PayMaya')      { show('paymentDetails'); show('paymayaFields'); }
    if (val === 'Credit Card')  { show('paymentDetails'); show('cardFields'); }
    if (val === 'Bank Transfer'){ show('paymentDetails'); show('bankFields'); }
}

function getPaymentMethod() {
    for (const r of document.getElementsByName('payType')) if (r.checked) return r.value;
    return 'Cash on Delivery';
}

async function placeOrder() {
    const name  = document.getElementById('checkName').value.trim();
    const phone = document.getElementById('checkPhone').value.trim();
    const addr  = document.getElementById('checkAddr').value.trim();

    if (!name || !phone || !addr) {
        showNotify('Please complete all delivery details.', 'warning');
        return;
    }
    if (!selectedItems.length) { showNotify('No items in order!', 'warning'); return; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { showNotify('Not authenticated', 'error'); return; }

    const total = selectedItems.reduce((a, b) => a + b.price * b.qty, 0);
    const { data: order, error } = await supabaseClient.from('orders').insert([{
        customer_id:     user.id,
        total_amount:    total,
        status:          'to-pay',
        address:         `${name} | ${addr}`,
        phone,
        payment_method:  getPaymentMethod(),
        created_at:      new Date().toISOString()
    }]).select().single();

    if (error) { showNotify('Error placing order: ' + error.message, 'error'); return; }

    const { error: itemErr } = await supabaseClient.from('order_items').insert(
        selectedItems.map(i => ({
            order_id: order.id, product_id: i.id, vendor_id: i.vendorId,
            price_at_purchase: i.price, quantity: i.qty
        }))
    );
    if (itemErr) { showNotify('Error saving items: ' + itemErr.message, 'error'); return; }

    cart = []; saveCart(); updateCartBadge(); selectedItems = [];
    closeModal('checkoutModal');
    showNotify('Order placed! Vendor will review it shortly.', 'success');

    setTimeout(() => { showSection('purchases'); }, 1500);
}

async function loadMyOrders(status) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    let query = supabaseClient
        .from('orders')
        .select('id, total_amount, status, address, phone, payment_method, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

    if (status === 'to-receive') {
        query = query.in('status', ['to-pay', 'to-ship', 'to-receive']);
    } else {
        query = query.eq('status', status);
    }

    const { data: orders } = await query;

    if (!orders || orders.length === 0) {
        document.getElementById('orderList').innerHTML = `
        <div style="text-align:center; padding:3rem; background:#f9fafb; border-radius:16px;">
            <p style="font-size:3rem; margin:0 0 1rem 0;">📭</p>
            <p style="color:#9ca3af; margin:0;">No orders here</p>
        </div>`;
        return;
    }

    const withItems = await Promise.all(orders.map(async o => {
        const { data: items } = await supabaseClient
            .from('order_items')
            .select('quantity, price_at_purchase, products(name, image_url)')
            .eq('order_id', o.id);
        return { ...o, items: items || [] };
    }));

    document.getElementById('orderList').innerHTML = withItems.map(o => {
        const itemNames = o.items.map(i => `${i.products?.name || 'Product'} (x${i.quantity})`).join(', ');
        const date = new Date(o.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
        
        const canCancel = ['to-pay', 'to-ship'].includes(o.status);
        const canConfirmReceipt = o.status === 'to-receive';
        const isCompleted = o.status === 'completed';

        return `
        <div class="order-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 0.5rem 0; color:#1f2937;">Order #${o.id.slice(0,8).toUpperCase()}</h4>
                    <p style="margin:0 0 0.4rem 0; font-size:0.85rem; color:#9ca3af;">📅 ${date}</p>
                    <p style="margin:0 0 0.75rem 0; font-size:0.9rem; color:#6b7280;"><strong>Items:</strong> ${itemNames}</p>
                    <p style="margin:0 0 0.75rem 0; font-weight:700; color:#065f46; font-size:1.2rem;">$${o.total_amount.toFixed(2)}</p>
                    <span class="status-badge status-${o.status}">${o.status.replace(/-/g,' ').toUpperCase()}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.75rem; align-items:flex-end;">
                    ${canCancel ? `<button class="btn btn-danger" onclick="showCancelModal('${o.id}')">❌ Cancel</button>` : ''}
                    ${canConfirmReceipt ? `
                        <button class="btn btn-primary" style="background:#065f46; border:none;" onclick="confirmReceipt('${o.id}')">
                            ✅ Order Received
                        </button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function confirmReceipt(orderId) {
    if (!confirm("Confirm you have received all items in this order?")) return;
    
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

    if (error) {
        showNotify('Error: ' + error.message, 'error');
    } else {
        showNotify('Order completed!', 'success');
        loadMyOrders(currentOrderTab);
    }
}

function showCancelModal(id) { pendingCancelId = id; showModal('cancelModal'); }
async function doCancelOrder() {
    if (!pendingCancelId) return;
    const { error } = await supabaseClient.from('orders').update({ status: 'cancelled' }).eq('id', pendingCancelId);
    if (error) { showNotify('Error cancelling order', 'error'); return; }
    showNotify('Order cancelled', 'success');
    closeModal('cancelModal');
    loadMyOrders(currentOrderTab);
    pendingCancelId = null;
}

function showDeleteModal(id) { pendingDeleteId = id; showModal('deleteModal'); }
async function doDeleteOrder() {
    if (!pendingDeleteId) return;
    await supabaseClient.from('order_items').delete().eq('order_id', pendingDeleteId);
    const { error } = await supabaseClient.from('orders').delete().eq('id', pendingDeleteId);
    if (error) { showNotify('Error deleting order', 'error'); return; }
    showNotify('Order deleted', 'success');
    closeModal('deleteModal');
    loadMyOrders('cancelled');
    pendingDeleteId = null;
}