/* ================================================================
   TABS
   ================================================================ */
function switchTab(btn) {
  const name = btn.dataset.tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  ['transactions','balances','settle','analytics'].forEach(t=>{
    const el=document.getElementById('tab-'+t);
    if(el) el.classList.toggle('hidden',t!==name);
  });
  if(name==='balances')    renderBalances();
  if(name==='settle')      renderSettle();
  if(name==='analytics')   renderAnalytics();
  if(name==='transactions')renderTransactions();
}

