
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const VERSION=(window.APP_VERSION||'1.07');
const BASE_KEY='contabilidad_tn';
(function migrate(){
  if(localStorage.getItem(BASE_KEY)) return;
  const legacyKeys = Object.keys(localStorage).filter(k=>k.startsWith('contabilidad_tn_v'));
  for(const k of legacyKeys){
    try{
      const raw = localStorage.getItem(k);
      if(raw && JSON.parse(raw)){
        localStorage.setItem(BASE_KEY, raw);
        break;
      }
    }catch(e){}
  }
})();
let db=JSON.parse(localStorage.getItem(BASE_KEY)||'{}');
if(!db.tx){db={tx:[],cats:['Meta Ads','Comisiones','Sueldos','Alquiler','Internet','Software','Fotografía','Video','Dron','Mantenimiento','Combustible','Honorarios','Banco','Depreciación','Pago capital deuda','Interés deuda'],debts:[],assets:[],closures:[],templates:[],backups:[],fxMemo:{},accounts:[],journals:[]};}
function save(){localStorage.setItem(BASE_KEY,JSON.stringify(db))}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function toBOB(t){return t.currency==='USD'?t.amount*(t.fx||6.96):t.amount}
function fmt(n){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(n)}
function toast(m){const el=$('#toast'); el.textContent=m; el.hidden=false; requestAnimationFrame(()=>el.classList.add('show')); setTimeout(()=>{el.classList.remove('show'); setTimeout(()=>el.hidden=true,250)},1800)}

// Theme
const THEME_KEY='tn_theme';
function applyTheme(t){ document.body.setAttribute('data-theme', t); const b=$('#themeToggle'); if(b) b.textContent = t==='light'?'☀️':'🌙'; }
applyTheme(localStorage.getItem(THEME_KEY)||'dark');
$('#themeToggle').addEventListener('click', ()=>{ const cur=document.body.getAttribute('data-theme')==='light'?'light':'dark'; const next=cur==='light'?'dark':'light'; localStorage.setItem(THEME_KEY,next); applyTheme(next); });

