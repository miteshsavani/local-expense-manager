/* ================================================================
   MEMBER DETAILS MODAL
   ================================================================ */
window.openMemberDetailsModal = async (uid, name) => {
  const g = Groups.active();
  if (!g) return;

  const myRole = g.roles?.[STATE.user?.uid] || 'member';
  const isOwner = myRole === 'owner';

  // Try cache first, then fetch
  let memberDetails = STATE.memberDetailsCache[g.id];
  if (!memberDetails) {
    memberDetails = await firebaseService.getGroupMemberDetails(g.id);
    STATE.memberDetailsCache[g.id] = memberDetails;
  }

  const m = memberDetails.find(x => x.uid === uid) || { 
    uid,
    name: name || 'User',
    email: 'N/A',
    role: g.roles?.[uid] || 'member', 
    permissions: { canAddExpense: true, canEditOwnExpense: true, canDeleteOwnExpense: true } 
  };
  
  const role = m.role;
  const perms = m.permissions || {};
  const actualName = m.name || name || 'User';
  
  openModal(`<div class="modal" style="max-width:440px">
    <div class="modal-header">
      <div class="modal-title">Member Details</div>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>
    
    <div style="text-align:center;padding:10px 0 20px">
      <div class="chip-avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;background:${Utils.memberColor(actualName)}">
        ${Utils.initials(actualName)}
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--text1)">${Utils.esc(actualName)}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:4px">${Utils.esc(m.email)}</div>
      <div style="margin-top:12px;display:flex;justify-content:center;gap:8px">
        <span class="badge ${role === 'owner' ? 'badge-blue' : 'badge-gray'}">${role.toUpperCase()}</span>
      </div>
    </div>

    ${isOwner && role !== 'owner' ? `
      <div class="divider" style="margin:0"></div>
      <div class="settings-section" style="margin-top:20px;max-height:400px;overflow-y:auto;padding-right:8px">
        <div class="settings-section-title">Manage Permissions</div>
        
        <div class="settings-row">
          <div>
            <div class="settings-label">Add Expenses</div>
            <div class="settings-desc">Allow member to add new transactions</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canAddExpense !== false ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canAddExpense', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">Edit Own Expenses</div>
            <div class="settings-desc">Allow editing their own transactions</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canEditOwnExpense !== false ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canEditOwnExpense', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">Delete Own Expenses</div>
            <div class="settings-desc">Allow deleting their own transactions</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canDeleteOwnExpense !== false ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canDeleteOwnExpense', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="divider"></div>

        <div class="settings-row">
          <div>
            <div class="settings-label">Edit Others' Expenses</div>
            <div class="settings-desc">Allow modifying expenses of other members</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canEditOthersExpense ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canEditOthersExpense', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">Delete Others' Expenses</div>
            <div class="settings-desc">Allow deleting expenses of other members</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canDeleteOthersExpense ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canDeleteOthersExpense', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="divider"></div>

        <div class="settings-row">
          <div>
            <div class="settings-label">Manage Members</div>
            <div class="settings-desc">Allow adding or removing group members</div>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" ${perms.canAddMembers ? 'checked' : ''} 
              onchange="updateMemberPermission('${uid}', 'canAddMembers', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="modal-footer" style="flex-direction:column;gap:12px;margin-top:16px">
        <button class="btn btn-danger btn-full" onclick="confirmRemoveUserFromGroup('${uid}', '${Utils.esc(actualName)}')">
          🚪 Remove from Group
        </button>
      </div>
    ` : `
      <div class="modal-footer">
        <button class="btn btn-primary btn-full" onclick="closeModal()">Close</button>
      </div>
    `}
  </div>`);
};

window.updateMemberPermission = async (uid, key, value) => {
  const g = Groups.active();
  if (!g) return;

  try {
    // Clear cache to ensure fresh data on next open
    delete STATE.memberDetailsCache[g.id];

    // Fetch fresh details for accurate merge
    const memberDetails = await firebaseService.getGroupMemberDetails(g.id);
    const m = memberDetails.find(x => x.uid === uid) || { 
      role: g.roles?.[uid] || 'member', 
      permissions: { canAddExpense: true, canEditOwnExpense: true, canDeleteOwnExpense: true } 
    };

    const newPerms = { ...m.permissions };
    newPerms[key] = value;
    
    await firebaseService.updateMemberPermissions(g.id, uid, m.role, newPerms);
    showToast('Permission updated', 'success');
  } catch (err) {
    console.error('Failed to update permission:', err);
    showToast('Failed to update permission', 'error');
  }
};

window.confirmRemoveUserFromGroup = (uid, name) => {
  const g = Groups.active();
  if (!g) return;

  if (confirm(`Are you sure you want to remove ${name} from this group? They will lose access immediately.`)) {
    removeUserFromGroup(g.id, uid);
    closeModal();
  }
};

async function removeUserFromGroup(groupId, uid) {
  try {
    const g = STATE.groups.find(x => x.id === groupId);
    if (!g) return;

    const newUserIds = (g.userIds || []).filter(id => id !== uid);
    const newRoles = { ...g.roles };
    delete newRoles[uid];
    
    const newPermissions = { ...g.permissions };
    delete newPermissions[uid];

    await Groups.update(groupId, {
      userIds: newUserIds,
      roles: newRoles,
      permissions: newPermissions
    });
    
    showToast('Member removed', 'success');
  } catch (err) {
    console.error('Failed to remove member:', err);
    showToast('Failed to remove member', 'error');
  }
}
