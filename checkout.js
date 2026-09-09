let products=[];
let cart=JSON.parse(localStorage.cart||'[]');
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function init(){
  try{
    const me=await fetch('/api/me');
    const m=await me.json();
    if(!m.user)return location='/login.html';
    const pr=await fetch('/api/products');
    products=await pr.json();
    if(!Array.isArray(products)) throw new Error(products.error||'Produk gagal dimuat.');
    render();
  }catch(e){
    $('#msg').textContent=e.message||'Gagal memuat checkout.';
  }
}
function render(){
  let total=0;
  const html=cart.map(x=>{
    const p=products.find(p=>p.id===Number(x.id));
    if(!p)return '';
    const qty=Number(x.qty)||0;
    total+=p.price*qty;
    return `<div class="summary-line"><span>${esc(p.name)} × ${qty}</span><b>${money(p.price*qty)}</b></div>`;
  }).join('');
  $('#summary').innerHTML=html+`<div class="summary-line total"><span>Total</span><b>${money(total)}</b></div>`;
}

$('#order').onclick=async()=>{
  if(!cart.length){$('#msg').textContent='Keranjang kosong.';return;}
  const selected=document.querySelector('input[name="payment"]:checked');
  if(!selected){$('#msg').textContent='Pilih metode pembayaran.';return;}
  const button=$('#order');
  button.disabled=true;
  $('#msg').textContent='Membuat pesanan...';
  try{
    const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentMethod:selected.value,items:cart})});
    let d={};
    try{d=await r.json()}catch{}
    if(!r.ok)throw new Error(d.error||`Server error (${r.status}).`);
    localStorage.cart='[]';
    location='/pesanan.html?new='+d.orderId;
  }catch(e){
    console.error(e);
    $('#msg').textContent=e.message||'Terjadi kesalahan koneksi.';
    button.disabled=false;
  }
};
init();
