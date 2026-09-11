let products=[];
let cart=JSON.parse(localStorage.cart||'[]');
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function init(){
  try{
    const me=await fetch('/api/me');
    const m=await me.json();
    if(!m.user)return location='/register.html';
    const pr=await fetch('/api/products');
    products=await pr.json();
    if(!Array.isArray(products)) throw new Error(products.error||'Produk gagal dimuat.');
    render();
    loadPaymentSettings();
  }catch(e){
    $('#msg').textContent=e.message||'Gagal memuat checkout.';
  }
}
async function loadPaymentSettings(){
  const img=$('#danaQr'), loading=$('#qrLoading'), note=$('#qrMsg');
  try{
    const r=await fetch('/api/payment-settings');
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'QR gagal dimuat.');
    if(d.danaQrUrl){
      img.src=d.danaQrUrl;
      img.onload=()=>{img.classList.remove('hidden');loading.classList.add('hidden');note.textContent='Scan QR ini menggunakan aplikasi DANA.'};
      img.onerror=()=>{img.classList.add('hidden');loading.classList.remove('hidden');loading.textContent='QR tidak dapat ditampilkan. Admin perlu mengganti gambar QR.'};
    }else{
      loading.textContent='QR DANA belum diatur oleh admin.';
      note.textContent='Kamu tetap bisa memilih Cash.';
    }
  }catch(e){
    loading.textContent='QR DANA belum tersedia.';
    note.textContent='Silakan pilih Cash atau coba lagi nanti.';
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


document.querySelectorAll('input[name="payment"]').forEach(r=>r.addEventListener('change',()=>{
  $('#qrBox').style.display=r.checked&&r.value==='transfer'?'block':'none';
}));
