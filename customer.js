const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cart = JSON.parse(localStorage.getItem('townsquare_cart')) || [];
let selectedItems = [];
let cartSelectedIds = [];
let map, marker;
let pendingCancelOrderId = null;
let pendingDeleteOrderId = null;
let pendingProduct = null;

function showQuantityModal(productId, productName, productPrice, vendorId, imageUrl) {
    pendingProduct = { id: productId, name: productName, price: parseFloat(productPrice), vendorId, image_url: imageUrl };
    document.getElementById('qtyProductName').innerText = productName;
    document.getElementById('qtyProductPrice').innerText = `$${productPrice}`;
    document.getElementById('qtyProductImage').src = imageUrl;
    document.getElementById('qtyInput').value = '1';
    document.getElementById('quantityModal').style.display = 'flex';
}

function increaseQty() {
    const input = document.getElementById('qtyInput');
    input.value = parseInt(input.value) + 1;
}

function decreaseQty() {
    const input = document.getElementById('qtyInput');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function confirmAddToCart() {
    if (!pendingProduct) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    const existing = cart.find(i => i.id === pendingProduct.id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ ...pendingProduct, qty });
    }
    saveCart();
    updateCartUI();
    showNotify(`${pendingProduct.name} added to cart (x${qty})!`, 'success');
    closeModal('quantityModal');
    pendingProduct = null;
}

function confirmAndCheckout() {
    if (!pendingProduct) return;
    const qty = parseInt(document.getElementById('qtyInput').value);
    selectedItems = [{ ...pendingProduct, qty }];
    closeModal('quantityModal');
    document.getElementById('checkoutModal').style.display = 'flex';
    setTimeout(initMap, 300);
    pendingProduct = null;
}

function toggleOnlineOptions() {
    const radios = document.getElementsByName('payType');
    let val = "";
    for(let i = 0; i < radios.length; i++) {
        if(radios[i].checked) val = radios[i].value;
    }
    const onlineSection = document.getElementById('onlineSubOptions');
    if (val === 'Online') {
        onlineSection.style.display = 'block';
    } else {
        onlineSection.style.display = 'none';
    }
}

function updateOnlineFields() {
    const providerRadios = document.getElementsByName('onlineProvider');
    let provider = "";
    for(let i = 0; i < providerRadios.length; i++) {
        if(providerRadios[i].checked) provider = providerRadios[i].value;
    }
    document.getElementById('cardDetails').style.display = (provider === 'Card') ? 'block' : 'none';
    document.getElementById('walletDetails').style.display = (provider === 'E-wallet') ? 'block' : 'none';
}

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

function showNotify(message, type = 'info') {
    const icons = { info: '🔔', success: '✅', error: '❌', warning: '⚠️' };
    document.getElementById('notifyIcon').innerText = icons[type];
    document.getElementById('notifyTitle').innerText = type.toUpperCase();
    document.getElementById('notifyMessage').innerText = message;
    document.getElementById('notifyModal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showLogoutModal() {
    document.getElementById('logoutConfirmModal').style.display = 'flex';
}

async function confirmLogout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('townsquare_cart');
    window.location.href = 'index.html';
}

function showCancelOrderModal(orderId) {
    pendingCancelOrderId = orderId;
    document.getElementById('cancelOrderModal').style.display = 'flex';
}

async function confirmCancelOrder() {
    if (!pendingCancelOrderId) return;
    
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', pendingCancelOrderId);
    
    if (error) {
        showNotify("Error cancelling order: " + error.message, "error");
    } else {
        showNotify("Order cancelled successfully", "success");
        closeModal('cancelOrderModal');
        loadMyOrders('to-pay');
    }
    pendingCancelOrderId = null;
}

function showDeleteOrderModal(orderId) {
    pendingDeleteOrderId = orderId;
    document.getElementById('deleteOrderModal').style.display = 'flex';
}

async function confirmDeleteOrder() {
    if (!pendingDeleteOrderId) return;
    
    const { error: itemsError } = await supabaseClient
        .from('order_items')
        .delete()
        .eq('order_id', pendingDeleteOrderId);

    const { error: orderError } = await supabaseClient
        .from('orders')
        .delete()
        .eq('id', pendingDeleteOrderId);
    
    if (itemsError || orderError) {
        showNotify("Error deleting order", "error");
    } else {
        showNotify("Order deleted successfully", "success");
        closeModal('deleteOrderModal');
        loadMyOrders('cancelled');
    }
    pendingDeleteOrderId = null;
}

