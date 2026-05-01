/* ================================================================
   SHARED MEMBERS DETAIL MODAL (Owner View)
   ================================================================ */
window.openSharedMembersDetailModal = async () => {
  const g = Groups.active(); if (!g) return;
  
  openModal(`<div class="modal" style="max-width:600px">
    <div class="modal-header">
      <div class="modal-title">Shared Members Details</div>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div id="member-detail-loading" style="text-align:center;padding:40px">
      <div class="spinner" style="margin:0 auto 12px"></div>
      <p class="text-sm text-muted">Fetching member profiles...</p>
    </div>
    <div id="member-detail-content" class="hidden">
      <table class="table" style="font-size:12px;width:100%">
        <thead>
          <tr>
            <th style="text-align:left">Name</th>
            <th style="text-align:left">Email</th>
            <th style="text-align:left">Last Seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="member-detail-body"></tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="openManageMembersModal(true)">Back to Manage</button>
      <button class="btn btn-primary" onclick="closeModal()">Done</button>
    </div>
  </div>`);

  try {
    const details = await firebaseService.getGroupMemberDetails(g.id);
    const body = document.getElementById('member-detail-body');
    const loading = document.getElementById('member-detail-loading');
    const content = document.getElementById('member-detail-content');
    
    if (!body) return;

    body.innerHTML = details.map(m => {
      const isMe = m.uid === STATE.user?.uid;
      const lastSeen = m.lastSeen ? Utils.dateTime(m.lastSeen.toMillis ? m.lastSeen.toMillis() : m.lastSeen) : 'Never';
      const roleLabel = m.role === 'owner' ? '<span class="badge badge-accent">Owner</span>' : '<span class="badge badge-gray">Viewer</span>';
      
      return `<tr>
        <td>
          <strong>${Utils.esc(m.name)}</strong>${isMe ? ' (You)' : ''}<br>
          ${roleLabel}
        </td>
        <td>${Utils.esc(m.email)}</td>
        <td>${lastSeen}</td>
        <td style="text-align:right;white-space:nowrap">
          ${!isMe ? `
            <button class="btn btn-ghost btn-sm" onclick="openEditPermissionsModal('${m.uid}', '${Utils.esc(m.name)}', '${m.role}', ${JSON.stringify(m.permissions).replace(/"/g, '&quot;')})" title="Permissions">🛡️</button>
          ` : ''}
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px">No shared members yet.</td></tr>';

    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (e) {
    console.error('Failed to fetch details:', e);
    document.getElementById('member-detail-loading').innerHTML = `<p class="text-error">Failed to load member details.</p>`;
  }
}

window.openEditPermissionsModal = (targetUid, targetName, currentRole, perms) => {
  openModal(`<div class="modal" style="max-width:400px">
    <div class="modal-header"><div class="modal-title">Permissions for ${targetName}</div></div>
    
    <div class="form-group">
      <label>Role</label>
      <select class="input" id="perm-role">
        <option value="viewer" ${currentRole==='viewer'?'selected':''}>Viewer</option>
        <option value="owner" ${currentRole==='owner'?'selected':''}>Owner (Full Access)</option>
      </select>
    </div>

    <div id="perm-checklist" style="margin-top:16px; ${currentRole==='owner'?'display:none':''}">
      <label style="margin-bottom:12px;display:block">Granular Permissions</label>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${_permRow('canAddExpense', 'Add Expenses', perms.canAddExpense)}
        ${_permRow('canEditOwnExpense', 'Edit Own Expenses', perms.canEditOwnExpense)}
        ${_permRow('canEditOthersExpense', 'Edit Others Expenses', perms.canEditOthersExpense)}
        ${_permRow('canDeleteOwnExpense', 'Delete Own Expenses', perms.canDeleteOwnExpense)}
        ${_permRow('canDeleteOthersExpense', 'Delete Others Expenses', perms.canDeleteOthersExpense)}
        ${_permRow('canAddMembers', 'Add Members', perms.canAddMembers)}
        ${_permRow('canRemoveMembers', 'Remove Members', perms.canRemoveMembers)}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="openSharedMembersDetailModal()">Cancel</button>
      <button class="btn btn-primary" id="perm-save-btn" onclick="_savePermissions('${targetUid}')">Save Changes</button>
    </div>
  </div>`);

  document.getElementById('perm-role').addEventListener('change', (e) => {
    document.getElementById('perm-checklist').style.display = e.target.value === 'owner' ? 'none' : 'block';
  });
}

function _permRow(id, label, checked) {
  return `<label class="perm-row" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
    <span class="text-sm">${label}</span>
    <input type="checkbox" class="perm-check" data-id="${id}" ${checked?'checked':''}>
  </label>`;
}

window._savePermissions = async (targetUid) => {
  const g = Groups.active();
  const role = document.getElementById('perm-role').value;
  const checks = document.querySelectorAll('.perm-check');
  const permissions = {};
  checks.forEach(c => { permissions[c.dataset.id] = c.checked; });

  const btn = document.getElementById('perm-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    await firebaseService.updateMemberPermissions(g.id, targetUid, role, permissions);
    showToast('Permissions updated!', 'success');
    openSharedMembersDetailModal();
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}