// Drawer & tabs
$('#menuBtn').addEventListener('click',()=>{$('#drawer').classList.add('open');$('#scrim').classList.add('show')})
$('#drawerClose').addEventListener('click',()=>{$('#drawer').classList.remove('open');$('#scrim').classList.remove('show')})
$('#scrim').addEventListener('click',()=>{$('#drawer').classList.remove('open');$('#scrim').classList.remove('show')})
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>{$$('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');const id=b.dataset.tab; $$('.tab').forEach(t=>t.hidden=true); $('#tab-'+id).hidden=false; $('#drawer').classList.remove('open');$('#scrim').classList.remove('show')}))
$$('.btab').forEach(btn=>btn.addEventListener('click',()=>{$$('.btab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const id=btn.dataset.tab; $$('.tab').forEach(t=>t.hidden=true); $('#tab-'+id).hidden=false; $$('.nav-item').forEach(x=>x.classList.remove('active')); const mbtn=[...$$('.nav-item')].find(n=>n.dataset.tab===id); if(mbtn) mbtn.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'})}))

// Movimientos
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
  const setK = (kpi, val)=>{ const el=document.querySelector(`[data-kpi="${kpi}"]`); if(el) countUp(el,val); };
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
updateKPIs();
function dash(){const ym=new Date().toISOString().slice(0,7); const prevDate=new Date(new Date().getFullYear(),new Date().getMonth()-1,1); const ymPrev=prevDate.toISOString().slice(0,7); const sumFor=(m,fn)=>db.tx.filter(t=>(t.date||'').slice(0,7)===m).filter(fn).reduce((s,t)=>s+toBOB(t),0); const ventas=sumFor(ym,t=>t.group==='ventas'&&t.type==='ingreso'); const costos=sumFor(ym,t=>t.group==='costos'); const opex=sumFor(ym,t=>t.group==='opex'); const util=ventas-costos-opex; const ventasP=sumFor(ymPrev,t=>t.group==='ventas'&&t.type==='ingreso'); const costosP=sumFor(ymPrev,t=>t.group==='costos'); const opexP=sumFor(ymPrev,t=>t.group==='opex'); const utilP=ventasP-costosP-opexP; const delta=(c,p)=> p===0?(c===0?'= 0%':'nuevo'):(((c-p)/p*100).toFixed(1)+'%'); const arrow=(c,p)=> c>p?'▲':(c<p?'▼':'—'); $('#dashBox').innerHTML = `<div class="kpi"><div class="kpi-label">Periodo</div><div class="kpi-value">${ym}</div><div class="kpi-delta neu">vs ${ymPrev}</div></div><div class="kpi"><div class="kpi-label">Ventas</div><div class="kpi-value">${fmt(ventas)}</div><div class="kpi-delta ${ventas>=ventasP?'pos':(ventas<ventasP?'neg':'neu')}">${arrow(ventas,ventasP)} ${delta(ventas,ventasP)}</div></div><div class="kpi"><div class="kpi-label">Costos</div><div class="kpi-value">${fmt(costos)}</div><div class="kpi-delta ${costos<=costosP?'pos':(costos>costosP?'neg':'neu')}">${arrow(costosP,costos)} ${delta(costos,costosP)}</div></div><div class="kpi"><div class="kpi-label">OPEX</div><div class="kpi-value">${fmt(opex)}</div><div class="kpi-delta ${opex<=opexP?'pos':(opex>opexP?'neg':'neu')}">${arrow(opexP,opex)} ${delta(opex,opexP)}</div></div><div class="kpi"><div class="kpi-label">Utilidad</div><div class="kpi-value">${fmt(util)}</div><div class="kpi-delta ${util>=utilP?'pos':(util<utilP?'neg':'neu')}">${arrow(util,utilP)} ${delta(util,utilP)}</div></div>`}
dash();

// Mov modal
$('#fab').addEventListener('click',()=>{const d=$('#movModal'); if(d.showModal)d.showModal(); else d.setAttribute('open',''); refreshTplChips()})
$('#closeModal').addEventListener('click',()=>{const d=$('#movModal'); if(d.close)d.close(); else d.removeAttribute('open')})
$('#date').addEventListener('change',()=>{const d=$('#date').value; if(d&&db.fxMemo[d]) $('#fx').value=db.fxMemo[d]})
$('#txForm').addEventListener('submit',e=>{e.preventDefault();const cat=$('#category').value.trim(); if(!cat) return; if(!db.cats.includes(cat)) db.cats.push(cat); const date=$('#date').value||new Date().toISOString().slice(0,10); const fx=parseFloat($('#fx').value||6.96); db.fxMemo[date]=fx; const tx={id:uid(),amount:parseFloat($('#amount').value||0),type:$('#type').value,group:$('#group').value,category:cat,currency:$('#currency').value,fx,date,notes:$('#notes').value.trim(),debtId:$('#debtId').value||'',isInterest:$('#isInterest').checked||false}; db.tx.push(tx); save(); renderTable(); updateKPIs(); dash(); toast('Movimiento guardado'); $('#txForm').reset(); const d=$('#movModal'); if(d.close)d.close()})
function refreshTplChips(){const el=$('#tplChips'); if(!el) return; el.innerHTML=db.templates.slice(-6).reverse().map((t,i)=>`<span class='chip' data-idx='${db.templates.length-1-i}'>${t.name}</span>`).join(''); el.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{const t=db.templates[parseInt(c.dataset.idx)]; if(!t)return; $('#type').value=t.type; $('#group').value=t.group; $('#category').value=t.category; $('#currency').value=t.currency; $('#fx').value=t.fx; $('#debtId').value=t.debtId; $('#isInterest').checked=!!t.isInterest}))}
$('#saveTemplate').addEventListener('click',()=>{const name=($('#tplName').value||'Plantilla').trim(); if(!name)return; const t={name,type:$('#type').value,group:$('#group').value,category:$('#category').value.trim(),currency:'#{$('#currency').value}',fx:parseFloat($('#fx').value||6.96),debtId:$('#debtId').value||'',isInterest:$('#isInterest').checked||false}; db.templates.push(t); save(); refreshTplChips(); toast('Plantilla guardada')})

// Debts & assets (same as earlier simplified)
function renderDebts(){const rows=db.debts.map(d=>{const inflow=db.tx.filter(t=>t.debtId===d.id&&t.type==='ingreso').reduce((s,t)=>s+toBOB(t),0);const capOut=db.tx.filter(t=>t.debtId===d.id&&t.type!=='ingreso'&&!t.isInterest).reduce((s,t)=>s+toBOB(t),0);const interestPaid=db.tx.filter(t=>t.debtId===d.id&&t.isInterest&&t.type!=='ingreso').reduce((s,t)=>s+toBOB(t),0);const saldo=inflow-capOut;return `<tr><td>${d.name}</td><td>${d.currency}</td><td>${d.principal?d.principal.toFixed(2):'-'}</td><td>${(d.rate*100).toFixed(2)}%</td><td>${d.term||'-'}</td><td>${d.start?d.start.slice(0,10):''}</td><td>${fmt(saldo)}</td><td>${fmt(interestPaid)}</td></tr>`}).join(''); $('#debtTable').innerHTML=`<table><thead><tr><th>Nombre</th><th>Moneda</th><th>Capital</th><th>Tasa</th><th>Meses</th><th>Inicio</th><th>Saldo (BOB)</th><th>Interés pagado</th></tr></thead><tbody>${rows||'<tr><td colspan="8">Sin deudas</td></tr>'}</tbody></table>`}
$('#debtForm').addEventListener('submit',e=>{e.preventDefault(); const d={id:uid(),name:$('#debtName').value.trim(),currency:$('#debtCurrency').value,fx:parseFloat($('#debtFx').value||6.96),principal:parseFloat($('#debtPrincipal').value||0),rate:parseFloat($('#debtRate').value||0)/100,term:parseInt($('#debtTerm').value||0,10),start:$('#debtStart').value||new Date().toISOString().slice(0,10)}; db.debts.push(d); save(); renderDebts(); refreshMeta(); toast('Deuda creada'); $('#debtForm').reset()})
function amortTable(d){ if(!d||!d.term||!d.principal) return []; const r=d.rate/12, n=d.term; const p=(d.currency==='USD'?d.principal*(d.fx||6.96):d.principal); const pay=r>0 ? p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):p/n; let bal=p; const rows=[]; const start=new Date(d.start||new Date().toISOString().slice(0,10)); for(let i=1;i<=n;i++){const interest=r>0?bal*r:0; const capital=pay-interest; bal=Math.max(0,bal-capital); const dt=new Date(start.getFullYear(),start.getMonth()+i-1,1).toISOString().slice(0,10); rows.push({n:i,date:dt,pago:pay,interes:interest,capital:capital,saldo:bal})} return rows}
$('#genAmort').addEventListener('click',()=>{const d=db.debts.find(x=>x.id===$('#amortDebt').value); if(!d){$('#amortTable').innerHTML=''; return;} const rows=amortTable(d); const html=[`<table><thead><tr><th>#</th><th>Fecha</th><th>Pago</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr></thead><tbody>`,...rows.map(r=>`<tr><td>${r.n}</td><td>${r.date}</td><td>${fmt(r.pago)}</td><td>${fmt(r.interes)}</td><td>${fmt(r.capital)}</td><td>${fmt(r.saldo)}</td></tr>`),`</tbody></table>`]; $('#amortTable').innerHTML=html.join('')})
$('#postPayment').addEventListener('click',()=>{const d=db.debts.find(x=>x.id===$('#amortDebt').value); if(!d) return; const rows=amortTable(d); const ym=new Date().toISOString().slice(0,7); const next=rows.find(r=>r.date.slice(0,7)>=ym); if(!next){alert('Cronograma completo');return;} const today=new Date().toISOString().slice(0,10); const mk=(amount,isInt)=>({id:uid(),amount:parseFloat((amount).toFixed(2)),type:'gasto',group:'financieros',category:isInt?'Interés deuda':'Pago capital deuda',currency:'BOB',fx:'',date:today,notes:`Auto cronograma ${d.name} ${next.date.slice(0,7)}`,debtId:d.id,isInterest:!!isInt}); db.tx.push(mk(next.interes,true)); db.tx.push(mk(next.capital,false)); save(); renderTable(); renderDebts(); updateKPIs(); dash(); toast('Pago del mes registrado')})

$('#assetForm').addEventListener('submit',e=>{e.preventDefault(); const a={id:uid(),name:$('#assetName').value.trim(),cost:parseFloat($('#assetCost').value||0),life:parseInt($('#assetLife').value||0,10),start:$('#assetStart').value||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()}; db.assets.push(a); save(); renderAssets(); toast('Activo agregado'); $('#assetForm').reset()})
function depForMonth(a,ym){const start=a.start.slice(0,7); if(ym<start) return 0; const monthly=a.cost/a.life; const s=new Date(a.start.slice(0,4),parseInt(a.start.slice(5,7))-1,1); const t=new Date(ym.slice(0,4),parseInt(ym.slice(5,7))-1,1); const months=(t.getFullYear()-s.getFullYear())*12+(t.getMonth()-s.getMonth())+1; if(months<=0||months>a.life) return 0; return monthly}
function accDep(a,ym){const s=new Date(a.start.slice(0,4),parseInt(a.start.slice(5,7))-1,1); const t=new Date(ym.slice(0,4),parseInt(ym.slice(5,7))-1,1); let m=(t.getFullYear()-s.getFullYear())*12+(t.getMonth()-s.getMonth())+1; m=Math.max(0,Math.min(m,a.life)); return (a.cost/a.life)*m}
function renderAssets(){const ym=$('#depMonth').value||new Date().toISOString().slice(0,7); $('#depMonth').value=ym; const rows=db.assets.map(a=>{const md=depForMonth(a,ym); const ad=accDep(a,ym); const net=a.cost-ad; return `<tr><td>${a.name}</td><td>${a.start.slice(0,10)}</td><td>${a.life}</td><td>${fmt(a.cost)}</td><td>${fmt(md)}</td><td>${fmt(ad)}</td><td>${fmt(net)}</td></tr>`}).join(''); $('#assetTable').innerHTML=`<table><thead><tr><th>Activo</th><th>Inicio</th><th>Vida (m)</th><th>Costo</th><th>Depreciación mes</th><th>Acumulada</th><th>Valor neto</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Sin activos</td></tr>'}</tbody></table>`}
renderAssets(); $('#calcDep').addEventListener('click',renderAssets); $('#postDep').addEventListener('click',()=>{const ym=$('#depMonth').value||new Date().toISOString().slice(0,7); const total=db.assets.reduce((s,a)=>s+depForMonth(a,ym),0); if(total<=0){alert('No hay depreciación'); return;} db.tx.push({id:uid(),amount:parseFloat(total.toFixed(2)),type:'gasto',group:'opex',category:'Depreciación',currency:'BOB',fx:'',date:ym+'-28',notes:`Depreciación ${ym}`,debtId:'',isInterest:false}); save(); renderTable(); updateKPIs(); dash(); toast('Depreciación registrada')})

// Close month (no IVA aún; se hará en V1.08)
$('#closeMonth').addEventListener('click',()=>{const ym=new Date().toISOString().slice(0,7); if(db.closures.includes(ym)){if(!confirm('Este mes ya fue cerrado. ¿Cerrar nuevamente?')) return;} let count=0; db.debts.forEach(d=>{ const rows=(()=>{ const r=d.rate/12, n=d.term; const p=(d.currency==='USD'?d.principal*(d.fx||6.96):d.principal); const pay=r>0 ? p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):p/n; let bal=p; const rs=[]; const start=new Date(d.start||new Date().toISOString().slice(0,10)); for(let i=1;i<=n;i++){const interest=r>0?bal*r:0; const capital=pay-interest; bal=Math.max(0,bal-capital); const dt=new Date(start.getFullYear(),start.getMonth()+i-1,1).toISOString().slice(0,10); rs.push({n:i,date:dt,pago:pay,interes:interest,capital:capital,saldo:bal})} return rs })(); const row=rows.find(r=>r.date.slice(0,7)===ym); if(row){const today=ym+'-28'; const mk=(amount,isInt)=>({id:uid(),amount:parseFloat((amount).toFixed(2)),type:'gasto',group:'financieros',category:isInt?'Interés deuda':'Pago capital deuda',currency:'BOB',fx:'',date:today,notes:`Cierre mes ${ym} ${d.name}`,debtId:d.id,isInterest:!!isInt}); db.tx.push(mk(row.interes,true)); db.tx.push(mk(row.capital,false)); count+=2;}}); const total=db.assets.reduce((s,a)=>s+depForMonth(a,ym),0); if(total>0){db.tx.push({id:uid(),amount:parseFloat(total.toFixed(2)),type:'gasto',group:'opex',category:'Depreciación',currency:'BOB',fx:'',date:ym+'-28',notes:`Depreciación ${ym}`,debtId:'',isInterest:false})} if(!db.closures.includes(ym)) db.closures.push(ym); save(); renderTable(); renderDebts(); renderAssets(); updateKPIs(); dash(); toast(`Mes ${ym} cerrado.`)})

// ===== V1.07: PUCT + Journals =====
function loadPUCT(){
  if(db.accounts && db.accounts.length>0){ renderCoA(); return; }
  fetch('accounts.json').then(r=>r.json()).then(list=>{ db.accounts = list; save(); renderCoA(); });
}
loadPUCT();
function renderCoA(){
  const q = ($('#coaSearch')?.value||'').toLowerCase();
  const rows = db.accounts.slice().sort((a,b)=> a.code<b.code?-1:1).filter(a=> !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  const html = [`<table><thead><tr><th>Código</th><th>Nombre</th><th>Nivel</th><th>Clase</th><th></th></tr></thead><tbody>`,
    ...rows.map(a=> `<tr><td class="mono">${a.code}</td><td>${a.name}</td><td>${a.level}</td><td>${a.class}</td><td>${a.level<=4?'<span class="badge lock">PUCT</span>':''}</td></tr>`),
    `</tbody></table>`];
  $('#coaTree').innerHTML = html.join('');
}
$('#coaSearch').addEventListener('input', renderCoA);
$('#reloadPUCT').addEventListener('click', ()=>{ db.accounts=[]; save(); loadPUCT(); toast('PUCT recargado'); });
$('#exportCoA').addEventListener('click', ()=>{
  const head = ['code','name','class','level'];
  const rows = db.accounts.map(a=> head.map(k=> `"${String(a[k]).replaceAll('"','""')}"`).join(',') );
  const csv = [head.join(','), ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Plan_de_Cuentas_PUCT.csv'; a.click();
});
$('#addAnalytic').addEventListener('click', ()=>{
  const parent = ($('#coaParent').value||'').trim();
  const code = ($('#coaCode').value||'').trim();
  const name = ($('#coaName').value||'').trim();
  if(!parent || !/^\d+(\.\d+){3}$/.test(parent)){ alert('El padre debe ser 4º nivel (d.d.d.d)'); return; }
  if(!/^\d+(\.\d+){4}$/.test(code)){ alert('Código analítico 5º nivel (d.d.d.d.d)'); return; }
  if(!name){ alert('Nombre requerido'); return; }
  if(!db.accounts.find(a=>a.code===parent)){ alert('Cuenta padre no existe en el PUCT'); return; }
  if(db.accounts.find(a=>a.code===code)){ alert('Ese código ya existe'); return; }
  const cls = parent.replace(/[^0-9]/g,'')[0];
  db.accounts.push({code, name, class: cls, level: 5});
  save(); renderCoA(); toast('Subcuenta creada');
  $('#coaCode').value=''; $('#coaName').value='';
});

// Journals
function renderJournals(){
  const rows = db.journals.slice().sort((a,b)=> (a.date<b.date)?1:-1);
  const html = [`<table><thead><tr><th>Fecha</th><th>Ref</th><th>Líneas</th><th>Debe</th><th>Haber</th></tr></thead><tbody>`,
    ...rows.map(j=>{
      const d = j.lines.reduce((s,l)=> ({debe:s.debe+(parseFloat(l.debe)||0), haber:s.haber+(parseFloat(l.haber)||0)}), {debe:0, haber:0});
      return `<tr><td>${j.date||''}</td><td>${j.ref||''}</td><td>${j.lines.length}</td><td>${fmt(d.debe)}</td><td>${fmt(d.haber)}</td></tr>`;
    }),
    `</tbody></table>`];
  $('#journalsTable').innerHTML = html.join('');
}
renderJournals();
$('#newJournal').addEventListener('click', openJournal);
$('#closeJournal').addEventListener('click', closeJournal);
function openJournal(){ const d=$('#journalModal'); if(d.showModal) d.showModal(); else d.setAttribute('open',''); _lines=[{},{},{}]; buildJL(_lines); $('#jDate').value = new Date().toISOString().slice(0,10); sumJL(); }
function closeJournal(){ const d=$('#journalModal'); if(d.close) d.close(); else d.removeAttribute('open'); }

function buildJL(lines){
  const row = (i,l)=> `<tr>
    <td><input class="inline" list="accList" data-i="${i}" data-k="acc" value="${l.acc||''}" placeholder="Código"></td>
    <td><input class="inline" data-i="${i}" data-k="accName" value="${l.accName||''}" placeholder="Nombre"></td>
    <td><input class="inline" type="number" step="0.01" data-i="${i}" data-k="debe" value="${l.debe||''}"></td>
    <td><input class="inline" type="number" step="0.01" data-i="${i}" data-k="haber" value="${l.haber||''}"></td>
    <td><button class="btn ghost" data-del="${i}">✕</button></td>
  </tr>`;
  const html = [`<table><thead><tr><th>Cuenta</th><th>Nombre</th><th>Debe</th><th>Haber</th><th></th></tr></thead><tbody>`,
    ...lines.map((l,i)=> row(i,l)),
    `</tbody></table>
    <datalist id="accList">${db.accounts.slice(0,2000).map(a=> `<option value="${a.code}">${a.name}</option>`).join('')}</datalist>`];
  $('#jlLines').innerHTML = html.join('');
  $('#jlLines').querySelectorAll('input').forEach(inp=> inp.addEventListener('input', onJLChange));
  $('#jlLines').querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=>{ const i=parseInt(b.dataset.del); _lines.splice(i,1); buildJL(_lines); sumJL(); }));
}
let _lines = [{},{},{}];
buildJL(_lines);
function onJLChange(e){
  const i = parseInt(e.target.dataset.i), k = e.target.dataset.k; const v = e.target.value;
  _lines[i] = _lines[i] || {};
  _lines[i][k] = (k==='debe'||k==='haber') ? parseFloat(v||0) : v;
  if(k==='acc'){
    const a = db.accounts.find(x=>x.code===v); if(a) _lines[i].accName = a.name;
    buildJL(_lines);
  }
  sumJL();
}
$('#addLine').addEventListener('click', ()=>{ _lines.push({}); buildJL(_lines); });
function sumJL(){
  const s = _lines.reduce((o,l)=> ({debe:o.debe+(parseFloat(l.debe)||0), haber:o.haber+(parseFloat(l.haber)||0)}), {debe:0, haber:0});
  $('#sumDebe').textContent = s.debe.toFixed(2); $('#sumHaber').textContent = s.haber.toFixed(2);
  const ok = Math.abs(s.debe - s.haber) < 0.005;
  $('#balStatus').textContent = ok? 'Cuadrado' : 'Descuadrado';
  $('#balStatus').style.color = ok? '#6EE7B7' : '#F87171';
  return ok;
}
$('#saveJournal').addEventListener('click', (e)=>{
  e.preventDefault();
  if(!sumJL()){ alert('El asiento debe cuadrar (DEBE = HABER)'); return; }
  const date = $('#jDate').value || new Date().toISOString().slice(0,10);
  const ref = $('#jRef').value||'';
  const lines = _lines.filter(l=> (l.acc||'').trim() && ((parseFloat(l.debe)||0)>0 || (parseFloat(l.haber)||0)>0));
  if(lines.length<2){ alert('Mínimo dos líneas'); return; }
  const j = { id: uid(), date, ref, lines, createdAt: new Date().toISOString() };
  db.journals.push(j); save(); renderJournals(); toast('Asiento guardado'); closeJournal();
});

// Trial Balance
function runTrialFor(month){
  const filterMonth = (t)=> (t.date||'').slice(0,7)===month;
  const accMap = {}; 
  const rows = db.journals.filter(filterMonth);
  for(const j of rows){
    for(const l of j.lines){
      const a = db.accounts.find(x=>x.code===l.acc) || {name:l.accName||''};
      if(!accMap[l.acc]) accMap[l.acc] = { code:l.acc, name:a.name||'', debe:0, haber:0 };
      accMap[l.acc].debe += parseFloat(l.debe||0);
      accMap[l.acc].haber += parseFloat(l.haber||0);
    }
  }
  const tb = Object.values(accMap).map(r=>{
    const diff = r.debe - r.haber;
    return { code:r.code, name:r.name, debe:r.debe, haber:r.haber, saldo_deudor: diff>0? diff:0, saldo_acreedor: diff<0? -diff:0 };
  }).sort((a,b)=> a.code<b.code?-1:1);
  return tb;
}
$('#runTrial').addEventListener('click', ()=>{
  const ym = $('#tbMonth').value || new Date().toISOString().slice(0,7);
  const tb = runTrialFor(ym);
  const html = [`<table><thead><tr><th>Código</th><th>Cuenta</th><th>Debe</th><th>Haber</th><th>Saldo Deudor</th><th>Saldo Acreedor</th></tr></thead><tbody>`,
    ...tb.map(r=> `<tr><td class="mono">${r.code}</td><td>${r.name}</td><td>${r.debe.toFixed(2)}</td><td>${r.haber.toFixed(2)}</td><td>${r.saldo_deudor.toFixed(2)}</td><td>${r.saldo_acreedor.toFixed(2)}</td></tr>`),
    `</tbody></table>`];
  $('#trialTable').innerHTML = html.join('');
});
$('#exportTrial').addEventListener('click', ()=>{
  const ym = $('#tbMonth').value || new Date().toISOString().slice(0,7);
  const tb = runTrialFor(ym);
  const head = ['code','name','debe','haber','saldo_deudor','saldo_acreedor'];
  const rows = tb.map(r=> head.map(k=> `"${String(r[k]).replaceAll('"','""')}"`).join(',') );
  const csv = [head.join(','), ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Sumas_y_Saldos_${ym}.csv`; a.click();
});

// Service
$('#resetCache').addEventListener('click',async()=>{if('caches'in window){const keys=await caches.keys(); for(const k of keys) await caches.delete(k); alert('Caché borrada. Actualizá la página.')}})
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js')}
