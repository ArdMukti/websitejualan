let products=[];
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const statusText={belum_dibayar:'Belum Dibayar',transfer:'Transfer',proses:'Proses',selesai:'Selesai',menunggu_konfirmasi:'Transfer',diproses:'Proses',pending:'Belum Dibayar'};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function init(){
  const m=await (await fetch('/api/me')).json();
  if(!m.user||m.user.role!=='admin')return location='/login.html';
  load();
}
async function load(){
  try{
    const [pRes,oRes]=await Promise.all([fetch('/api/products'),fetch('/api/orders')]);
    products=await pRes.json();
    const orders=await oRes.json();
    if(!Array.isArray(orders))throw new Error(orders.error||'Gagal memuat pesanan.');
    renderStats(orders);renderOrders(orders);renderProducts();loadQrSettings();
  }catch(e){$('#orders').innerHTML=`<div class="panel empty">${esc(e.message||'Gagal memuat pesanan.')}</div>`}
}
function normalizeStatus(o){
  if(['belum_dibayar','transfer','proses','selesai'].includes(o.status))return o.status;
  if(o.status==='menunggu_konfirmasi')return 'transfer';
  if(o.status==='diproses')return 'proses';
  return 'belum_dibayar';
}

async function loadQrSettings(){
  const img=$('#qrPreview'), empty=$('#qrPreviewEmpty'), msg=$('#qrAdminMsg');
  try{
    const r=await fetch('/api/payment-settings');
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Gagal memuat QR.');
    if(d.danaQrUrl){showQrPreview(d.danaQrUrl);}else{img.classList.add('hidden');empty.classList.remove('hidden');}
  }catch(e){msg.textContent=e.message||'Gagal memuat QR.';}
}
function showQrPreview(src){
  const img=$('#qrPreview'), empty=$('#qrPreviewEmpty');
  img.src=src; img.classList.remove('hidden'); empty.classList.add('hidden');
}
$('#qrFile').onchange=e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){e.target.value='';return alert('Pilih file gambar.');}
  if(file.size>2*1024*1024){e.target.value='';return alert('Ukuran gambar maksimal 2 MB.');}
  const reader=new FileReader();
  reader.onload=()=>showQrPreview(reader.result);
  reader.readAsDataURL(file);
};
$('#saveQr').onclick=async()=>{
  const file=$('#qrFile').files?.[0];
  if(!file)return alert('Pilih foto QR terlebih dahulu.');
  const msg=$('#qrAdminMsg'), btn=$('#saveQr');
  btn.disabled=true; msg.textContent='Menyimpan QR...';
  try{
    const dataUrl=await fileToDataUrl(file);
    const r=await fetch('/api/admin/payment-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({danaQrUrl:dataUrl})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Gagal menyimpan QR.');
    msg.textContent='QR berhasil disimpan. Customer akan melihat QR ini saat checkout.';
    $('#qrFile').value='';
  }catch(e){msg.textContent=e.message||'Gagal menyimpan QR.';}finally{btn.disabled=false;}
};
$('#clearQr').onclick=async()=>{
  if(!confirm('Hapus QR DANA dari checkout?'))return;
  const msg=$('#qrAdminMsg'), btn=$('#clearQr'); btn.disabled=true;
  try{
    const r=await fetch('/api/admin/payment-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({danaQrUrl:''})});
    const d=await r.json(); if(!r.ok)throw new Error(d.error||'Gagal menghapus QR.');
    $('#qrPreview').classList.add('hidden'); $('#qrPreviewEmpty').classList.remove('hidden'); $('#qrFile').value=''; msg.textContent='QR berhasil dihapus.';
  }catch(e){msg.textContent=e.message||'Gagal menghapus QR.';}finally{btn.disabled=false;}
};
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}

