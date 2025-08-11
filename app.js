// Contabilidad - Terra Nostra (sin tags)
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
const storeKey = 'contabilidad_tn_v' + (window.APP_VERSION||'1.02').replace('.','_');

let db = load();
function load(){ try{ const raw = localStorage.getItem(storeKey); return raw? JSON.parse(raw): {
  tx:[], cats:["Meta Ads","Comisiones","Sueldos","Alquiler","Internet","Software","Fotografía","Video","Dron","Mantenimiento","Combustible","Honorarios","Banco","Depreciación","Pago capital deuda","Interés deuda"],
  debts:[], assets:[], closures:[]
}; }catch(e){ return {tx:[],cats:[],debts:[],assets:[],closures:[]}; } }
function save(){ localStorage.setItem(storeKey, JSON.stringify(db)); }
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function toBOB(t){ return t.currency==='USD'? t.amount*(t.fx||6.96) : t.amount; }
function fmt(n){ return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(n); }
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.hidden=false; requestAnimationFrame(()=> el.classList.add('show')); setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=> el.hidden=true, 250); }, 1800); }

$$('.nav-item').forEach(b=> b.addEventListener('click', ()=>{ $$('.nav-item').forEach(x=>x.classList.remove('active')); b.classList.add('active'); const id=b.dataset.tab; $$('.tab').forEach(t=>t.hidden=true); $('#tab-'+id).hidden=false; }));

$('#quickAdd').addEventListener('click', ()=>{ const d = $('#movModal'); if(d.showModal) d.showModal(); else d.setAttribute('open',''); });
$('#closeModal').addEventListener('click', ()=>{ const d = $('#movModal'); if(d.close) d.close(); else d.removeAttribute('open'); });

function refreshMeta(){
  $('#catlist').innerHTML = db.cats.map(c=>`<option value="${c}">`).join('');
  $('#filterDebt').innerHTML = `<option value="">Todas las deudas</option>` + db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  $('#amortDebt').innerHTML = db.debts.length? db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join(''): '<option value="">—</option>';
  $('#debtId').innerHTML = `<option value="">— Ninguna —</option>` + db.debts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
}
refreshMeta();

$('#txForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const cat = $('#category').value.trim();
  if(!cat) return;
  if(cat && !db.cats.includes(cat)) db.cats.push(cat);
  const tx = {
    id: uid(), amount: parseFloat($('#amount').value||0),
    type: $('#type').value, group: $('#group').value, category: cat,
    currency: $('#currency').value, fx: parseFloat($('#fx').value||6.96),
    date: $('#date').value || new Date().toISOString().slice(0,10),
    notes: $('#notes').value.trim(), debtId: $('#debtId').value || "", isInterest: $('#isInterest').checked||false
  };
  db.tx.push(tx); save(); renderTable(); updateKPIs(); toast('Movimiento guardado'); $('#txForm').reset();
});

function renderTable(){
  const q = ($('#search').value||'').toLowerCase();
  const fGroup = $('#filterGroup').value, fDebt = $('#filterDebt').value;
  const rows = db.tx.slice().sort((a,b)=> a.date<b.date?1:-1).filter(t=>
    (!fGroup || t.group===fGroup) && (!fDebt || t.debtId===fDebt) &&
    (q==='' || [t.category,t.notes].join(' ').toLowerCase().includes(q))
  );
  const html = [`<table><thead><tr>
    <th>Fecha</th><th>Tipo</th><th>Grupo</th><th>Categoría</th><th>Moneda</th><th>Monto</th><th>BOB</th><th></th>
  </tr></thead><tbody>`,
  ...rows.map(t=>`<tr>
    <td>${t.date}</td><td>${t.type}</td><td>${t.group}</td><td>${t.category}</td>
    <td>${t.currency}</td><td>${t.amount.toFixed(2)}</td><td>${toBOB(t).toFixed(2)}</td>
    <td><button class="btn ghost" data-del="${t.id}">✕</button></td></tr>`),
  `</tbody></table>`];
  $('#txTable').innerHTML = html.join('');
  $('#txTable').querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=>{
    db.tx = db.tx.filter(x=> x.id!==b.dataset.del); save(); renderTable(); updateKPIs(); toast('Eliminado');
  }));
}
renderTable();
$('#search').addEventListener('input', renderTable);
$('#filterGroup').addEventListener('change', renderTable);
$('#filterDebt').addEventListener('change', renderTable);

