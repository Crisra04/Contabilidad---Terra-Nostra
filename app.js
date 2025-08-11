
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const storeKey='contabilidad_tn_v'+(window.APP_VERSION||'1_03').replace('.','_');
let db=JSON.parse(localStorage.getItem(storeKey)||'{}'); if(!db.tx){db={tx:[],cats:['Meta Ads','Comisiones','Sueldos','Alquiler','Internet','Software','Fotografía','Video','Dron','Mantenimiento','Combustible','Honorarios','Banco','Depreciación','Pago capital deuda','Interés deuda'],debts:[],assets:[],closures:[],templates:[],backups:[],fxMemo:{}}}
function save(){localStorage.setItem(storeKey,JSON.stringify(db))}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function toBOB(t){return t.currency==='USD'?t.amount*(t.fx||6.96):t.amount}
function fmt(n){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(n)}
function toast(m){const el=$('#toast'); el.textContent=m; el.hidden=false; requestAnimationFrame(()=>el.classList.add('show')); setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.hidden=true,250)},1800)}

$('#menuBtn').addEventListener('click',()=>{$('#drawer').classList.add('open');$('#scrim').classList.add('show')})
$('#drawerClose').addEventListener('click',()=>{$('#drawer').classList.remove('open');$('#scrim').classList.remove('show')})
$('#scrim').addEventListener('click',()=>{$('#drawer').classList.remove('open');$('#scrim').classList.remove('show')})
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>{$$('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');const id=b.dataset.tab; $$('.tab').forEach(t=>t.hidden=true); $('#tab-'+id).hidden=false; $('#drawer').classList.remove('open');$('#scrim').classList.remove('show')}))

function refreshMeta(){ $('#catlist').innerHTML=db.cats.map(c=>`<option value="${c}">`).join(''); $('#filterDebt').innerHTML=`<option value="">Todas las deudas</option>`+db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join(''); $('#amortDebt').innerHTML=db.debts.length?db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join(''):'<option value="">—</option>'; $('#debtId').innerHTML=`<option value="">— Ninguna —</option>`+db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('') }
refreshMeta();

function renderTable(){const q=($('#search').value||'').toLowerCase();const fGroup=$('#filterGroup').value,fDebt=$('#filterDebt').value;const dFrom=$('#dateFrom').value,dTo=$('#dateTo').value;const rows=db.tx.slice().sort((a,b)=>a.date<b.date?1:-1).filter(t=>(!fGroup||t.group===fGroup)&&(!fDebt||t.debtId===fDebt)&&(q===''||[t.category,t.notes].join(' ').toLowerCase().includes(q))&&(!dFrom||(t.date||'')>=dFrom)&&(!dTo||(t.date||'')<=dTo)); const html=[`<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Grupo</th><th>Categoría</th><th>Moneda</th><th>Monto</th><th>BOB</th><th></th></tr></thead><tbody>`,...rows.map(t=>`<tr><td>${t.date}</td><td>${t.type}</td><td>${t.group}</td><td>${t.category}</td><td>${t.currency}</td><td>${t.amount.toFixed(2)}</td><td>${toBOB(t).toFixed(2)}</td><td><button class="btn ghost" data-del="${t.id}">✕</button></td></tr>`),`</tbody></table>`]; $('#txTable').innerHTML=html.join(''); $('#txTable').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{db.tx=db.tx.filter(x=>x.id!==b.dataset.del); save(); renderTable(); updateKPIs(); dash(); toast('Eliminado')}))}
renderTable();
$('#search').addEventListener('input',renderTable); $('#filterGroup').addEventListener('change',renderTable); $('#filterDebt').addEventListener('change',renderTable); $('#dateFrom').addEventListener('change',renderTable); $('#dateTo').addEventListener('change',renderTable); $('#compact').addEventListener('change',()=>{document.body.classList.toggle('compact',$('#compact').checked)})

