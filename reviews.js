async function submitRating() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const score = parseInt(document.getElementById('rateScore').value);
    const comm = document.getElementById('rateComment').value;
    const file = document.getElementById('ratePhoto').files[0];
    let photoUrl = null;

    if (file) {
        const path = `reviews/${Date.now()}_${file.name}`;
        await supabaseClient.storage.from('product-images').upload(path, file);
        photoUrl = supabaseClient.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }

    const { data: prod } = await supabaseClient.from('products').select('vendor_id').eq('id', ratingProductId).single();

    await supabaseClient.from('reviews').insert([{
        product_id: ratingProductId, customer_id: user.id, rating: score,
        comment: comm, photo_url: photoUrl, vendor_id: prod.vendor_id
    }]);

    const { data: p } = await supabaseClient.from('products').select('total_stars, review_count').eq('id', ratingProductId).single();
    await supabaseClient.from('products').update({
        total_stars: p.total_stars + score,
        review_count: p.review_count + 1
    }).eq('id', ratingProductId);

    alert("Review Posted!");
    closeModal('rateModal');
    loadMyOrders('completed');
}

async function toggleLike(rid) {
    const { data: r } = await supabaseClient.from('reviews').select('likes').eq('id', rid).single();
    await supabaseClient.from('reviews').update({ likes: r.likes + 1 }).eq('id', rid);
}