async function loadProducts() {
    const cat = document.getElementById('filterCat').value;
    let query = supabaseClient.from('products').select('*, profiles(store_name)');
    if (cat !== 'all') query = query.eq('category', cat);
    const { data: products } = await query;
    
    document.getElementById('productGrid').innerHTML = (products || []).map(p => `
        <div class="product-card">
            <img src="${p.image_url}" class="product-img" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23e0e0e0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>No Image</text></svg>'">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-vendor">${p.profiles?.store_name || 'Vendor'}</div>
                <div class="product-footer">
                    <span class="product-price">$${p.price}</span>
                    <button class="btn btn-primary" style="padding: 0.6rem 1.2rem;" onclick="showQuantityModal('${p.id}','${p.name}','${p.price}','${p.vendor_id}','${p.image_url}')">Buy</button>
                </div>
            </div>
        </div>`).join('');
}

function updateCartUI() {
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const status = document.getElementById('cart-status');
    if(count > 0) {
        status.style.display = 'block';
        document.getElementById('cartCount').innerText = count;
    } else status.style.display = 'none';
}

function showCartItems() {
    cartSelectedIds = cartSelectedIds.filter(id => cart.some(item => item.id === id));
    updateCartSelectionDisplay();
    const list = document.getElementById('cartItemsList');
    if (cart.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">Your cart is empty</p>';
    } else {
        list.innerHTML = cart.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap: 1rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid #e5e7eb;">
                <div style="display:flex; align-items:center; gap: 1rem; flex: 1; min-width: 0;">
                    <input type="checkbox" onchange="toggleCartItemSelection('${item.id}', this.checked)" ${cartSelectedIds.includes(item.id) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #065f46;">
                    <img src="${item.image_url}" alt="${item.name}" style="width: 92px; height: 92px; object-fit: cover; border-radius: 14px; background: #f3f4f6; flex-shrink: 0;">
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 700; color: #1f2937; font-size: 1rem; margin-bottom: 0.35rem; white-space: normal; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                        <div style="font-size: 0.9rem; color: #6b7280;">Price: $${item.price.toFixed(2)}</div>
                        <div style="font-size: 0.9rem; color: #9ca3af;">Qty: ${item.qty}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 0.75rem; flex-shrink: 0;">
                    <div style="display:flex; align-items:center; gap: 0.5rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius: 12px; padding: 0.35rem 0.5rem;">
                        <button class="qty-btn" onclick="updateCartItemQuantity('${item.id}', -1)" style="width: 34px; height: 34px;">−</button>
                        <input type="number" min="1" value="${item.qty}" onchange="setCartItemQuantity('${item.id}', this.value)" style="width: 80px; text-align:center; border:none; background:transparent; font-weight:700; font-size: 1.05rem; color:#065f46;">
                        <button class="qty-btn" onclick="updateCartItemQuantity('${item.id}', 1)" style="width: 34px; height: 34px;">+</button>
                    </div>
                    <div style="text-align: right; min-width: 110px; flex-shrink: 0;">
                        <div style="font-weight: 700; color: #065f46; margin-bottom: 0.25rem; font-size: 1.1rem;">$${(item.price * item.qty).toFixed(2)}</div>
                        <button class="delete-btn" onclick="removeFromCart('${item.id}')" style="padding: 0.45rem 0.75rem;">🗑️</button>
                    </div>
                </div>
            </div>`).join('');
    }
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    document.getElementById('cartTotalDisplay').innerText = `$${total.toFixed(2)}`;
    document.getElementById('viewCartModal').style.display = 'flex';
}

function toggleCartItemSelection(itemId, checked) {
    if (checked) {
        if (!cartSelectedIds.includes(itemId)) cartSelectedIds.push(itemId);
    } else {
        cartSelectedIds = cartSelectedIds.filter(id => id !== itemId);
    }
    updateCartSelectionDisplay();
}

function updateCartSelectionDisplay() {
    const status = document.getElementById('cartSelectionStatus');
    if (status) {
        status.innerText = `${cartSelectedIds.length} selected`;
    }
}

function updateCartItemQuantity(itemId, delta) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartUI();
    showCartItems();
}

function setCartItemQuantity(itemId, value) {
    const qty = parseInt(value, 10);
    if (Number.isNaN(qty) || qty < 1) return;
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    item.qty = qty;
    saveCart();
    updateCartUI();
    showCartItems();
}

function removeSelectedCartItems() {
    if (cartSelectedIds.length === 0) {
        showNotify('Please select one or more items to remove.', 'warning');
        return;
    }
    cart = cart.filter(item => !cartSelectedIds.includes(item.id));
    cartSelectedIds = [];
    saveCart();
    updateCartUI();
    showCartItems();
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    cartSelectedIds = cartSelectedIds.filter(id => id !== itemId);
    saveCart();
    updateCartUI();
    showCartItems();
}

function openCheckoutFromCart() {
    if (cart.length === 0) {
        showNotify("Your cart is empty", "warning");
        return;
    }
    selectedItems = [...cart];
    closeModal('viewCartModal');
    document.getElementById('checkoutModal').style.display = 'flex';
    setTimeout(initMap, 300);
}

function saveCart() { 
    localStorage.setItem('townsquare_cart', JSON.stringify(cart)); 
}

function initMap() {
    if (!map) {
        map = L.map('map-container').setView([18.196, 120.592], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        map.on('click', e => {
            if (marker) map.removeLayer(marker);
            marker = L.marker(e.latlng).addTo(map);
        });
    } else {
        map.invalidateSize();
    }
}

function locateMe() {
    if (!map) {
        initMap();
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lng]).addTo(map);
            map.setView([lat, lng], 15);
            showNotify("Location pinned!", "success");
        }, error => {
            showNotify("Unable to get location: " + error.message, "error");
        });
    } else {
        showNotify("Geolocation not supported", "error");
    }
}

async function processOrder() {
    const name = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const addr = document.getElementById('addr').value.trim();

    if (!name || !phone || !addr || !marker) {
        showNotify("Please complete all details and pin your location.", "warning");
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const total = selectedItems.reduce((a, b) => a + (b.price * b.qty), 0);

    const radios = document.getElementsByName('payType');
    let payMethod = "COD";
    for(let i = 0; i < radios.length; i++) {
        if(radios[i].checked) payMethod = radios[i].value;
    }

    const { data: order, error } = await supabaseClient.from('orders').insert([{
        customer_id: user.id,
        total_amount: total,
        status: 'to-pay',
        address: `${name} | ${addr}`,
        phone: phone,
        payment_method: payMethod,
        location_coords: `${marker.getLatLng().lat},${marker.getLatLng().lng}`
    }]).select().single();

    if (error) {
        showNotify(error.message, "error");
        return;
    }

    const { error: itemsError } = await supabaseClient.from('order_items').insert(selectedItems.map(i => ({
        order_id: order.id,
        product_id: i.id,
        vendor_id: i.vendorId,
        price_at_purchase: i.price,
        quantity: i.qty
    })));

    if (itemsError) {
        showNotify("Error adding items to order: " + itemsError.message, "error");
        return;
    }

    cart = []; 
    saveCart(); 
    updateCartUI();
    selectedItems = [];
    closeModal('checkoutModal');
    showNotify("Order placed! Auto-moving to vendor in 30 seconds...", "success");
    
    setTimeout(() => {
        autoMoveToShip(order.id);
    }, 30000);
    
    setTimeout(() => {
        showTab('purchases');
        loadMyOrders('to-pay');
    }, 1500);
}

async function autoMoveToShip(orderId) {
    await supabaseClient.from('orders').update({ status: 'to-ship' }).eq('id', orderId);
    loadMyOrders('to-pay');
}

async function loadMyOrders(status) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: orders } = await supabaseClient.from('orders')
        .select(`id, customer_id, total_amount, status, address, phone, payment_method, location_coords, created_at, order_items(id, quantity, price_at_purchase, product_id, products(id, name, image_url))`)
        .eq('customer_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (!orders || orders.length === 0) {
        document.getElementById('orderList').innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; background: #f9fafb; border-radius: 16px;">
            <p style="font-size: 3rem; margin: 0 0 1rem 0;">📭</p>
            <p style="color: #9ca3af; margin: 0; font-size: 1rem;">No orders found in this category</p>
        </div>`;
        return;
    }

    document.getElementById('orderList').innerHTML = orders.map(o => {
        let itemNames = '';
        let itemCount = 0;
        
        if (o.order_items && o.order_items.length > 0) {
            itemCount = o.order_items.length;
            const items = o.order_items.map(oi => {
                const pName = (oi.products && oi.products.name) ? oi.products.name : 'Unknown Product';
                return `${pName} (x${oi.quantity})`;
            });
            itemNames = items.join(', ');
        } else {
            itemNames = 'No items';
        }
        
        const canCancel = status === 'to-pay';
        const canDelete = status === 'cancelled';
        const statusClass = `status-${status}`;
        
        const orderDate = new Date(o.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
        <div class="order-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin:0 0 0.75rem 0; color: #1f2937; font-size: 1.1rem;">Order #${o.id.slice(0,8).toUpperCase()}</h4>
                    <p style="margin:0 0 0.5rem 0; font-size:0.85rem; color: #9ca3af;">📅 ${orderDate}</p>
                    <p style="margin:0 0 0.75rem 0; font-size:0.9rem; color: #6b7280;">
                        <strong>Items (${itemCount}):</strong> ${itemNames}
                    </p>
                    <p style="margin:0 0 0.75rem 0; font-weight:700; color: #065f46; font-size: 1.2rem;">$${o.total_amount.toFixed(2)}</p>
                    <p style="margin:0; font-size:0.9rem;">
                        <span class="status-badge ${statusClass}">${o.status}</span>
                    </p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${canCancel ? `<button class="btn btn-danger" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;" onclick="showCancelOrderModal('${o.id}')">❌ Cancel</button>` : ''}
                    ${canDelete ? `<button class="delete-btn" onclick="showDeleteOrderModal('${o.id}')">🗑️ Delete</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

loadProducts();
updateCartUI();