function countUp(el,to){const start=parseFloat(el.textContent.replace(/[^0-9.-]/g,''))||0;const dur=500;const t0=performance.now();function step(t){const p=Math.min(1,(t-t0)/dur);const val=start+(to-start)*p;el.textContent=fmt(val);if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}

function updateKPIs(){
  const ym = new Date().toISOString().slice(0,7);
  const prevDate = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1);
  const ymPrev = prevDate.toISOString().slice(0,7);

  const sumFor = (month, filterFn)=> db.tx.filter(t=> (t.date||'').slice(0,7)===month).filter(filterFn).reduce((s,t)=> s+toBOB(t),0);
  const ventasC = sumFor(ym, t=> t.group==='ventas' && t.type==='ingreso');
  const costosC = sumFor(ym, t=> t.group==='costos');
  const opexC   = sumFor(ym, t=> t.group==='opex');
  const utilC   = ventasC - costosC - opexC;

  const ventasP = sumFor(ymPrev, t=> t.group==='ventas' && t.type==='ingreso');
  const costosP = sumFor(ymPrev, t=> t.group==='costos');
  const opexP   = sumFor(ymPrev, t=> t.group==='opex');
  const utilP   = ventasP - costosP - opexP;

  const setK = (kpi, val)=>{ document.querySelector(`[data-kpi="${kpi}"]`).textContent = fmt(val); };
  setK('ventas', ventasC); setK('costos', costosC); setK('opex', opexC); setK('utilidad', utilC);

  const setDelta = (key, curr, prev)=>{
    const el = document.querySelector(`[data-delta="${key}"]`); if(!el) return;
    if(prev===0 && curr===0){ el.className='kpi-delta neu'; el.textContent='= sin cambio'; return; }
    if(prev===0){ el.className='kpi-delta pos'; el.textContent='nuevo'; return; }
    const pct = ((curr - prev)/prev)*100;
    const arrow = pct>0 ? '▲' : (pct<0 ? '▼' : '—');
    el.className = 'kpi-delta ' + (pct>0?'pos':(pct<0?'neg':'neu'));
    el.textContent = `${arrow} ${pct.toFixed(1)}% vs ${ymPrev}`;
  };
  setDelta('ventas', ventasC, ventasP);
  setDelta('costos', costosC, costosP);
  setDelta('opex',   opexC,   opexP);
  setDelta('utilidad', utilC, utilP);
}

$('#saveTemplate').addEventListener('click',()=>{const name=($('#tplName').value||'Plantilla').trim(); if(!name)return; const t={name,type:$('#type').value,group:$('#group').value,category:$('#category').value.trim(),currency:$('#currency').value,fx:parseFloat($('#fx').value||6.96),debtId:$('#debtId').value||'',isInterest:$('#isInterest').checked||false}; db.templates.push(t); save(); refreshTplChips(); toast('Plantilla guardada')})

function renderDebts(){const rows=db.debts.map(d=>{const inflow=db.tx.filter(t=>t.debtId===d.id&&t.type==='ingreso').reduce((s,t)=>s+toBOB(t),0);const capOut=db.tx.filter(t=>t.debtId===d.id&&t.type!=='ingreso'&&!t.isInterest).reduce((s,t)=>s+toBOB(t),0);const interestPaid=db.tx.filter(t=>t.debtId===d.id&&t.isInterest&&t.type!=='ingreso').reduce((s,t)=>s+toBOB(t),0);const saldo=inflow-capOut;return `<tr><td>${d.name}</td><td>${d.currency}</td><td>${d.principal?d.principal.toFixed(2):'-'}</td><td>${(d.rate*100).toFixed(2)}%</td><td>${d.term||'-'}</td><td>${d.start?d.start.slice(0,10):''}</td><td>${fmt(saldo)}</td><td>${fmt(interestPaid)}</td></tr>`}).join(''); $('#debtTable').innerHTML=`<table><thead><tr><th>Nombre</th><th>Moneda</th><th>Capital</th><th>Tasa</th><th>Meses</th><th>Inicio</th><th>Saldo (BOB)</th><th>Interés pagado</th></tr></thead><tbody>${rows||'<tr><td colspan="8">Sin deudas</td></tr>'}</tbody></table>`}
renderDebts();

