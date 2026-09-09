let products=[];const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
const statusText={menunggu_konfirmasi:"Menunggu Konfirmasi",diproses:"Diproses",selesai:"Selesai",dibatalkan:"Dibatalkan",pending:"Menunggu Pembayaran"};
async function init(){const m=await(await fetch("/api/me")).json();if(!m.user||m.user.role!=="admin")return location="/login.html";loadPaymentSettings();load()}
async function loadPaymentSettings(){
 try{
   const r=await fetch("/api/payment-settings"), d=await r.json();
   $("#currentQr").innerHTML=d.dana_qr_url
     ? `<img src="${esc(d.dana_qr_url)}" alt="QR DANA saat ini">`
     : "<span>Belum ada QR DANA.</span>";
 }catch(e){ $("#currentQr").textContent="Gagal memuat QR DANA."; }
}
async function load(){
 products=await(await fetch("/api/products")).json();
 $("#stats").innerHTML=`<div class="stat">Produk<br><b>${products.length}</b></div><div class="stat">Stok<br><b>${products.reduce((a,p)=>a+p.stock,0)}</b></div><div class="stat">Nilai stok<br><b>${money(products.reduce((a,p)=>a+p.price*p.stock,0))}</b></div>`;
 const o=await(await fetch("/api/orders")).json();
 $("#orders").innerHTML=o.map(x=>`<div class="order"><b>#${x.id}</b> ${esc(x.customer_name)}<br>Pembayaran: <b>${x.payment_method==="transfer"?"Transfer":"Cash"}</b><br>Total: ${money(x.total)}<br>Status: <span class="status">${statusText[x.status]||x.status}</span><div class="order-actions">${x.status==="menunggu_konfirmasi"?`<button class="success" onclick="orderAction(${x.id},'confirm')">✓ Konfirmasi</button><button class="danger" onclick="orderAction(${x.id},'reject')">✕ Tolak</button>`:""}${x.status==="diproses"?`<button onclick="orderAction(${x.id},'finish')">✓ Selesai</button>`:""}</div></div>`).join("")||"<p>Belum ada pesanan.</p>";
 $("#products").innerHTML=products.map(p=>`<div class="adminrow"><div><b>${esc(p.name)}</b><br>${money(p.price)} · stok ${p.stock}</div><button onclick="edit(${p.id})">Edit</button><button class="ghost" onclick="del(${p.id})">Hapus</button></div>`).join("");
}
async function orderAction(id,action){const msg=action==="confirm"?"Konfirmasi pembayaran pesanan ini?":action==="reject"?"Tolak pembayaran dan kembalikan stok?":"Tandai pesanan selesai?";if(!confirm(msg))return;const r=await fetch(`/api/admin/orders/${id}/${action}`,{method:"POST"});const d=await r.json();if(!r.ok)return alert(d.error||"Gagal.");load()}
function openForm(p){$("#modal").classList.remove("hidden");$("#productForm").reset();for(const k of ["id","name","description","price","stock","category","image"])$("#productForm [name="+k+"]").value=p?.[k]??""}
function closeForm(){$("#modal").classList.add("hidden")}function edit(id){openForm(products.find(p=>p.id===id))}
async function del(id){if(confirm("Hapus produk?")){const r=await fetch("/api/admin/products/"+id,{method:"DELETE"});if(!r.ok)alert((await r.json()).error);load()}}
$("#productForm").onsubmit=async e=>{e.preventDefault();let b=Object.fromEntries(new FormData(e.target)),id=b.id;delete b.id;b.price=Number(b.price);b.stock=Number(b.stock);const r=await fetch("/api/admin/products"+(id?"/"+id:""),{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});if(!r.ok)return alert((await r.json()).error);closeForm();load()}
$("#logout").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location="/login.html"};
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}init();
const qrFile=$("#qrFile"),qrPreview=$("#qrPreview"),qrForm=$("#qrForm");
qrFile.onchange=()=>{
 const f=qrFile.files[0];
 if(!f){qrPreview.innerHTML="<span>Preview QR baru akan muncul di sini.</span>";return}
 if(!["image/png","image/jpeg","image/webp"].includes(f.type)){alert("Pilih PNG, JPG/JPEG, atau WebP.");qrFile.value="";return}
 if(f.size>4*1024*1024){alert("Ukuran foto QR maksimal 4 MB.");qrFile.value="";return}
 const reader=new FileReader();
 reader.onload=()=>qrPreview.innerHTML=`<img src="${reader.result}" alt="Preview QR DANA">`;
 reader.readAsDataURL(f);
};
qrForm.onsubmit=async e=>{
 e.preventDefault();
 const f=qrFile.files[0]; if(!f)return;
 const msg=$("#qrMsg"),btn=$("#saveQr");
 btn.disabled=true;msg.textContent="Mengupload QR...";
 try{
   const dataUrl=await new Promise((resolve,reject)=>{
     const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);
   });
   const r=await fetch("/api/admin/payment-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({danaQrData:dataUrl})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||"Gagal menyimpan QR.");
   msg.textContent="QR DANA berhasil disimpan.";
   qrFile.value="";
   await loadPaymentSettings();
 }catch(err){msg.textContent=err.message}
 finally{btn.disabled=false}
};
