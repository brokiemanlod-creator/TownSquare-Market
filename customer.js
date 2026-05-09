const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cart = JSON.parse(localStorage.getItem('townsquare_cart')) || [];
let selectedItems = [];
let savedProfiles = JSON.parse(localStorage.getItem('user_profiles')) || [];
let currentItemForQty = null;
let map, marker;

// --- Tab & Navigation Management ---
function showTab(tab) {
    document.getElementById('marketplaceSection').style.display = tab === 'marketplace' ? 'block' : 'none';
    document.getElementById('purchasesSection').style.display = tab === 'purchases' ? 'block' : 'none';
    if(tab === 'purchases') loadMyOrders('to-pay');
}

function setActiveTab(btn, status) {
    document.querySelectorAll('#tabGroup button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadMyOrders(status);
}

// --- Notifications & Modals ---
function showNotify(message, type = 'info') {
    const icons = { info: '🔔', success: '✅', error: '❌', warning: '⚠️' };
    const titles = { info: 'Notice', success: 'Success', error: 'Error', warning: 'Warning' };
    document.getElementById('notifyIcon').innerText = icons[type] || icons.info;
    document.getElementById('notifyTitle').innerText = titles[type] || titles.info;
    document.getElementById('notifyMessage').innerText = message;
    document.getElementById('notifyModal').style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function confirmLogout() { 
    supabaseClient.auth.signOut().then(() => window.location.href = 'index.html');
}

// --- Marketplace & Product Loading ---
async function loadProducts() {
    const cat = document.getElementById('filterCat').value;
    let query = supabaseClient.from('products').select('*, profiles(store_name)');
    if (cat !== 'all') query = query.eq('category', cat);
    const { data: products } = await query;
    document.getElementById('productGrid').innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.image_url}" class="product-img">
            <h3 style="margin: 0 0 4px 0; font-size: 1.1rem;">${p.name}</h3>
            <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 12px;">${p.profiles?.store_name || 'Local Shop'}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                <span class="price">$${p.price}</span>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-accent" style="padding: 0.5rem 1rem;" onclick="buyNowPrompt('${p.id}',${p.price},'${p.vendor_id}','${p.name}','${p.image_url}')">Buy</button>
                    <button class="btn btn-outline" style="padding: 0.5rem 0.8rem;" onclick="openQtyPrompt('${p.id}',${p.price},'${p.vendor_id}','${p.name}','${p.image_url}')">🛒</button>
                </div>
            </div>
        </div>`).join('');
}

// --- Cart & Quantity Logic ---
function openQtyPrompt(id, price, vId, name, img, mode = 'cart') {
    currentItemForQty = { id, price, vendorId: vId, name, image_url: img, qty: 1 };
    document.getElementById('qtyModalTitle').innerText = name;
    document.getElementById('qtyModalPrice').innerText = `$${price}`;
    document.getElementById('promptQtyInput').value = "1";
    const confirmBtn = document.getElementById('qtyConfirmBtn');
    confirmBtn.onclick = mode === 'cart' ? confirmAddToCart : confirmBuyNow;
    confirmBtn.innerText = mode === 'cart' ? 'Add to Cart' : 'Proceed to Checkout';
    document.getElementById('qtyModal').style.display = 'flex';
}

function syncPromptQty(val) {
    let q = parseInt(val) || 1;
    if (q < 1) q = 1;
    currentItemForQty.qty = q;
}

function changePromptQty(delta) {
    const input = document.getElementById('promptQtyInput');
    let q = parseInt(input.value) || 1;
    q = Math.max(1, q + delta);
    input.value = q;
    currentItemForQty.qty = q;
}

function confirmAddToCart() {
    const existing = cart.find(i => i.id === currentItemForQty.id);
    if (existing) existing.qty += currentItemForQty.qty;
    else cart.push({...currentItemForQty});
    saveCart(); updateCartUI(); closeModal('qtyModal');
    showNotify(`${currentItemForQty.name} added to cart.`, 'success');
}

function buyNowPrompt(id, price, vId, name, img) { openQtyPrompt(id, price, vId, name, img, 'buy'); }
function confirmBuyNow() { selectedItems = [{...currentItemForQty}]; closeModal('qtyModal'); showCheckoutModal(); }

function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) return removeFromCart(id);
        saveCart(); updateCartUI(); showCartItems();
    }
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    selectedItems = selectedItems.filter(i => i.id !== id);
    saveCart(); updateCartUI(); 
    if(cart.length === 0) closeModal('viewCartModal'); else showCartItems();
}

function showCartItems() {
    if (cart.length === 0) return;
    const list = document.getElementById('cartItemsList');
    list.innerHTML = cart.map(item => `
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem;">
            <input type="checkbox" name="cartItemCheck" ${selectedItems.some(si => si.id === item.id) ? 'checked' : ''} data-item='${JSON.stringify(item)}' onchange="updateSingleSelection(this)" style="width: 20px; height: 20px;">
            <img src="${item.image_url}" style="width: 64px; height: 64px; border-radius: 12px; object-fit: cover;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; font-weight: 700;">${item.name}</h4>
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="qty-btn" style="width:28px; height:28px; font-size: 1rem;" onclick="updateQty('${item.id}', -1)">−</button>
                    <span style="font-weight: 800; font-size: 1.1rem;">${item.qty}</span>
                    <button class="qty-btn" style="width:28px; height:28px; font-size: 1rem;" onclick="updateQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">$${(item.price * item.qty).toFixed(2)}</div>
                <button onclick="removeFromCart('${item.id}')" style="color:var(--danger); border:none; background:none; cursor:pointer; font-size: 0.85rem; font-weight: 600; margin-top: 4px;">Remove</button>
            </div>
        </div>`).join('');
    calculateCartTotal();
    document.getElementById('viewCartModal').style.display = 'flex';
}

function toggleSelectAll(source) {
    const checkboxes = document.getElementsByName('cartItemCheck');
    selectedItems = [];
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        if(source.checked) selectedItems.push(JSON.parse(cb.getAttribute('data-item')));
    });
    calculateCartTotal();
}

function updateSingleSelection(checkbox) {
    const item = JSON.parse(checkbox.getAttribute('data-item'));
    if(checkbox.checked) selectedItems.push(item);
    else {
        selectedItems = selectedItems.filter(i => i.id !== item.id);
        document.getElementById('selectAllCart').checked = false;
    }
    calculateCartTotal();
}

function calculateCartTotal() {
    const total = selectedItems.reduce((a, b) => a + (b.price * b.qty), 0);
    document.getElementById('cartTotalDisplay').innerText = `$${total.toFixed(2)}`;
}

function openCheckoutFromCart() {
    if(selectedItems.length === 0) return showNotify("Please select items to checkout.", "warning");
    closeModal('viewCartModal');
    showCheckoutModal();
}

// --- Profile & Checkout Management ---
function saveCurrentProfile() {
    const name = document.getElementById('fullname').value, phone = document.getElementById('phone').value, addr = document.getElementById('addr').value;
    if (!name || !phone || !addr) return showNotify("Please fill all fields.", "warning");
    const existingIdx = savedProfiles.findIndex(p => p.name === name);
    if (existingIdx > -1) savedProfiles[existingIdx] = { name, phone, addr };
    else { if (savedProfiles.length >= 3) savedProfiles.shift(); savedProfiles.push({ name, phone, addr }); }
    localStorage.setItem('user_profiles', JSON.stringify(savedProfiles));
    updateProfileDropdown(); showNotify("Address profile updated.", "success");
}

function updateProfileDropdown() {
    const select = document.getElementById('profileDropdown');
    select.innerHTML = '<option value="">-- Choose a Profile --</option>' + 
        savedProfiles.map((p, i) => `<option value="${i}">${p.name} (${p.phone})</option>`).join('');
}

function loadProfileFromDropdown(idx) {
    if (idx === "") {
        document.getElementById('fullname').value = "";
        document.getElementById('phone').value = "";
        document.getElementById('addr').value = "";
        return;
    }
    const p = savedProfiles[idx];
    document.getElementById('fullname').value = p.name;
    document.getElementById('phone').value = p.phone;
    document.getElementById('addr').value = p.addr;
}

function showCheckoutModal() { document.getElementById('checkoutModal').style.display = 'flex'; updateProfileDropdown(); setTimeout(initMap, 300); }

function initMap() {
    if (!map) {
        map = L.map('map-container').setView([18.196, 120.592], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        map.on('click', e => { if (marker) map.removeLayer(marker); marker = L.marker(e.latlng).addTo(map); });
    } else map.invalidateSize();
}

function locateUser() {
    navigator.geolocation.getCurrentPosition(p => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 16); if (marker) map.removeLayer(marker); marker = L.marker(ll).addTo(map);
    });
}

async function processOrder() {
    const name = document.getElementById('fullname').value, phone = document.getElementById('phone').value, addr = document.getElementById('addr').value;
    if (!name || !phone || !addr || !marker) { showNotify("Complete delivery details and pin location.", "warning"); return; }
    const { data: { user } } = await supabaseClient.auth.getUser();
    const pay = document.querySelector('input[name="payType"]:checked').value;
    const totalAmount = selectedItems.reduce((a,b)=>a+(b.price*b.qty),0);
    
    const { data: order, error } = await supabaseClient.from('orders').insert([{
        customer_id: user.id, total_amount: totalAmount, status: 'to-pay', address: `${name} | ${addr}`, phone, payment_method: pay, location_coords: `${marker.getLatLng().lat},${marker.getLatLng().lng}`
    }]).select().single();
    
    if(error) return showNotify(error.message, "error");
    
    await supabaseClient.from('order_items').insert(selectedItems.map(i => ({
        order_id: order.id, product_id: i.id, vendor_id: i.vendorId, price_at_purchase: i.price, quantity: i.qty
    })));
    
    cart = cart.filter(ci => !selectedItems.some(si => si.id === ci.id));
    saveCart(); updateCartUI(); closeModal('checkoutModal'); showTab('purchases');
    showNotify("Order placed successfully!", "success");
}

// --- Orders Viewing Logic ---
async function loadMyOrders(status) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { data: orders, error } = await supabaseClient.from('orders')
        .select(`
            *,
            order_items (
                quantity,
                price_at_purchase,
                products (
                    name,
                    profiles (store_name)
                )
            )
        `)
        .eq('customer_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

    const container = document.getElementById('orderList');
    
    if (error || !orders || orders.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-light);">No orders found.</div>';
        return;
    }

    container.innerHTML = orders.map(o => `
        <div class="card" style="border-left:5px solid var(--primary); margin-bottom:1.5rem; padding: 1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <span style="font-weight: 800; color: var(--text-light); font-size: 0.85rem;">ORDER #${o.id.slice(0,8).toUpperCase()}</span>
                <span style="font-size:0.8rem; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">Ordered: ${new Date(o.created_at).toLocaleDateString()}</span>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid #edf2f7;">
                <p style="font-size: 0.75rem; font-weight: 800; color: var(--text-light); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">Items Ordered</p>
                ${o.order_items.map(i => `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">
                        <div style="flex: 1;">
                            <p style="font-weight: 700; margin: 0; color: var(--text);">${i.products?.name || 'Unknown Product'}</p>
                            <p style="font-size: 0.75rem; color: var(--accent); margin: 2px 0;">Shop: ${i.products?.profiles?.store_name || 'Local Store'}</p>
                            <p style="font-size: 0.85rem; color: var(--text-light); margin: 0;">
                                Quantity: <strong>${i.quantity}</strong> × $${i.price_at_purchase.toFixed(2)}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-weight: 800; color: var(--primary);">$${(i.price_at_purchase * i.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="padding: 0 0.5rem; margin-bottom: 1.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <p style="font-size: 0.7rem; font-weight: 800; color: var(--text-light); text-transform: uppercase; margin-bottom: 4px;">Delivery To</p>
                    <p style="font-size: 0.85rem; margin: 0;"><strong>${o.address ? o.address.split(' | ')[0] : 'Recipient'}</strong></p>
                    <p style="font-size: 0.85rem; color: var(--text-light); margin: 2px 0;">${o.phone || ''}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 0.7rem; font-weight: 800; color: var(--text-light); text-transform: uppercase; margin-bottom: 4px;">Payment Method</p>
                    <p style="font-size: 0.85rem; margin: 0;"><strong>${o.payment_method}</strong></p>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border); padding-top: 1.25rem;">
                <div>
                    <p style="font-size: 0.75rem; color: var(--text-light); margin: 0; text-transform: uppercase; font-weight: 700;">Amount to Pay</p>
                    <span style="font-weight:900; font-size: 1.6rem; color: var(--primary);">$${o.total_amount.toFixed(2)}</span>
                </div>
                <div>
                    ${status === 'to-pay' ? `<button class="btn btn-danger" onclick="cancelOrder('${o.id}')" style="padding: 0.6rem 1.2rem; width: auto;">Cancel Order</button>` : ''}
                    ${status === 'cancelled' ? `<button class="btn btn-outline" onclick="deleteOrder('${o.id}')" style="padding: 0.6rem 1.2rem; width: auto; color: var(--danger); border-color: var(--danger);">Remove Record</button>` : ''}
                </div>
            </div>
        </div>`).join('');
}

async function cancelOrder(id) { 
    const { error } = await supabaseClient.from('orders').update({status:'cancelled'}).eq('id',id); 
    if(!error) { loadMyOrders('to-pay'); showNotify("Order has been cancelled.", "info"); }
}

async function deleteOrder(id) { 
    const { error } = await supabaseClient.from('orders').delete().eq('id',id); 
    if(!error) { loadMyOrders('cancelled'); showNotify("Order record permanently deleted.", "info"); }
}

// --- Persistence & Initial UI ---
function saveCart() { localStorage.setItem('townsquare_cart', JSON.stringify(cart)); }

function updateCartUI() { 
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const status = document.getElementById('cart-status');
    if(count > 0) { status.style.display = 'block'; document.getElementById('cartCount').innerText = `${count}`; }
    else status.style.display = 'none';
}

updateCartUI(); loadProducts();