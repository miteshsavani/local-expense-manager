/* ================================================================
   ADMIN MANAGER — Dashboard & User Management
   ================================================================ */
window.adminManager = (() => {
  let _allUsers = [];
  let _filter = 'all';

  async function openPanel() {
    if (STATE.userProfile?.role !== 'admin') {
      showToast('Access denied', 'error');
      return;
    }
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    refreshUsers();
  }

  function closePanel() {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
  }

  async function refreshUsers() {
    const listEl = document.getElementById('admin-user-list');
    listEl.innerHTML = '<div class="loading-state">Loading users...</div>';
    
    try {
      _allUsers = await firebaseService.fetchUsersList();
      _updateStats();
      renderUsers();
    } catch (e) {
      listEl.innerHTML = `<div class="error-state">Failed to load users: ${e.message}</div>`;
    }
  }

  function _updateStats() {
    const total = _allUsers.length;
    const pending = _allUsers.filter(u => u.status === 'pending').length;
    const active = _allUsers.filter(u => u.status === 'approved').length;

    document.getElementById('admin-stat-total').textContent = total;
    document.getElementById('admin-stat-pending').textContent = pending;
    document.getElementById('admin-stat-active').textContent = active;
  }

  function setFilter(status, btn) {
    _filter = status;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderUsers();
  }

  function renderUsers() {
    const listEl = document.getElementById('admin-user-list');
    let filtered = _allUsers;
    if (_filter !== 'all') {
      filtered = _allUsers.filter(u => u.status === _filter);
    }

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state" style="padding:40px;text-align:center;color:var(--text3)">No users found matching filter "${_filter}"</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(u => {
      try {
        return `
          <div class="admin-user-row">
            <div class="user-avatar" style="background:${Utils.memberColor(u.displayName || u.email)}">${Utils.initials(u.displayName || u.email)}</div>
            <div class="user-info">
              <div class="user-name">
                ${Utils.esc(u.displayName || 'Unnamed User')}
                ${u.role === 'admin' ? '<span class="status-badge" style="background:var(--blue);color:#fff;font-size:9px">ADMIN</span>' : ''}
              </div>
              <div class="user-email">${Utils.esc(u.email)}</div>
              <div class="user-meta" style="margin-top:8px">
                <span class="meta-item">Status: <span class="user-status-badge status-${u.status}">${u.status}</span></span>
                <span class="meta-item">Groups: <b>${u.limits?.maxGroups ?? 3}</b></span>
                <span class="meta-item">Joined: <b>${Utils.date(u.createdAt?.toDate ? u.createdAt.toDate() : u.createdAt)}</b></span>
              </div>
            </div>
            <div class="admin-actions">
              <button class="btn btn-secondary btn-sm" onclick="adminModal.openEdit('${u.uid}')">Manage</button>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Failed to render user:', u.uid, err);
        return `<div class="admin-user-row error" style="color:var(--red);font-size:12px;padding:10px">⚠️ Error rendering user ${u.email || u.uid}</div>`;
      }
    }).join('');
  }

  return { openPanel, closePanel, refreshUsers, setFilter, renderUsers };
})();
