/* ================================================================
   ADMIN APPROVAL MODAL
   ================================================================ */
window.adminModal = (() => {

  async function openEdit(uid) {
    const user = (await firebaseService.fetchUsersList()).find(u => u.uid === uid);
    if (!user) return;

    const limits = {
      maxGroups: user.limits?.maxGroups ?? 3,
      maxTransactions: user.limits?.maxTransactions ?? 100
    };
    const perms = {
      canShareGroups: user.permissions?.canShareGroups ?? true,
      canJoinGroups: user.permissions?.canJoinGroups ?? true,
      canUseCloudSync: user.permissions?.canUseCloudSync ?? true,
      canUseExport: user.permissions?.canUseExport ?? true,
      canUseReports: user.permissions?.canUseReports ?? true
    };

    openModal(`<div class="modal" style="max-width:500px">
      <div class="modal-header">
        <div class="modal-title">Manage User: ${Utils.esc(user.displayName || user.email)}</div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
      </div>
      
      <div class="form-group">
        <label>Status</label>
        <select class="input" id="adm-status">
          <option value="pending" ${user.status==='pending'?'selected':''}>⏳ Pending Approval</option>
          <option value="approved" ${user.status==='approved'?'selected':''}>✅ Approved</option>
          <option value="rejected" ${user.status==='rejected'?'selected':''}>🚫 Rejected</option>
          <option value="suspended" ${user.status==='suspended'?'selected':''}>🔒 Suspended</option>
        </select>
      </div>

      <div class="form-group">
        <label>Role</label>
        <select class="input" id="adm-role">
          <option value="user" ${user.role==='user'?'selected':''}>User</option>
          <option value="admin" ${user.role==='admin'?'selected':''}>Administrator</option>
        </select>
      </div>

      <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group">
          <label>Max Groups</label>
          <input type="number" class="input" id="adm-max-groups" value="${limits.maxGroups}">
        </div>
        <div class="form-group">
          <label>Max Transactions</label>
          <input type="number" class="input" id="adm-max-tx" value="${limits.maxTransactions}">
        </div>
      </div>

      <div class="form-group">
        <label style="margin-bottom:12px;display:block">Feature Access</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_permToggle('adm-canShare', 'Can Share Groups', perms.canShareGroups)}
          ${_permToggle('adm-canJoin', 'Can Join Groups', perms.canJoinGroups)}
          ${_permToggle('adm-canSync', 'Can Cloud Sync', perms.canUseCloudSync)}
          ${_permToggle('adm-canExport', 'Can Export Data', perms.canUseExport)}
          ${_permToggle('adm-canReports', 'Can View Reports', perms.canUseReports)}
        </div>
      </div>

      <div class="form-group">
        <label>Rejection/Suspension Reason (optional)</label>
        <input type="text" class="input" id="adm-reason" value="${Utils.esc(user.rejectionReason || '')}" placeholder="Visible to user">
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="adm-save-btn" onclick="adminModal.save('${uid}')">Save Access Settings</button>
      </div>
    </div>`);
  }

  function _permToggle(id, label, checked) {
    return `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="${id}" ${checked?'checked':''}>
        ${label}
      </label>
    `;
  }

  async function save(uid) {
    const btn = document.getElementById('adm-save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const data = {
      status: document.getElementById('adm-status').value,
      role: document.getElementById('adm-role').value,
      rejectionReason: document.getElementById('adm-reason').value,
      limits: {
        maxGroups: parseInt(document.getElementById('adm-max-groups').value),
        maxTransactions: parseInt(document.getElementById('adm-max-tx').value)
      },
      permissions: {
        canShareGroups: document.getElementById('adm-canShare').checked,
        canJoinGroups: document.getElementById('adm-canJoin').checked,
        canUseCloudSync: document.getElementById('adm-canSync').checked,
        canUseExport: document.getElementById('adm-canExport').checked,
        canUseReports: document.getElementById('adm-canReports').checked
      }
    };

    try {
      await firebaseService.updateUserAccess(uid, data);
      showToast('User settings updated', 'success');
      closeModal();
      adminManager.refreshUsers();
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.textContent = 'Save Access Settings';
    }
  }

  return { openEdit, save };
})();
