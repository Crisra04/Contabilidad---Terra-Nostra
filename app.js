
// Terra Nostra - Contabilidad V 1.07.4 PATCH
// Robust init
window.APP_VERSION = "1.07.4";
(function initDB(){
  try{
    const BASE_KEY='contabilidad_tn';
    const raw = localStorage.getItem(BASE_KEY);
    window.db = raw ? JSON.parse(raw) : { tx:[], journals:[], accounts:[] };
    if(!Array.isArray(db.tx)) db.tx=[];
    if(!Array.isArray(db.journals)) db.journals=[];
    if(!Array.isArray(db.accounts)) db.accounts=[];
  }catch(e){
    console.warn("Init fallback", e);
    window.db = { tx:[], journals:[], accounts:[] };
    localStorage.setItem('contabilidad_tn', JSON.stringify(db));
  }
})();

function persist(){
  try{ localStorage.setItem('contabilidad_tn', JSON.stringify(db)); }
  catch(e){ console.error("persist",e); }
}

// ===== UTIL =====
function getRate(code){ return 1; } // placeholder; ajusta si tienes TC variable
function toBOB(t){ return (t.amount||0) * (t.rate||1); }
function fmt(n){ return new Intl.NumberFormat('es-BO',{minimumFractionDigits:2}).format(n||0); }
function toast(msg){
  let el=document.createElement('div');
  el.className='toast'; el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('show'),10);
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),200); },2200);
}

// ===== FIX #1 Movimientos rápidos =====
function quickCategoryIncomeAccount(cat){
  const c = (cat||'').toLowerCase();
  if (c.includes('alquiler')) return '4112';
  if (c.includes('comision')||c.includes('comisión')||c.includes('servic')) return '4113';
  if (c.includes('venta')) return '4111';
  return '4199';
}
function quickCategoryExpenseAccount(cat){
  const c = (cat||'').toLowerCase();
  if (c.includes('banco')||c.includes('comision')||c.includes('comisión')) return '5312';
  if (c.includes('interes')||c.includes('interés')) return '5311';
  if (c.includes('marketing')||c.includes('public')) return '5213';
  return '5299';
}

window.saveQuickMovement = function saveQuickMovement(){
  const amt = +document.querySelector('#quickAmount')?.value || 0;
  const cat = (document.querySelector('#quickCategory')?.value || '').trim();
  const type = (document.querySelector('#quickType')?.value || 'Ingreso').toLowerCase();
  const date = document.querySelector('#quickDate')?.value || new Date().toISOString().slice(0,10);
  const currency = (document.querySelector('#quickCurrency')?.value || 'BOB');
  if (!amt || !cat){ alert('Falta monto o categoría'); return; }

  let group = (type==='ingreso') ? 'ventas' : 'opex';
  const tx = { id:'tx_'+Date.now(), type:(type==='ingreso'?'ingreso':'egreso'), group, category:cat, date, currency, amount:amt, rate:getRate(currency) };
  db.tx.push(tx);

  const debitAcc  = (type==='ingreso') ? '1112' : quickCategoryExpenseAccount(cat);
  const creditAcc = (type==='ingreso') ? quickCategoryIncomeAccount(cat) : '1112';
  const j = { id:'j_'+Date.now(), date, glosa:`MR: ${cat}`, lines:[
    { account: debitAcc,  debe: (type==='ingreso'? amt:0), haber:(type==='ingreso'? 0:amt) },
    { account: creditAcc, debe: (type==='ingreso'? 0:amt), haber:(type==='ingreso'? amt:0) },
  ]};
  db.journals.push(j);

  persist(); refreshUI();
  alert('Guardado. Desde V 1.08 podrás mapear a asientos por plantilla PUCT.');
};

