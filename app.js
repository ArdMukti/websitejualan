let products=[];const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
async function init(){const m=await(await fetch("/api/me")).json();document.querySelector("#nav").innerHTML=m.user?
`<a href="/cart.html">Keranjang</a><a href="/pesanan.html">Pesanan</a>${m.user.role==="admin"?`<a href="/admin.html">Admin</a>`:""}<a href="#" onclick="logout()">Keluar</a>`:
`<a href="/login.html">Login</a> <a href="/register.html">Daftar</a>`;
products=await(await fetch("/api/products")).json();render()}
function render(){const q=($("#search").value||"").toLowerCase();$("#products").innerHTML=products.filter(p=>(p.name+" "+p.category).toLowerCase().includes(q)).map(p=>`<article class="product">${p.image?`<img src="${esc(p.image)}">`:`<div class="noimg">MINUMAN</div>`}<div class="product-body"><h3>${esc(p.name)}</h3><div class="desc">${esc(p.description)}</div><div class="price">${money(p.price)}</div><p>${p.stock>0?`Stok: ${p.stock}`:"Stok habis"}</p>${p.stock?`<button onclick="add(${p.id})">Tambah</button>`:""}</div></article>`).join("")||"<p>Belum ada produk.</p>"}
function add(id){let c=JSON.parse(localStorage.cart||"[]"),x=c.find(a=>a.id===id);x?x.qty++:c.push({id,qty:1});localStorage.cart=JSON.stringify(c);alert("Ditambahkan ke keranjang.")}
async function logout(){await fetch("/api/logout",{method:"POST"});location.reload()}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("#search").oninput=render;init();