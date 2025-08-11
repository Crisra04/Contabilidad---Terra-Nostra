
(function(){
  const showError = (msg)=>{
    try{
      const el = document.getElementById('err');
      if(!el) return;
      el.textContent = 'Error: '+msg;
      el.style.display='block';
      setTimeout(()=>{el.style.display='none'}, 5000);
      console.error('[TN]', msg);
    }catch(e){}
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      // Navigation
      document.querySelectorAll('.tabbtn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const id = btn.dataset.tab;
          document.querySelectorAll('.tab').forEach(s=>s.classList.add('hidden'));
          const pane = document.getElementById('tab-'+id);
          if(pane) pane.classList.remove('hidden');
          window.scrollTo({top:0, behavior:'smooth'});
        });
      });

      // Minimal data store (never crash if parse fails)
      let raw = localStorage.getItem('contabilidad_tn');
      let db;
      try{ db = raw ? JSON.parse(raw) : null; }catch(e){ db = null; }
      if(!db) db = { tx:[], accounts:[], journals:[], lines:[], closures:[], templates:[] };
      localStorage.setItem('contabilidad_tn', JSON.stringify(db));

      // Refresh PWA
      const rc = document.getElementById('resetCache');
      if(rc && 'caches' in window){
        rc.addEventListener('click', async ()=>{
          const keys = await caches.keys();
          for(const k of keys) await caches.delete(k);
          alert('Caché borrada. Recarga la página.');
        });
      }
    }catch(err){ showError(err.message || err); }
  });

  // Register SW (cache bump)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js');
  }
})();
