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
    </div>`; return;
  }
  c.innerHTML = `<div class="groups-grid">${visibleGroups.map(renderGroupCard).join('')}</div>`;
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
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditGroupModal('${g.id}')" title="Edit">✎</button>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="confirmDeleteGroup('${g.id}')" title="Delete">🗑</button>
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