function countUp(el, to){ const start = parseFloat(el.textContent.replace(/[^0-9.-]/g,''))||0; const dur=500; const t0=performance.now(); function step(t){ const p=Math.min(1,(t-t0)/dur); const val=start+(to-start)*p; el.textContent=fmt(val); if(p<1) requestAnimationFrame(step); } requestAnimationFrame(step); }
function updateKPIs(){
  const ym = new Date().toISOString().slice(0,7);
  const list = db.tx.filter(t=> (t.date||'').slice(0,7)===ym);
  const ventas = list.filter(t=> t.group==='ventas' && t.type==='ingreso').reduce((s,t)=> s+toBOB(t),0);
  const costos = list.filter(t=> t.group==='costos').reduce((s,t)=> s+toBOB(t),0);
  const opex   = list.filter(t=> t.group==='opex').reduce((s,t)=> s+toBOB(t),0);
  const util   = ventas - costos - opex;
  countUp(document.querySelector('[data-kpi="ventas"]'), ventas);
  countUp(document.querySelector('[data-kpi="costos"]'), costos);
  countUp(document.querySelector('[data-kpi="opex"]'), opex);
  countUp(document.querySelector('[data-kpi="utilidad"]'), util);
}
updateKPIs();

$('#debtForm').addEventListener('submit', e=>{
  e.preventDefault();
  const d = { id: uid(), name: $('#debtName').value.trim(), currency: $('#debtCurrency').value, fx: parseFloat($('#debtFx').value||6.96),
    principal: parseFloat($('#debtPrincipal').value||0), rate: parseFloat($('#debtRate').value||0)/100, term: parseInt($('#debtTerm').value||0,10),
    start: $('#debtStart').value || new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() };
  db.debts.push(d); save(); refreshMeta(); renderDebts(); toast('Deuda creada'); $('#debtForm').reset();
});
function toBOBValue(cur, fx, amount){ return cur==='USD'? amount*(fx||6.96): amount; }
function debtSaldo(debtId){
  const inflow = db.tx.filter(t=> t.debtId===debtId && t.type==='ingreso').reduce((s,t)=> s+toBOB(t),0);
  const capOut = db.tx.filter(t=> t.debtId===debtId && t.type!=='ingreso' && !t.isInterest).reduce((s,t)=> s+toBOB(t),0);
  const interestPaid = db.tx.filter(t=> t.debtId===debtId && t.isInterest && t.type!=='ingreso').reduce((s,t)=> s+toBOB(t),0);
  return {saldo: inflow - capOut, interestPaid};
}
function renderDebts(){
  const rows = db.debts.map(d=>{
    const k = debtSaldo(d.id);
    return `<tr><td>${d.name}</td><td>${d.currency}</td><td>${d.principal?d.principal.toFixed(2):'-'}</td><td>${(d.rate*100).toFixed(2)}%</td><td>${d.term||'-'}</td><td>${d.start.slice(0,10)}</td><td>${fmt(k.saldo)}</td><td>${fmt(k.interestPaid)}</td></tr>`;
  }).join('');
  $('#debtTable').innerHTML = `<table><thead><tr><th>Nombre</th><th>Moneda</th><th>Capital</th><th>Tasa</th><th>Meses</th><th>Inicio</th><th>Saldo (BOB)</th><th>Interés pagado</th></tr></thead><tbody>${rows||'<tr><td colspan="8">Sin deudas</td></tr>'}</tbody></table>`;
}
renderDebts();
function amortTable(d){
  if(!d || !d.term || !d.principal) return [];
  const r = d.rate/12, n = d.term;
  const p = toBOBValue(d.currency, d.fx, d.principal);
  const pay = r>0 ? p * (r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1) : p/n;
  let bal = p; const rows = []; const start = new Date(d.start);
  for(let i=1;i<=n;i++){
    const interest = r>0 ? bal*r : 0;
    const capital = pay - interest;
    bal = Math.max(0, bal - capital);
    const dt = new Date(start.getFullYear(), start.getMonth()+i-1, 1).toISOString().slice(0,10);
    rows.push({n:i, date:dt, pago:pay, interes:interest, capital:capital, saldo:bal});
  }
  return rows;
}
$('#genAmort').addEventListener('click', ()=>{
  const id = $('#amortDebt').value; const d = db.debts.find(x=>x.id===id); if(!d){ $('#amortTable').innerHTML=''; return; }
  const rows = amortTable(d);
  const html = [`<table><thead><tr><th>#</th><th>Fecha</th><th>Pago</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr></thead><tbody>`,
    ...rows.map(r=>`<tr><td>${r.n}</td><td>${r.date}</td><td>${fmt(r.pago)}</td><td>${fmt(r.interes)}</td><td>${fmt(r.capital)}</td><td>${fmt(r.saldo)}</td></tr>`),
    `</tbody></table>`];
  $('#amortTable').innerHTML = html.join('');
});
$('#postPayment').addEventListener('click', ()=>{
  const id = $('#amortDebt').value; const d = db.debts.find(x=>x.id===id); if(!d) return;
  const rows = amortTable(d); const ym = new Date().toISOString().slice(0,7);
  const next = rows.find(r=> r.date.slice(0,7) >= ym); if(!next){ alert('Cronograma completo o no configurado.'); return; }
  const today = new Date().toISOString().slice(0,10);
  const mk = (amount, isInt)=> ({ id: uid(), amount: parseFloat((amount).toFixed(2)), type:'gasto', group:'financieros', category: isInt?'Interés deuda':'Pago capital deuda', currency:'BOB', fx:'', date: today, notes:`Auto cronograma ${d.name} ${next.date.slice(0,7)}`, debtId:d.id, isInterest:!!isInt });
  db.tx.push(mk(next.interes,true)); db.tx.push(mk(next.capital,false));
  save(); renderTable(); renderDebts(); updateKPIs(); toast('Pago del mes registrado');
});

