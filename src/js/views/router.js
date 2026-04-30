/* ================================================================
   VIEWS
   ================================================================ */
window.showView = name => {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
}
window.showDashboard = () => { STATE.activeGroupId=null; showView('dashboard'); renderDashboard(); }
window.showGroup = id =>  { 
  STATE.activeGroupId=id; 
  STATE.activeTab='transactions'; 
  showView('group'); 
  if (syncManager.watchGroupTransactions) syncManager.watchGroupTransactions(id);
  renderGroup(); 
}