function amortTable(d){ if(!d||!d.term||!d.principal) return []; const r=d.rate/12, n=d.term; const p=(d.currency==='USD'?d.principal*(d.fx||6.96):d.principal); const pay=r>0 ? p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):p/n; let bal=p; const rows=[]; const start=new Date(d.start||new Date().toISOString().slice(0,10)); for(let i=1;i<=n;i++){const interest=r>0?bal*r:0; const capital=pay-interest; bal=Math.max(0,bal-capital); const dt=new Date(start.getFullYear(),start.getMonth()+i-1,1).toISOString().slice(0,10); rows.push({n:i,date:dt,pago:pay,interes:interest,capital:capital,saldo:bal})} return rows}
$('#genAmort').addEventListener('click',()=>{const id=$('#amortDebt').value; const d=db.debts.find(x=>x.id===id); if(!d){$('#amortTable').innerHTML=''; return;} const rows=amortTable(d); const html=[`<table><thead><tr><th>#</th><th>Fecha</th><th>Pago</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr></thead><tbody>`,...rows.map(r=>`<tr><td>${r.n}</td><td>${r.date}</td><td>${fmt(r.pago)}</td><td>${fmt(r.interes)}</td><td>${fmt(r.capital)}</td><td>${fmt(r.saldo)}</td></tr>`),`</tbody></table>`]; $('#amortTable').innerHTML=html.join('')})
$('#postPayment').addEventListener('click',()=>{const id=$('#amortDebt').value; const d=db.debts.find(x=>x.id===id); if(!d) return; const rows=amortTable(d); const ym=new Date().toISOString().slice(0,7); const next=rows.find(r=>r.date.slice(0,7)>=ym); if(!next){alert('Cronograma completo o no configurado.');return;} const today=new Date().toISOString().slice(0,10); const mk=(amount,isInt)=>({id:uid(),amount:parseFloat((amount).toFixed(2)),type:'gasto',group:'financieros',category:isInt?'Interés deuda':'Pago capital deuda',currency:'BOB',fx:'',date:today,notes:`Auto cronograma ${d.name} ${next.date.slice(0,7)}`,debtId:d.id,isInterest:!!isInt}); db.tx.push(mk(next.interes,true)); db.tx.push(mk(next.capital,false)); save(); renderTable(); renderDebts(); updateKPIs(); dash(); toast('Pago del mes registrado')})

$('#assetForm').addEventListener('submit',e=>{e.preventDefault(); const a={id:uid(),name:$('#assetName').value.trim(),cost:parseFloat($('#assetCost').value||0),life:parseInt($('#assetLife').value||0,10),start:$('#assetStart').value||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()}; db.assets.push(a); save(); renderAssets(); toast('Activo agregado'); $('#assetForm').reset()})
function depForMonth(a,ym){const start=a.start.slice(0,7); if(ym<start) return 0; const monthly=a.cost/a.life; const s=new Date(a.start.slice(0,4),parseInt(a.start.slice(5,7))-1,1); const t=new Date(ym.slice(0,4),parseInt(ym.slice(5,7))-1,1); const months=(t.getFullYear()-s.getFullYear())*12+(t.getMonth()-s.getMonth())+1; if(months<=0||months>a.life) return 0; return monthly}
function accDep(a,ym){const s=new Date(a.start.slice(0,4),parseInt(a.start.slice(5,7))-1,1); const t=new Date(ym.slice(0,4),parseInt(ym.slice(5,7))-1,1); let m=(t.getFullYear()-s.getFullYear())*12+(t.getMonth()-s.getMonth())+1; m=Math.max(0,Math.min(m,a.life)); return (a.cost/a.life)*m}
function renderAssets(){const ym=$('#depMonth').value||new Date().toISOString().slice(0,7); $('#depMonth').value=ym; const rows=db.assets.map(a=>{const md=depForMonth(a,ym); const ad=accDep(a,ym); const net=a.cost-ad; return `<tr><td>${a.name}</td><td>${a.start.slice(0,10)}</td><td>${a.life}</td><td>${fmt(a.cost)}</td><td>${fmt(md)}</td><td>${fmt(ad)}</td><td>${fmt(net)}</td></tr>`}).join(''); $('#assetTable').innerHTML=`<table><thead><tr><th>Activo</th><th>Inicio</th><th>Vida (m)</th><th>Costo</th><th>Depreciación mes</th><th>Acumulada</th><th>Valor neto</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Sin activos</td></tr>'}</tbody></table>`}
renderAssets(); $('#calcDep').addEventListener('click',renderAssets); $('#postDep').addEventListener('click',()=>{const ym=$('#depMonth').value||new Date().toISOString().slice(0,7); const total=db.assets.reduce((s,a)=>s+depForMonth(a,ym),0); if(total<=0){alert('No hay depreciación para el mes.'); return;} db.tx.push({id:uid(),amount:parseFloat(total.toFixed(2)),type:'gasto',group:'opex',category:'Depreciación',currency:'BOB',fx:'',date:ym+'-28',notes:`Depreciación ${ym}`,debtId:'',isInterest:false}); save(); renderTable(); updateKPIs(); dash(); toast('Depreciación registrada')})


