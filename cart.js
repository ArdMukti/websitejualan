let products=[],cart=JSON.parse(localStorage.cart||"[]");
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
async function init(){const m=await(await fetch("/api/me")).json();if(!m.user)return location="/login.html";products=await(await fetch("/api/products")).json();await loadDanaQr();render()}
async function loadDanaQr(){
 try{
   const r=await fetch("/api/payment-settings"),d=await r.json();
   $("#danaQr").innerHTML=d.dana_qr_url
     ? `<p><b>Scan QR DANA untuk pembayaran</b></p><img class="dana-qr-img" src="${esc(d.dana_qr_url)}" alt="QR DANA">`
     : "<p>QR DANA belum diatur admin.</p>";
 }catch(e){$("#danaQr").textContent="QR DANA gagal dimuat."}
}
function toggleDanaQr(){
 const transfer=document.querySelector('input[name="payment"][value="transfer"]').checked;
 $("#danaQrBox").classList.toggle("hidden",!transfer);
}
function render(){let total=0;$("#cart").innerHTML=cart.map(x=>{const p=products.find(p=>p.id===x.id);if(!p)return"";total+=p.price*x.qty;return`<div class="cartrow"><div><b>${esc(p.name)}</b><br>${money(p.price)} × ${x.qty}</div><div><button onclick="change(${p.id},-1)">−</button> ${x.qty} <button onclick="change(${p.id},1)">+</button></div><div>${money(p.price*x.qty)}</div></div>`}).join("")+`<h2>Total: ${money(total)}</h2>`}
function change(id,n){const x=cart.find(a=>a.id===id);if(!x)return;x.qty+=n;if(x.qty<1)cart=cart.filter(a=>a.id!==id);localStorage.cart=JSON.stringify(cart);render()}
document.querySelectorAll('input[name="payment"]').forEach(x=>x.onchange=toggleDanaQr);
toggleDanaQr();
$("#order").onclick=async()=>{if(!cart.length)return alert("Keranjang kosong.");const paymentMethod=document.querySelector('input[name="payment"]:checked').value;$("#msg").textContent="Membuat pesanan...";const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentMethod,items:cart})}),d=await r.json();if(!r.ok){$("#msg").textContent=d.error||"Gagal membuat pesanan.";return}localStorage.cart="[]";location="/pesanan.html?new="+d.orderId};
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}init();