$('#assetForm').addEventListener('submit', e=>{
  e.preventDefault();
  const a = { id: uid(), name: $('#assetName').value.trim(), cost: parseFloat($('#assetCost').value||0), life: parseInt($('#assetLife').value||0,10), start: $('#assetStart').value || new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() };
  db.assets.push(a); save(); renderAssets(); toast('Activo agregado'); $('#assetForm').reset();
});
function depForMonth(a, ym){
  const start = a.start.slice(0,7); if(ym<start) return 0;
  const monthly = a.cost / a.life;
  const s = new Date(a.start.slice(0,4), parseInt(a.start.slice(5,7))-1, 1);
  const t = new Date(ym.slice(0,4), parseInt(ym.slice(5,7))-1, 1);
  const months = (t.getFullYear()-s.getFullYear())*12 + (t.getMonth()-s.getMonth()) + 1;
  if(months<=0 || months>a.life) return 0;
  return monthly;
}
function accDep(a, ym){
  const s = new Date(a.start.slice(0,4), parseInt(a.start.slice(5,7))-1, 1);
  const t = new Date(ym.slice(0,4), parseInt(ym.slice(5,7))-1, 1);
  let m = (t.getFullYear()-s.getFullYear())*12 + (t.getMonth()-s.getMonth()) + 1;
  m = Math.max(0, Math.min(m, a.life));
  return (a.cost / a.life) * m;
}
function renderAssets(){
  const ym = $('#depMonth').value || new Date().toISOString().slice(0,7);
  $('#depMonth').value = ym;
  const rows = db.assets.map(a=>{
    const md = depForMonth(a, ym); const ad = accDep(a, ym); const neto = a.cost - ad;
    return `<tr><td>${a.name}</td><td>${a.start.slice(0,10)}</td><td>${a.life}</td><td>${fmt(a.cost)}</td><td>${fmt(md)}</td><td>${fmt(ad)}</td><td>${fmt(neto)}</td></tr>`;
  }).join('');
  $('#assetTable').innerHTML = `<table><thead><tr><th>Activo</th><th>Inicio</th><th>Vida (m)</th><th>Costo</th><th>Depreciación mes</th><th>Acumulada</th><th>Valor neto</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Sin activos</td></tr>'}</tbody></table>`;
}
renderAssets();
$('#calcDep').addEventListener('click', renderAssets);
$('#postDep').addEventListener('click', ()=>{ const ym = $('#depMonth').value || new Date().toISOString().slice(0,7); postDepreciation(ym); });