function dash(){
  const ym = new Date().toISOString().slice(0,7);
  const prevDate = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1);
  const ymPrev = prevDate.toISOString().slice(0,7);
  const sumFor = (month, filterFn)=> db.tx.filter(t=> (t.date||'').slice(0,7)===month).filter(filterFn).reduce((s,t)=> s+toBOB(t),0);
  const ventas = sumFor(ym, t=> t.group==='ventas' && t.type==='ingreso');
  const costos = sumFor(ym, t=> t.group==='costos');
  const opex   = sumFor(ym, t=> t.group==='opex');
  const util   = ventas - costos - opex;
  const ventasP = sumFor(ymPrev, t=> t.group==='ventas' && t.type==='ingreso');
  const costosP = sumFor(ymPrev, t=> t.group==='costos');
  const opexP   = sumFor(ymPrev, t=> t.group==='opex');
  const utilP   = ventasP - costosP - opexP;
  const delta = (c,p)=> p===0?(c===0?'= 0%':'nuevo'):(((c-p)/p*100).toFixed(1)+'%');
  const arrow = (c,p)=> c>p?'▲':(c<p?'▼':'—');
  document.getElementById('dashBox').innerHTML = `
    <div class="kpi"><div class="kpi-label">Periodo</div><div class="kpi-value">${ym}</div><div class="kpi-delta neu">vs ${ymPrev}</div></div>
    <div class="kpi"><div class="kpi-label">Ventas</div><div class="kpi-value">${fmt(ventas)}</div><div class="kpi-delta ${ventas>=ventasP?'pos':(ventas<ventasP?'neg':'neu')}">${arrow(ventas,ventasP)} ${delta(ventas,ventasP)}</div></div>
    <div class="kpi"><div class="kpi-label">Costos</div><div class="kpi-value">${fmt(costos)}</div><div class="kpi-delta ${costos<=costosP?'pos':(costos>costosP?'neg':'neu')}">${arrow(costosP,costos)} ${delta(costos,costosP)}</div></div>
    <div class="kpi"><div class="kpi-label">OPEX</div><div class="kpi-value">${fmt(opex)}</div><div class="kpi-delta ${opex<=opexP?'pos':(opex>opexP?'neg':'neu')}">${arrow(opexP,opex)} ${delta(opex,opexP)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad</div><div class="kpi-value">${fmt(util)}</div><div class="kpi-delta ${util>=utilP?'pos':(util<utilP?'neg':'neu')}">${arrow(util,utilP)} ${delta(util,utilP)}</div></div>
  `;
}
dash();