function renderStats(orders){
  const waiting=orders.filter(x=>normalizeStatus(x)==='belum_dibayar'||normalizeStatus(x)==='transfer').length;
  const processing=orders.filter(x=>normalizeStatus(x)==='proses').length;
  const revenue=orders.filter(x=>normalizeStatus(x)!=='belum_dibayar').reduce((a,x)=>a+x.total,0);
  $('#stats').innerHTML=`<div class="stat"><small>Total Pesanan</small><b>${orders.length}</b></div><div class="stat"><small>Menunggu Pembayaran/Transfer</small><b>${waiting}</b></div><div class="stat"><small>Nilai Pesanan</small><b>${money(revenue)}</b></div>`;
}
function renderOrders(os){
  if(!os.length){$('#orders').innerHTML='<div class="panel empty">Belum ada pesanan.</div>';return;}
  $('#orders').innerHTML=`<div class="panel" style="padding:0;overflow:hidden"><table class="admin-table"><thead><tr><th>No</th><th>Produk</th><th>Total</th><th>Pembayaran</th><th>Status</th><th>Perubahan</th></tr></thead><tbody>${os.map(o=>{
    const status=normalizeStatus(o);
    const payment=o.payment_method||(status==='transfer'?'transfer':'cash');
    return `<tr><td>#${o.id}</td><td>${o.items?.map(i=>esc(i.name)+' × '+i.quantity).join('<br>')||'-'}</td><td>${money(o.total)}</td><td>${payment==='transfer'?'Transfer':'Cash'}</td><td><span class="status-pill ${status==='proses'||status==='selesai'?'green':'yellow'}">${statusText[status]}</span></td><td><select class="status-select" data-order-id="${o.id}"><option value="belum_dibayar" ${status==='belum_dibayar'?'selected':''}>Belum Dibayar</option><option value="transfer" ${status==='transfer'?'selected':''}>Transfer</option><option value="proses" ${status==='proses'?'selected':''}>Proses</option><option value="selesai" ${status==='selesai'?'selected':''}>Selesai</option></select></td></tr>`;
  }).join('')}</tbody></table></div>`;
  document.querySelectorAll('.status-select').forEach(select=>{
    select.onchange=()=>changeStatus(Number(select.dataset.orderId),select.value,select);
  });
}
async function changeStatus(id,status,select){
  const old=select.dataset.old||select.querySelector('option[selected]')?.value||'';
  if(!confirm(`Ubah status pesanan #${id} menjadi "${statusText[status]}"?`)){load();return;}
  select.disabled=true;
  try{
    const r=await fetch(`/api/admin/orders/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Gagal mengubah status.');
    load();
  }catch(e){alert(e.message||'Gagal mengubah status.');load();}
}
function renderProducts(){$('#productList').innerHTML=products.map(p=>`<div class="adminrow"><div><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${money(p.price)} · stok ${p.stock} · ${esc(p.category||'Tanpa kategori')}</small></div><button class="btn small" onclick="edit(${p.id})">Edit</button><button class="btn danger small" onclick="del(${p.id})">Hapus</button></div>`).join('')||'<div class="empty">Belum ada produk.</div>'}
function openForm(p){$('#modal').classList.remove('hidden');$('#productForm').reset();for(const k of ['id','name','description','price','stock','category','image'])$(`#productForm [name="${k}"]`).value=p?.[k]??''}
function closeForm(){$('#modal').classList.add('hidden')}
function edit(id){openForm(products.find(p=>p.id===id))}
async function del(id){if(!confirm('Hapus produk?'))return;const r=await fetch('/api/admin/products/'+id,{method:'DELETE'});if(!r.ok)return alert((await r.json()).error||'Gagal');load()}
$('#productForm').onsubmit=async e=>{e.preventDefault();let b=Object.fromEntries(new FormData(e.target)),id=b.id;delete b.id;b.price=Number(b.price);b.stock=Number(b.stock);const r=await fetch('/api/admin/products'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)return alert((await r.json()).error||'Gagal');closeForm();load()};
$('#logout').onclick=async e=>{e.preventDefault();await fetch('/api/logout',{method:'POST'});location='/login.html'};
init();