// ===== FIX #2 Ordenar cuentas por código =====
function codeKey(c){ return (c||'').replace(/[^\d.]/g,'').split('.').map(x=>parseInt(x,10)||0); }
function compareCodes(a,b){
  const A=codeKey(a.codigo||a), B=codeKey(b.codigo||b);
  for(let i=0;i<Math.max(A.length,B.length);i++){ const da=A[i]||0, db=B[i]||0; if(da!==db) return da-db; }
  return 0;
}
window.createAnalytical = function createAnalytical(parentCode, newCode, name){
  if(!newCode || !name) { alert('Código y nombre requeridos'); return; }
  const lvl = (newCode.split('.').length);
  if(lvl<5) { alert('Solo se permite 5º nivel analítico'); return; }
  db.accounts.push({ codigo:newCode, nombre:name, isCustom:true, locked:false });
  db.accounts.sort(compareCodes);
  persist(); renderAccountsTable(); toast('Subcuenta creada');
};

// ===== FIX #3 Recargar PUCT conservando analíticas =====
window.reloadPUCT = async function reloadPUCT(){
  if(!confirm('Recargar plan oficial PUCT. Se conservarán tus subcuentas (5º nivel). ¿Continuar?')) return;
  const keep = db.accounts.filter(a=> (a.isCustom===true || (a.codigo||'').split('.').length>=5));
  const base = await fetch('accounts.json?ts='+(Date.now())).then(r=>r.json()).catch(()=>[]);
  base.forEach(a=>{ const lvl=(a.codigo||'').split('.').length; a.locked = lvl<=4; a.isCustom=false; });
  const codes = new Set(base.map(a=>a.codigo));
  keep.forEach(a=>{ if(!codes.has(a.codigo)){ a.isCustom=true; a.locked=false; base.push(a);} });
  base.sort(compareCodes);
  db.accounts = base; persist(); renderAccountsTable();
  toast('PUCT recargado (analíticas conservadas: '+keep.length+')');
};

// ===== Export plan (CSV) =====
window.exportPlanCSV = function exportPlanCSV(){
  const rows = [['codigo','nombre','locked','isCustom']].concat(db.accounts.map(a=>[a.codigo,a.nombre,a.locked?'1':'0',a.isCustom?'1':'0']));
  const csv = rows.map(r=>r.map(v=>(''+v).replaceAll('"','""')).map(v=>`"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='PlanCuentas_TN.csv'; a.click();
};

// ===== UI Hooks (defensivo) =====
function refreshUI(){
  try{ updateKPIs(); }catch(e){}
  try{ renderTxTable(); }catch(e){}
  try{ renderAccountsTable(); }catch(e){}
}

// Stubs (para que no rompa si tu index tiene otros nombres)
function updateKPIs(){
  const ym = new Date().toISOString().slice(0,7);
  const sumFor = (month, filterFn)=> db.tx.filter(t=> (t.date||'').slice(0,7)===month).filter(filterFn).reduce((s,t)=> s+toBOB(t),0);
  const ventas = sumFor(ym, t=> t.group==='ventas' && t.type==='ingreso');
  const costos = sumFor(ym, t=> t.group==='costos');
  const opex   = sumFor(ym, t=> t.group==='opex');
  const util   = ventas - costos - opex;
  const set = (sel,val)=>{ const el=document.querySelector(sel); if(el) el.textContent='BOB '+fmt(val); };
  set('[data-kpi="ventas"]', ventas);
  set('[data-kpi="costos"]', costos);
  set('[data-kpi="opex"]', opex);
  set('[data-kpi="utilidad"]', util);
}
function renderTxTable(){ /* rellena según tu markup; intencionalmente vacío para patch universal */ }
function renderAccountsTable(){ /* idem */ }

// ===== Mantenimiento (PWA) =====
window.clearSiteData = async function(){
  try{
    if('caches' in window){
      const names = await caches.keys(); await Promise.all(names.map(n=>caches.delete(n)));
    }
    localStorage.removeItem('contabilidad_tn');
    alert('Datos y cache limpiados. Recarga la página.');
    location.reload();
  }catch(e){ console.error(e); alert('Error al limpiar'); }
};

// Auto-init
document.addEventListener('DOMContentLoaded', refreshUI);
