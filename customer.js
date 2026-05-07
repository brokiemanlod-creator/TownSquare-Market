const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadProducts() {
    const category = document.getElementById('filterCat').value;
    let query = supabaseClient.from('products').select('*');
    
    if (category !== 'all') query = query.eq('category', category);

    const { data: products } = await query;
    const grid = document.getElementById('productGrid');
    
    grid.innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.image_url}" class="product-img">
            <h3 style="margin: 1rem 0 0.5rem 0">${p.name}</h3>
            <p style="color: var(--accent); font-weight: 700; margin: 0">$${p.price}</p>
            <button class="btn btn-primary" style="margin-top: 1rem">Add to Cart</button>
        </div>
    `).join('');
}

loadProducts();