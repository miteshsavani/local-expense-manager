/* ================================================================
   DASHBOARD RENDER
   ================================================================ */
window.renderDashboard = () => {
  const c = document.getElementById('groups-container');
  // Filter out deletedFlag groups from display
  const visibleGroups = STATE.groups.filter(g => !g.deletedFlag);
  if (!visibleGroups.length) {
    c.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🗂️</div>
      <div class="empty-state-title">No groups yet</div>
      <p>Create your first group to start splitting expenses</p><br>
      <button class="btn btn-primary" onclick="openCreateGroupModal()">＋ Create Group</button>
      <button class="btn btn-secondary" onclick="openJoinGroupModal()" style="margin-top:12px">🔗 Join Shared Group</button>
    </div>`; return;
  }
  c.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="showInbox()">📥 Inbox <span class="inbox-badge" style="position:static;margin-left:4px;display:none;width:16px;height:16px;font-size:9px"></span></button>
      <button class="btn btn-secondary btn-sm" onclick="openJoinGroupModal()">🔗 Join Group</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateGroupModal()">＋ New Group</button>
    </div>
    <div class="groups-grid">${visibleGroups.map(renderGroupCard).join('')}</div>`;
  
  if (window.inboxManager) inboxManager.updateUnreadBadge();
}

window.renderGroupCard = g => {
  const total   = g.transactions.filter(t=>!t.deletedFlag).reduce((s,t)=>s+t.amount,0);
  const normMembers = memberManager.normalize(g.members);
  const mainMembers = normMembers.filter(m => !m.parentId);
  const dirtyTxCount = g.transactions.filter(t => t.isDirty && !t.deletedFlag).length;
  const showBadges = !STATE.isGuest;
  const pendingBadge = showBadges && (g.isDirty || dirtyTxCount > 0)
    ? `<span class="group-pending-badge">⏳ ${dirtyTxCount>0?dirtyTxCount:''}</span>` : '';
  const avatars = mainMembers.slice(0,4).map(m =>
    `<div class="member-avatar-sm" style="background:${Utils.memberColor(m.name)}">${Utils.initials(m.name)}</div>`
  ).join('');
  const extra = mainMembers.length > 4 ? `<div class="member-avatar-sm" style="background:var(--text3)">+${mainMembers.length-4}</div>` : '';
  const visibleTxCount = g.transactions.filter(t => !t.deletedFlag).length;
  const showPendingCorner = showBadges && (g.isDirty || dirtyTxCount > 0);
  const cornerText = !STATE.syncEnabled ? 'Pending Sync' : 'Syncing';
  const cornerBadge = showPendingCorner
    ? `<span class="card-pending-corner" title="Pending sync">${cornerText}</span>` : '';
  
  const isOwner = g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner';
  const actions = isOwner 
    ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="openEditGroupModal('${g.id}')" title="Edit">✎</button>
       <button class="btn btn-ghost btn-icon btn-sm" onclick="confirmDeleteGroup('${g.id}')" title="Delete">🗑</button>`
    : `<button class="btn btn-ghost btn-icon btn-sm" onclick="confirmLeaveGroup('${g.id}')" title="Leave Group" style="font-size:16px">🚪</button>`;

  return `<div class="card card-hover group-card" style="position:relative" onclick="showGroup('${g.id}')">
    ${cornerBadge}
    <div class="group-card-header">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="group-avatar">${Utils.groupEmoji(g.name)}</div>
        <div>
          <div class="group-name">${Utils.esc(g.name)}${pendingBadge}</div>
          <div class="group-meta">${mainMembers.length} member${mainMembers.length!==1?'s':''} · ${visibleTxCount} expense${visibleTxCount!==1?'s':''}</div>
        </div>
      </div>
      <div style="display:flex;gap:4px" onclick="event.stopPropagation()">
        ${actions}
      </div>
    </div>
    <div style="display:flex;gap:4px">${avatars}${extra}</div>
    <div class="group-stats">
      <div class="group-stat"><div class="group-stat-val">${Utils.fmt(total)}</div><div class="group-stat-label">Total Spent</div></div>
      <div class="group-stat"><div class="group-stat-val">${normMembers.length}</div><div class="group-stat-label">Members</div></div>
      <div class="group-stat"><div class="group-stat-val">${visibleTxCount}</div><div class="group-stat-label">Expenses</div></div>
    </div>
  </div>`;
}

window.openJoinGroupModal = () => {
  if (STATE.userProfile && !STATE.userProfile.permissions?.canJoinGroups) {
    showToast('You do not have permission to join groups. Contact Admin.', 'error');
    return;
  }
  openModal(`<div class="modal" style="max-width:400px">
    <div class="modal-header"><div class="modal-title">Join Shared Group</div></div>
    <div class="form-group">
      <label>Enter Share Code</label>
      <input class="input" id="join-share-code" type="text" placeholder="e.g. ABC123XY" maxlength="10" style="text-transform:uppercase">
      <p class="text-sm text-muted mt-8">Ask the group owner for the 8-digit code.</p>
    </div>
    <div id="join-error" class="auth-error mt-8"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="join-btn" onclick="submitJoinGroup()">Join Group</button>
    </div>
  </div>`);
  document.getElementById('join-share-code').focus();
};

window.submitJoinGroup = async () => {
  const code = document.getElementById('join-share-code').value.trim().toUpperCase();
  if (!code) return;
  
  const btn = document.getElementById('join-btn');
  const err = document.getElementById('join-error');
  btn.disabled = true;
  btn.textContent = 'Joining...';
  err.textContent = '';

  try {
    const gid = await firebaseService.joinGroup(STATE.user.uid, code);
    showToast('Joined group successfully!', 'success');
    closeModal();
    // No need to manually refresh, listener will handle it
    if (gid) showGroup(gid);
  } catch (e) {
    err.textContent = e.message || 'Failed to join group';
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Join Group';
  }
};

window.confirmLeaveGroup = id => {
  const g = STATE.groups.find(g => g.id === id);
  if (!g) return;
  openConfirm('Leave Group', `Are you sure you want to leave <span class="confirm-hl">"${Utils.esc(g.name)}"</span>? You will lose access to all shared expenses.`,
    () => { Groups.leave(id); });
};