function postDepreciation(ym){
  const total = db.assets.reduce((s,a)=> s + depForMonth(a, ym), 0);
  if(total<=0){ alert('No hay depreciación para el mes.'); return false; }
  const tx = { id: uid(), amount: parseFloat(total.toFixed(2)), type:'gasto', group:'opex', category:'Depreciación', currency:'BOB', fx:'', date: ym+'-28', notes:`Depreciación ${ym}`, debtId:'', isInterest:false };
  db.tx.push(tx); save(); renderTable(); updateKPIs(); toast('Depreciación registrada'); return true;
}

function dash(){
  const ym = new Date().toISOString().slice(0,7);
  const list = db.tx.filter(t=> (t.date||'').slice(0,7)===ym);
  const ventas = list.filter(t=> t.group==='ventas' && t.type==='ingreso').reduce((s,t)=> s+toBOB(t),0);
  const costos = list.filter(t=> t.group==='costos').reduce((s,t)=> s+toBOB(t),0);
  const opex   = list.filter(t=> t.group==='opex').reduce((s,t)=> s+toBOB(t),0);
  const util   = ventas - costos - opex;
  $('#dashBox').innerHTML = `
    <div class="kpi"><div class="kpi-label">Periodo</div><div class="kpi-value">${ym}</div></div>
    <div class="kpi"><div class="kpi-label">Ventas</div><div class="kpi-value">${fmt(ventas)}</div></div>
    <div class="kpi"><div class="kpi-label">Costos</div><div class="kpi-value">${fmt(costos)}</div></div>
    <div class="kpi"><div class="kpi-label">OPEX</div><div class="kpi-value">${fmt(opex)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad</div><div class="kpi-value">${fmt(util)}</div></div>
  `;
}
dash();

$('#closeMonth').addEventListener('click', closeMonth);
function closeMonth(){
  const ym = new Date().toISOString().slice(0,7);
  if(db.closures.includes(ym)){ if(!confirm('Este mes ya fue cerrado. ¿Cerrar nuevamente?')) return; }
  let count=0;
  for(const d of db.debts){
    const rows = amortTable(d);
    const row = rows.find(r=> r.date.slice(0,7)===ym);
    if(row){
      const today = ym+'-28';
      const mk = (amount, isInt)=> ({ id: uid(), amount: parseFloat((amount).toFixed(2)), type:'gasto', group:'financieros', category: isInt?'Interés deuda':'Pago capital deuda', currency:'BOB', fx:'', date: today, notes:`Cierre mes ${ym} ${d.name}`, debtId:d.id, isInterest:!!isInt });
      db.tx.push(mk(row.interes,true)); db.tx.push(mk(row.capital,false)); count+=2;
    }
  }
  const depDone = postDepreciation(ym);
  save(); renderTable(); renderDebts(); renderAssets(); updateKPIs(); dash();
  if(!db.closures.includes(ym)) db.closures.push(ym);
  exportJSON(); exportCSV();
  toast(`Mes ${ym} cerrado (${count} asientos + depreciación).`);
}

function exportJSON(){
  const name = (window.APP_TITLE||'Contabilidad - Terra Nostra') + '.json';
  const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
function exportCSV(){
  const head = ['id','date','type','group','category','currency','fx','amount','amount_bob','notes','debtId','isInterest'];
  const rows = db.tx.map(t=> [t.id,t.date,t.type,t.group,t.category,t.currency,t.fx||'',t.amount,toBOB(t),t.notes||'',t.debtId||'',t.isInterest]
    .map(x=>`"${String(x).replaceAll('"','""')}"`).join(','));
  const csv = [head.join(','), ...rows].join('\n');
  const name = (window.APP_TITLE||'Contabilidad - Terra Nostra') + '.csv';
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}

$('#exportJson').addEventListener('click', exportJSON);
$('#exportCsv').addEventListener('click', exportCSV);

$('#importJson').addEventListener('change', (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{ const data = JSON.parse(reader.result);
      db = Object.assign({tx:[],cats:[],debts:[],assets:[],closures:[]}, data);
      save(); refreshMeta(); renderTable(); renderDebts(); renderAssets(); updateKPIs(); dash();
      toast('Importado');
    }catch(err){ alert('Archivo inválido'); }
  };
  reader.readAsText(file);
});

$('#resetCache').addEventListener('click', async ()=>{
  if('caches' in window){ const keys = await caches.keys(); for(const k of keys) await caches.delete(k); alert('Caché borrada. Actualizá la página.'); }
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; $('#installBtn').style.display='inline-flex'; });
$('#installBtn').addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; $('#installBtn').style.display='none'; });
