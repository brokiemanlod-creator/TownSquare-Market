const SUPABASE_URL = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3Q2CdkwYf8MT8DV8dzdKww_pDZ9HlFU';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const productForm = document.getElementById('productForm');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const file = document.getElementById('pImage').files[0];
    const name = document.getElementById('pName').value;
    const price = document.getElementById('pPrice').value;
    const category = document.getElementById('pCategory').value;

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    await supabase.storage.from('product-images').upload(fileName, file);
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

    await supabase.from('products').insert([{
        name, 
        price, 
        category, 
        image_url: urlData.publicUrl, 
        vendor_id: user.id
    }]);

    productForm.reset();
    alert('Product listed.');
});