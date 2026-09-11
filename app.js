let products=[];let currentUser=null;const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function init(){
  try{
    const m=await (await fetch('/api/me')).json();
    currentUser=m.user||null;
    $('#navUser').innerHTML=m.user?`<a class="btn small" href="${m.user.role==='admin'?'/admin.html':'/pesanan.html'}">${m.user.role==='admin'?'Admin':'Pesanan'}</a>`:`<a class="btn small" href="/login.html">Masuk</a>`;
    products=await (await fetch('/api/products')).json();
    const first=products.find(p=>p.image);if(first)$('#heroImage').src=first.image;
    render();updateCartCount();
  }catch(e){$('#productsGrid').innerHTML='<div class="empty">Gagal memuat produk.</div>'}
}
function render(){const q=($('#search').value||'').toLowerCase().trim();const list=products.filter(p=>(p.name+' '+p.category+' '+p.description).toLowerCase().includes(q));$('#productsGrid').innerHTML=list.map(p=>`<article class="product-card"><a href="/produk.html?id=${p.id}">${p.image?`<img class="product-image" src="${esc(p.image)}" alt="${esc(p.name)}">`:`<div class="product-placeholder">MINUMAN</div>`}</a><div class="product-body"><h3>${esc(p.name)}</h3><div class="product-desc">${esc(p.description||'Minuman segar pilihan.')}</div><div class="product-footer"><div><div class="product-price">${money(p.price)}</div><small style="color:var(--muted)">${p.stock>0?`Stok ${p.stock}`:'Stok habis'}</small></div>${p.stock>0?`<button class="mini-cart" aria-label="Tambah" onclick="add(event,${p.id})"><svg viewBox="0 0 24 24"><path d="M6 7h15l-1.5 9H8L6 4H3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg></button>`:''}</div></div></article>`).join('')||'<div class="empty">Produk tidak ditemukan.</div>'}
function add(e,id){e.preventDefault();e.stopPropagation();if(!currentUser){location.href='/register.html';return}let c=JSON.parse(localStorage.cart||'[]'),x=c.find(a=>a.id===id),p=products.find(a=>a.id===id);if(x){if(x.qty>=p.stock)return toast('Jumlah sudah mencapai stok.');x.qty++}else c.push({id,qty:1});localStorage.cart=JSON.stringify(c);updateCartCount();toast('Ditambahkan ke keranjang.');}
function updateCartCount(){const c=JSON.parse(localStorage.cart||'[]');$('#cartCount').textContent=c.reduce((n,x)=>n+x.qty,0)}
function toast(t){const x=$('#toast');if(!x)return; x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}
$('#search').addEventListener('input',render);init();