$('#closeMonth').addEventListener('click',()=>{const ym=new Date().toISOString().slice(0,7); if(db.closures.includes(ym)){if(!confirm('Este mes ya fue cerrado. ¿Cerrar nuevamente?')) return;} let count=0; db.debts.forEach(d=>{ // simple autopost based on amort table
  const rows=amortTable(d); const row=rows.find(r=>r.date.slice(0,7)===ym); if(row){const today=ym+'-28'; const mk=(amount,isInt)=>({id:uid(),amount:parseFloat((amount).toFixed(2)),type:'gasto',group:'financieros',category:isInt?'Interés deuda':'Pago capital deuda',currency:'BOB',fx:'',date:today,notes:`Cierre mes ${ym} ${d.name}`,debtId:d.id,isInterest:!!isInt}); db.tx.push(mk(row.interes,true)); db.tx.push(mk(row.capital,false)); count+=2;}}); const total=db.assets.reduce((s,a)=>s+depForMonth(a,ym),0); if(total>0){db.tx.push({id:uid(),amount:parseFloat(total.toFixed(2)),type:'gasto',group:'opex',category:'Depreciación',currency:'BOB',fx:'',date:ym+'-28',notes:`Depreciación ${ym}`,debtId:'',isInterest:false})} if(!db.closures.includes(ym)) db.closures.push(ym); save(); renderTable(); renderDebts(); renderAssets(); updateKPIs(); dash(); exportJSON(); exportCSV(); openReportPDF(ym); toast(`Mes ${ym} cerrado (${count} asientos + depreciación).`)})

function openReportPDF(ym){const list=db.tx.filter(t=>(t.date||'').slice(0,7)===ym); const ventas=list.filter(t=>t.group==='ventas'&&t.type==='ingreso').reduce((s,t)=>s+toBOB(t),0); const costos=list.filter(t=>t.group==='costos').reduce((s,t)=>s+toBOB(t),0); const opex=list.filter(t=>t.group==='opex').reduce((s,t)=>s+toBOB(t),0); const financieros=list.filter(t=>t.group==='financieros').reduce((s,t)=>s+toBOB(t),0); const cashIn=list.filter(t=>t.type==='ingreso').reduce((s,t)=>s+toBOB(t),0); const cashOut=list.filter(t=>t.type!=='ingreso').reduce((s,t)=>s+toBOB(t),0); const flujo=cashIn-cashOut; const util=ventas-costos-opex; const html=`<!doctype html><html><head><meta charset='utf-8'><title>Reporte ${ym}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto;margin:24px;color:#111;background:#FAF5E6}h1,h2{margin:0 0 8px 0}.brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}.brand img{width:36px;height:36px;border-radius:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px}.mono{font-family:ui-monospace,Menlo,monospace}.k{display:flex;justify-content:space-between;gap:8px}table{width:100%;border-collapse:collapse}th,td{padding:6px;border-bottom:1px solid #eee;text-align:left}@media print{.noprint{display:none}}</style></head><body><div class='brand'><img src='icon-96.png'><div><h1>Terra Nostra — Cierre ${ym}</h1><div class='mono'>${window.APP_TITLE}</div></div></div><div class='grid'><div class='card'><h2>Estado de Resultados</h2><div class='k'><span>Ventas</span><b>${fmt(ventas)}</b></div><div class='k'><span>Costos</span><b>${fmt(costos)}</b></div><div class='k'><span>OPEX</span><b>${fmt(opex)}</b></div><div class='k'><span>Financieros</span><b>${fmt(financieros)}</b></div><hr><div class='k'><span>Utilidad</span><b>${fmt(util)}</b></div></div><div class='card'><h2>Flujo de Caja</h2><div class='k'><span>Entradas</span><b>${fmt(cashIn)}</b></div><div class='k'><span>Salidas</span><b>${fmt(cashOut)}</b></div><hr><div class='k'><span>Flujo Neto</span><b>${fmt(flujo)}</b></div></div></div><button class='noprint' onclick='window.print()'>Imprimir / Guardar PDF</button></body></html>`; const w=window.open('','_blank'); w.document.open(); w.document.write(html); w.document.close(); setTimeout(()=>{try{w.focus(); w.print();}catch(e){}},400)}

