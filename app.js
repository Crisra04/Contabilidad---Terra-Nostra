
(function(){
  'use strict';
  const VERSION = (window.APP_VERSION||'1.07.3');
  const STORE_KEY = 'contabilidad_tn';
  const ACC_URL = './accounts.json';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // Safe init of DB
  let db;
  try {
    db = JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
  } catch(e){ db = {}; }
  if(!db.accounts) db.accounts=[];
  if(!db.journals) db.journals=[]; // [{id, date, desc, lines:[{code,name,deb,hab}]}]
  if(!db.cats) db.cats=['Servicios','Alquileres','Comisiones','Bancos','Sueldos','Depreciación'];
  function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(db)); }catch(e){} }

  // Navigation handlers (drawer + bottom)
  function openTab(id){
    $$('.tab').forEach(t=>t.hidden=true);
    $('#tab-'+id).hidden=false;
    $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
    $$('.btab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
    window.scrollTo({top:0, behavior:'smooth'});
  }
  $$('.nav-item').forEach(b=>b.addEventListener('click', ()=> openTab(b.dataset.tab)));
  $$('.btab').forEach(b=>b.addEventListener('click', ()=> openTab(b.dataset.tab)));
  $('#menuBtn').addEventListener('click', ()=>{ $('#drawer').classList.add('open'); $('#scrim').classList.add('show'); });
  $('#drawerClose').addEventListener('click', ()=>{ $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show'); });
  $('#scrim').addEventListener('click', ()=>{ $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show'); });

  // Theme
  const THEME_KEY='tn_theme';
  function applyTheme(t){ document.body.setAttribute('data-theme', t); const b=$('#themeToggle'); if(b) b.textContent = t==='light'?'☀️':'🌙'; }
  applyTheme(localStorage.getItem(THEME_KEY)||'dark');
  $('#themeToggle').addEventListener('click', ()=>{ const cur=document.body.getAttribute('data-theme')==='light'?'light':'dark'; const next=cur==='light'?'dark':'light'; localStorage.setItem(THEME_KEY,next); applyTheme(next); });

  // Refresh / Clear
  $('#resetCache').addEventListener('click', async()=>{
    try{
      if('caches' in window){ const keys = await caches.keys(); for(const k of keys){ await caches.delete(k); } }
      if('serviceWorker' in navigator){ const regs = await navigator.serviceWorker.getRegistrations(); for(const r of regs){ await r.unregister(); } }
      alert('Listo: caché y SW limpiados. Recargá la página.');
    }catch(e){ alert('No se pudo limpiar completamente, pero intenté. Recarga la página.'); }
  });
  $('#clearData').addEventListener('click', ()=>{
    if(confirm('¿Borrar todos los datos locales?')){ localStorage.removeItem(STORE_KEY); alert('Datos borrados. Recargá la página.'); location.reload(); }
  });
  $('#refreshBtn').addEventListener('click', ()=>{ location.reload(true); });

  // Load PUCT accounts
  async function loadAccounts(){
    try{
      const res = await fetch(ACC_URL+`?v=${encodeURIComponent(VERSION)}&t=`+Date.now());
      const list = await res.json();
      // Compute level by groups (1-4 fixed)
      db.accounts = list.map(a=>({codigo:a.codigo, nombre:a.nombre, nivel:a.nivel||4}));
      save(); renderAccounts();
    }catch(e){
      // keep existing
      renderAccounts();
    }
  }

  // Accounts UI
  function renderAccounts(){
    const q = ($('#accSearch').value||'').toLowerCase();
    const rows = db.accounts.filter(a=> a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q));
    const html = [`<table><thead><tr><th>Código</th><th>Nombre</th><th>Nivel</th></tr></thead><tbody>`,
      ...rows.map(a=>`<tr><td>${a.codigo}</td><td>${a.nombre}</td><td>${a.nivel}</td></tr>`),
      `</tbody></table>`];
    $('#accountsTable').innerHTML = html.join('');
  }
  $('#reloadPUCT').addEventListener('click', loadAccounts);
  $('#accSearch').addEventListener('input', renderAccounts);
  $('#exportPUCT').addEventListener('click', ()=>{
    const rows = [['codigo','nombre','nivel'], ...db.accounts.map(a=>[a.codigo,a.nombre,a.nivel])];
    const csv = rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Plan_Cuentas_PUCT.csv'; a.click();
  });
  $('#addSub').addEventListener('click', ()=>{
    const parent = ($('#newParent').value||'').trim(); const code = ($('#newCode').value||'').trim(); const name = ($('#newName').value||'').trim();
    if(!/^\d+(\.\d+){3}$/.test(parent)){ return alert('Padre debe ser 4º nivel, ej: 1.1.1.001'); }
    if(!/^\d+(\.\d+){4}$/.test(code)){ return alert('Nuevo código debe ser 5º nivel, ej: 1.1.1.001.01'); }
    if(!name) return alert('Nombre requerido');
    if(!db.accounts.find(a=>a.codigo===parent)) return alert('Padre no existe en el PUCT');
    if(db.accounts.find(a=>a.codigo===code)) return alert('Ese código ya existe');
    db.accounts.push({codigo:code, nombre:name, nivel:5}); save(); renderAccounts(); $('#newCode').value=''; $('#newName').value='';
  });

  // Journals
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  let tempLines = [];
  function lineRow(l,i){
    return `<div class="row line" data-i="${i}">
      <input class="code" placeholder="Código PUCT" value="${l.code||''}">
      <input class="name" placeholder="Nombre" value="${l.name||''}" list="accNames">
      <input class="deb" type="number" step="0.01" placeholder="Debe" value="${l.deb||''}">
      <input class="hab" type="number" step="0.01" placeholder="Haber" value="${l.hab||''}">
      <button class="icon-btn del" type="button">✕</button>
    </div>`;
  }
  function renderLines(){
    $('#linesBox').innerHTML = tempLines.map((l,i)=>lineRow(l,i)).join('');
    // attach events
    $$('#linesBox .line').forEach(div=>{
      const i = parseInt(div.dataset.i,10);
      div.querySelector('.code').addEventListener('change', e=>{
        const code = e.target.value.trim();
        const acc = db.accounts.find(a=>a.codigo===code);
        if(acc){ tempLines[i].code=code; tempLines[i].name=acc.nombre; renderLines(); calcTotals(); }
      });
      div.querySelector('.name').addEventListener('change', e=>{
        const name = e.target.value.trim().toLowerCase();
        const acc = db.accounts.find(a=>a.nombre.toLowerCase()===name);
        if(acc){ tempLines[i].code=acc.codigo; tempLines[i].name=acc.nombre; renderLines(); calcTotals(); }
      });
      div.querySelector('.deb').addEventListener('input', e=>{ tempLines[i].deb=parseFloat(e.target.value||0)||0; calcTotals(); });
      div.querySelector('.hab').addEventListener('input', e=>{ tempLines[i].hab=parseFloat(e.target.value||0)||0; calcTotals(); });
      div.querySelector('.del').addEventListener('click', ()=>{ tempLines.splice(i,1); renderLines(); calcTotals(); });
    });
  }
  function calcTotals(){
    const d = tempLines.reduce((s,l)=> s + (parseFloat(l.deb)||0), 0);
    const h = tempLines.reduce((s,l)=> s + (parseFloat(l.hab)||0), 0);
    $('#totD').textContent = d.toFixed(2);
    $('#totH').textContent = h.toFixed(2);
    $('#status').textContent = (Math.abs(d-h)<0.005?'CUADRADO':'DESCUADRADO');
  }
  $('#addLine').addEventListener('click', ()=>{ tempLines.push({code:'',name:'',deb:'',hab:''}); renderLines(); });
  $('#jForm').addEventListener('submit', e=>{
    e.preventDefault();
    const d = tempLines.reduce((s,l)=> s + (parseFloat(l.deb)||0), 0);
    const h = tempLines.reduce((s,l)=> s + (parseFloat(l.hab)||0), 0);
    if(Math.abs(d-h)>=0.005) return alert('El asiento está descuadrado');
    const j = { id: uid(), date: $('#jDate').value || new Date().toISOString().slice(0,10), desc: ($('#jDesc').value||'').trim(), lines: tempLines.map(l=>({code:l.code,name:l.name,deb:+(l.deb||0),hab:+(l.hab||0)})) };
    db.journals.push(j); save(); tempLines=[]; renderLines(); calcTotals(); renderJournalTable(); alert('Asiento guardado');
  });
  function renderJournalTable(){
    const rows = db.journals.slice().reverse().map(j=>{
      const d = j.lines.reduce((s,l)=>s+(l.deb||0),0).toFixed(2);
      const h = j.lines.reduce((s,l)=>s+(l.hab||0),0).toFixed(2);
      return `<tr><td>${j.date}</td><td>${(j.desc||'')}</td><td>${d}</td><td>${h}</td></tr>`;
    }).join('');
    $('#journalsTable').innerHTML = `<table><thead><tr><th>Fecha</th><th>Glosa</th><th>Debe</th><th>Haber</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Sin asientos</td></tr>'}</tbody></table>`;
  }
  $('#exportJournals').addEventListener('click', ()=>{
    const head = ['id','date','desc','code','name','deb','hab'];
    const rows = [head.join(',')];
    db.journals.forEach(j=>{
      j.lines.forEach(l=>{
        const r = [j.id,j.date,(j.desc||''),l.code,l.name,l.deb,l.hab].map(x=>`"${String(x).replaceAll('"','""')}"`).join(',');
        rows.push(r);
      });
    });
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Asientos.csv'; a.click();
  });

  // Sumas y Saldos
  function calcSumas(period){
    // period format YYYY-MM
    const map = new Map();
    const inPeriod = j => (j.date||'').slice(0,7)===period;
    db.journals.filter(inPeriod).forEach(j=>{
      j.lines.forEach(l=>{
        if(!map.has(l.code)) map.set(l.code, {code:l.code, name:l.name||'', deb:0, hab:0});
        const o = map.get(l.code);
        o.deb += (l.deb||0); o.hab += (l.hab||0);
      });
    });
    // Include accounts with zero to show structure? keep compact for now
    const rows = Array.from(map.values()).sort((a,b)=> a.code.localeCompare(b.code));
    return rows.map(r=>({code:r.code, name:r.name, deb:r.deb, hab:r.hab, saldoD: Math.max(0, r.deb - r.hab), saldoH: Math.max(0, r.hab - r.deb)}));
  }
  $('#calcSS').addEventListener('click', ()=>{
    const ym = $('#ssPeriod').value || new Date().toISOString().slice(0,7);
    const rows = calcSumas(ym);
    const html = [`<table><thead><tr><th>Código</th><th>Nombre</th><th>Debe</th><th>Haber</th><th>Saldo Deudor</th><th>Saldo Acreedor</th></tr></thead><tbody>`,
      ...rows.map(r=>`<tr><td>${r.code}</td><td>${r.name}</td><td>${r.deb.toFixed(2)}</td><td>${r.hab.toFixed(2)}</td><td>${r.saldoD.toFixed(2)}</td><td>${r.saldoH.toFixed(2)}</td></tr>`),
      `</tbody></table>`];
    $('#ssTable').innerHTML = html.join('');
  });
  $('#exportSS').addEventListener('click', ()=>{
    const ym = $('#ssPeriod').value || new Date().toISOString().slice(0,7);
    const rows = calcSumas(ym);
    const head = ['codigo','nombre','debe','haber','saldo_deudor','saldo_acreedor'];
    const csv = [head.join(','), ...rows.map(r=>[r.code,r.name,r.deb,r.hab,r.saldoD,r.saldoH].map(x=>`"${String(x).replaceAll('"','""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`Sumas_y_Saldos_${ym}.csv`; a.click();
  });

  // Quick movements -> not fully accounting yet (kept for compatibility)
  $('#quickForm').addEventListener('submit', e=>{
    e.preventDefault();
    alert('Guardado. (En V 1.08 se mapeará a asientos automáticos por plantillas).');
  });

  // Datalist for account names
  function buildAccDatalist(){
    const dl = document.createElement('datalist'); dl.id='accNames';
    dl.innerHTML = db.accounts.slice(0,1000).map(a=>`<option value="${a.nombre}">`).join('');
    document.body.appendChild(dl);
  }

  // Start
  loadAccounts().then(()=>{ renderAccounts(); buildAccDatalist(); });
  renderLines(); calcTotals(); renderJournalTable();
  // Default period
  $('#ssPeriod').value = new Date().toISOString().slice(0,7);

  // Register SW (cache-bust)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js?v='+encodeURIComponent(VERSION)).catch(()=>{});
  }
})();