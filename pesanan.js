const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);const statusText={belum_dibayar:'Belum Dibayar',transfer:'Transfer',proses:'Proses',selesai:'Selesai',menunggu_konfirmasi:'Transfer',diproses:'Proses',pending:'Belum Dibayar'};const payText={transfer:'Transfer',cash:'Cash'};const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function init(){const m=await (await fetch('/api/me')).json();if(!m.user)return location='/login.html';const r=await fetch('/api/orders'),o=await r.json();if(!r.ok){$('#orders').innerHTML='<div class="empty">Gagal memuat pesanan.</div>';return}render(o)}
function render(os){
 if(!os.length){$('#orders').innerHTML='<div class="empty">Belum ada pesanan.<br><a href="/" style="display:inline-block;margin-top:10px;color:var(--primary);font-weight:800">Mulai belanja →</a></div>';return}
 $('#orders').innerHTML=os.map(o=>{
  const status=['belum_dibayar','transfer','proses','selesai'].includes(o.status)?o.status:(o.status==='menunggu_konfirmasi'?'transfer':o.status==='diproses'?'proses':'belum_dibayar');
  const payment=o.payment_method||(status==='transfer'?'transfer':'cash');
  const steps=[
   ['belum_dibayar','Belum Dibayar','Pesanan dibuat. Pembayaran belum diterima.'],
   ['transfer','Transfer','Pembayaran transfer menunggu proses admin.'],
   ['proses','Proses','Pesanan sedang disiapkan.'],
   ['selesai','Selesai','Pesanan telah diantar.']
  ];
  const rank={belum_dibayar:0,transfer:1,proses:2,selesai:3}[status];
  return `<section class="panel" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;gap:15px;align-items:center"><div><b>Pesanan #${o.id}</b><div style="font-size:11px;color:var(--muted);margin-top:4px">Pembayaran: ${payText[payment]||payment}</div></div><span class="status-pill ${status==='proses'||status==='selesai'?'green':'yellow'}">${statusText[status]}</span></div><div class="timeline" style="margin-top:18px">${steps.map((s,i)=>`<div class="timeline-item ${i<=rank?'active':''}"><div class="timeline-dot"></div><div><h3>${s[1]}</h3><p>${s[2]}</p></div></div>`).join('')}</div><div style="border-top:1px solid var(--line);padding-top:13px;margin-top:4px">${o.items.map(i=>`<div class="summary-line"><span>${esc(i.name)} × ${i.quantity}</span><b>${money(i.price*i.quantity)}</b></div>`).join('')}<div class="summary-line total"><span>Total</span><b>${money(o.total)}</b></div></div>${status==='transfer'?'<p style="font-size:11px;color:var(--muted)"><b>Silakan selesaikan transfer sesuai instruksi admin.</b> Setelah itu status akan diperbarui admin.</p>':''}</section>`
 }).join('')
}
init();