function exportJSON(){const name=(window.APP_TITLE||'Contabilidad - Terra Nostra')+'.json'; const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click()}
function exportCSV(){const head=['id','date','type','group','category','currency','fx','amount','amount_bob','notes','debtId','isInterest']; const rows=db.tx.map(t=>[t.id,t.date,t.type,t.group,t.category,t.currency,t.fx||'',t.amount,toBOB(t),t.notes||'',t.debtId||'',t.isInterest].map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')); const csv=[head.join(','),...rows].join('\n'); const name=(window.APP_TITLE||'Contabilidad - Terra Nostra')+'.csv'; const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click()}
$('#exportJson').addEventListener('click',exportJSON); $('#exportCsv').addEventListener('click',exportCSV); $('#exportPdf').addEventListener('click',()=>{const ym=new Date().toISOString().slice(0,7); openReportPDF(ym)})
$('#importJson').addEventListener('change',e=>{const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{try{const data=JSON.parse(reader.result); db=Object.assign({tx:[],cats:[],debts:[],assets:[],closures:[],templates:[],backups:[],fxMemo:{}},data); save(); location.reload()}catch(err){alert('Archivo inválido')}}; reader.readAsText(file)})
$('#resetCache').addEventListener('click',async()=>{if('caches'in window){const keys=await caches.keys(); for(const k of keys) await caches.delete(k); alert('Caché borrada. Actualizá la página.')}})
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js')}


// Theme handling
const THEME_KEY='tn_theme';
function applyTheme(t){ document.body.setAttribute('data-theme', t); const b=document.getElementById('themeToggle'); if(b) b.textContent = t==='light'?'☀️':'🌙'; }
applyTheme(localStorage.getItem(THEME_KEY)||'dark');
const themeBtn=document.getElementById('themeToggle'); if(themeBtn){ themeBtn.addEventListener('click', ()=>{ const cur=document.body.getAttribute('data-theme')==='light'?'light':'dark'; const next=cur==='light'?'dark':'light'; localStorage.setItem(THEME_KEY,next); applyTheme(next); }); }
// Bottom nav sync
document.querySelectorAll('.btab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t=>t.hidden=true);
    document.querySelector('#tab-'+id).hidden=false;
    // also sync drawer nav state
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    const mbtn = Array.from(document.querySelectorAll('.nav-item')).find(n=>n.dataset.tab===id);
    if(mbtn) mbtn.classList.add('active');
  });
});


// Theme handling
const THEME_KEY='tn_theme';
function applyTheme(t){ document.body.setAttribute('data-theme', t); const b=document.getElementById('themeToggle'); if(b) b.textContent = t==='light'?'☀️':'🌙'; }
applyTheme(localStorage.getItem(THEME_KEY)||'dark');
const themeBtn=document.getElementById('themeToggle'); if(themeBtn){ themeBtn.addEventListener('click', ()=>{ const cur=document.body.getAttribute('data-theme')==='light'?'light':'dark'; const next=cur==='light'?'dark':'light'; localStorage.setItem(THEME_KEY,next); applyTheme(next); }); }
// Bottom nav sync
document.querySelectorAll('.btab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t=>t.hidden=true);
    document.querySelector('#tab-'+id).hidden=false;
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    const mbtn = Array.from(document.querySelectorAll('.nav-item')).find(n=>n.dataset.tab===id);
    if(mbtn) mbtn.classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
  });
});
// Tiny ripple on buttons
document.addEventListener('click', (e)=>{
  const el = e.target.closest('.btn, .icon-btn, .btab');
  if(!el) return;
  el.style.overflow='hidden';
  const r = document.createElement('span');
  r.style.position='absolute'; r.style.borderRadius='50%'; r.style.transform='translate(-50%, -50%)';
  r.style.width=r.style.height='10px'; r.style.left=e.offsetX+'px'; r.style.top=e.offsetY+'px';
  r.style.background='rgba(255,255,255,.25)'; r.style.pointerEvents='none'; r.style.opacity='0.8';
  r.animate([{opacity:.25, transform:'translate(-50%,-50%) scale(1)'},{opacity:0, transform:'translate(-50%,-50%) scale(14)'}], {duration:420, easing:'ease-out'});
  el.appendChild(r); setTimeout(()=>r.remove(),420);
}, true);
