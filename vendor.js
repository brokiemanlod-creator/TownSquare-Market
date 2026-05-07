const supabaseUrl = 'https://bsnmcvntzvywhkpjsvsi.supabase.co';
const supabaseKey = 'sb_publishable_3Q2CdkwYf8MT8DV8dzdKww_pDZ9HlFU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function checkVendor() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata.role !== 'vendor') {
        window.location.href = 'index.html';
    }
}

const productForm = document.getElementById('productForm');

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const file = document.getElementById('pImage').files[0];
    const name = document.getElementById('pName').value;
    const price = document.getElementById('pPrice').value;
    const btn = e.target.querySelector('button');
    btn.innerText = "Uploading...";
    btn.disabled = true;
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
    if (uploadError) {
        alert(uploadError.message);
        btn.innerText = "List Product";
        btn.disabled = false;
        return;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    const { error: dbError } = await supabase.from('products').insert([{
        name, price, image_url: urlData.publicUrl, vendor_id: user.id
    }]);
    if (dbError) alert(dbError.message);
    else {
        alert("Product listed successfully!");
        productForm.reset();
    }
    btn.innerText = "List Product";
    btn.disabled = false;
});

checkVendor();