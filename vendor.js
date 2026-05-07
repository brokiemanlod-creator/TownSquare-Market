const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbm1jdm50enZ5d2hrcGpzdnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDc5MzcsImV4cCI6MjA5MzcyMzkzN30.OsHDloa5J7UcbDwP4n8TXFhIkTnAn7INwsR-_ld-ZQ0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const productForm = document.getElementById('productForm');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const file = document.getElementById('pImage').files[0];
    const name = document.getElementById('pName').value;
    const price = document.getElementById('pPrice').value;
    const category = document.getElementById('pCategory').value;

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    await supabaseClient.storage.from('product-images').upload(fileName, file);
    const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);

    await supabaseClient.from('products').insert([{
        name, 
        price, 
        category, 
        image_url: urlData.publicUrl, 
        vendor_id: user.id
    }]);

    productForm.reset();
    alert('Product listed.');
});