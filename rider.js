const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let map, marker;
let currentConversationId = null;
let currentDeliveryId = null;

async function checkRider() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.user_metadata.role !== 'rider') {
        window.location.href = 'index.html';
    } else {
        document.getElementById('riderWelcome').innerText = `🏍️ Welcome, Rider #${user.id.slice(0, 8).toUpperCase()}`;
        loadDeliveries();
        loadCompletedDeliveries();
    }
}

function showTab(tab) {
    document.querySelectorAll('[id$="Tab"]').forEach(el => el.style.display = 'none');
    document.getElementById(tab + 'Tab').style.display = 'block';
    
    if (tab === 'messages') loadConversations();
}

async function loadDeliveries() {
    const { data: orders } = await supabaseClient
        .from('orders')
        .select(`id, customer_id, total_amount, status, address, phone, location_coords, created_at, profiles(full_name), order_items(products(name))`)
        .in('status', ['to-ship', 'to-receive']);

    if (!orders || orders.length === 0) {
        document.getElementById('deliveriesList').innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="font-size: 2rem; margin: 0 0 1rem 0;">📭</p>
            <p style="color: #9ca3af;">No pending deliveries</p>
        </div>`;
        return;
    }

    document.getElementById('deliveriesList').innerHTML = orders.map(o => `
        <div class="delivery-item">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 0.5rem 0; color: #1f2937;">Order #${o.id.slice(0,8).toUpperCase()}</h4>
                <p style="margin: 0 0 0.5rem 0; color: #6b7280;">📞 ${o.phone}</p>
                <p style="margin: 0 0 0.5rem 0; color: #6b7280;">📍 ${o.address}</p>
                <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: #9ca3af;">
                    Items: ${o.order_items.map(i => i.products.name).join(', ')}
                </p>
                <span class="status-badge status-${o.status}">${o.status}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-end;">
                <button class="btn btn-primary" style="padding: 0.6rem 1.2rem;" onclick="openTracking('${o.id}', '${o.address}')">
                    📍 Track
                </button>
                ${o.status === 'to-receive' ? `
                    <button class="btn btn-primary" style="padding: 0.6rem 1.2rem;" onclick="showDeliveryConfirm('${o.id}', '${o.address}')">
                        ✅ Delivered
                    </button>
                ` : `
                    <button class="btn btn-outline" style="padding: 0.6rem 1.2rem;" onclick="acceptDelivery('${o.id}')">
                        Accept
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

async function loadCompletedDeliveries() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: orders } = await supabaseClient
        .from('orders')
        .select(`id, total_amount, status, address, profiles(full_name)`)
        .eq('status', 'completed')
        .limit(10);

    if (!orders || orders.length === 0) {
        document.getElementById('completedList').innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="font-size: 2rem; margin: 0 0 1rem 0;">✅</p>
            <p style="color: #9ca3af;">No completed deliveries</p>
        </div>`;
        return;
    }

    document.getElementById('completedList').innerHTML = orders.map(o => `
        <div class="delivery-item" style="opacity: 0.8;">
            <div>
                <h4 style="margin: 0 0 0.5rem 0; color: #1f2937;">Order #${o.id.slice(0,8).toUpperCase()}</h4>
                <p style="margin: 0; color: #6b7280;">$${o.total_amount}</p>
                <span class="status-badge status-completed" style="margin-top: 0.75rem;">Completed</span>
            </div>
        </div>
    `).join('');
}

async function acceptDelivery(orderId) {
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'to-receive' })
        .eq('id', orderId);

    if (!error) {
        alert('Delivery accepted!');
        loadDeliveries();
    }
}

function openTracking(orderId, address) {
    currentDeliveryId = orderId;
    document.getElementById('trackingTitle').innerText = `Order #${orderId.slice(0,8).toUpperCase()}`;
    document.getElementById('trackingModal').style.display = 'flex';
    setTimeout(initTrackingMap, 300);
}

function initTrackingMap() {
    if (!map) {
        map = L.map('map-container').setView([18.196, 120.592], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    } else {
        map.invalidateSize();
    }
}

function updateLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup('Your Location').openPopup();
            map.setView([lat, lng], 15);
            alert('Location updated!');
        });
    }
}

function showDeliveryConfirm(orderId, address) {
    currentDeliveryId = orderId;
    document.getElementById('deliveryMessage').innerText = `Confirm delivery to ${address}?`;
    document.getElementById('deliveryModal').style.display = 'flex';
}

async function confirmDelivery() {
    const { error } = await supabaseClient
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', currentDeliveryId);

    if (!error) {
        alert('Delivery marked as completed!');
        closeModal('deliveryModal');
        loadDeliveries();
        loadCompletedDeliveries();
    }
}

async function loadConversations() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: messages } = await supabaseClient
        .from('messages')
        .select('conversation_id, sender_id, profiles(full_name)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    const conversations = [...new Set(messages?.map(m => m.conversation_id) || [])];
    
    if (conversations.length === 0) {
        document.getElementById('conversationsList').innerHTML = '<p style="color: #9ca3af; text-align: center;">No messages</p>';
        return;
    }

    document.getElementById('conversationsList').innerHTML = conversations.slice(0, 10).map(convId => `
        <div style="padding: 0.75rem; border-radius: 8px; cursor: pointer; background: #f3f4f6; margin-bottom: 0.5rem;" 
             onclick="openConversation('${convId}')">
            <p style="margin: 0; font-size: 0.9rem; color: #1f2937; font-weight: 600;">${convId.slice(0, 12)}...</p>
        </div>
    `).join('');
}

function openConversation(conversationId) {
    currentConversationId = conversationId;
    loadMessages();
}

async function loadMessages() {
    if (!currentConversationId) return;

    const { data: messages } = await supabaseClient
        .from('messages')
        .select('id, sender_id, message, created_at, profiles(full_name)')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

    document.getElementById('messagesDisplay').innerHTML = (messages || []).map(m => `
        <div style="margin-bottom: 1rem;">
            <div style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 0.25rem;">${m.profiles?.full_name}</div>
            <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; color: #1f2937;">
                ${m.message}
            </div>
        </div>
    `).join('') + '<div id="messagesEnd"></div>';

    document.getElementById('messagesEnd').scrollIntoView();
}

async function sendMessage() {
    if (!currentConversationId) {
        alert('Select a conversation first');
        return;
    }

    const messageText = document.getElementById('messageInput').value.trim();
    if (!messageText) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    await supabaseClient.from('messages').insert([{
        conversation_id: currentConversationId,
        sender_id: user.id,
        message: messageText,
        created_at: new Date().toISOString()
    }]);

    document.getElementById('messageInput').value = '';
    loadMessages();
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showLogoutModal() {
    document.getElementById('logoutModal').style.display = 'flex';
}

async function confirmLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

checkRider();