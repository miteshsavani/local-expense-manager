/* ================================================================
   VIEWS
   ================================================================ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
}
function showDashboard() { STATE.activeGroupId=null; showView('dashboard'); renderDashboard(); }
function showGroup(id)   { STATE.activeGroupId=id; STATE.activeTab='transactions'; showView('group'); renderGroup(); }

