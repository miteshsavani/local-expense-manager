/* ================================================================
   PERMISSION MODAL — shows current user's group-level permissions
   ================================================================ */
window.openPermissionModal = () => {
  const g = Groups.active();
  if (!g) return;

  const isOwner = g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner';
  const gid = g.id;

  // For guests / owners show a simple informational dialog
  if (STATE.isGuest) {
    _renderPermModal({ role: 'Guest', isOwner: false, perms: _guestPerms() });
    return;
  }

  if (isOwner) {
    _renderPermModal({ role: 'Owner', isOwner: true, perms: _ownerPerms() });
    return;
  }

  // Member — pull from STATE.userPermissions
  const up = STATE.userPermissions[gid];
  const role = up?.role || g.roles?.[STATE.user?.uid] || 'viewer';
  const perms = up?.permissions || null;
  _renderPermModal({ role, isOwner: false, perms });
};

// ---- permission definitions (what each flag means) ----
const _GROUP_PERMS = [
  { key: 'canAddExpense',         label: 'Add Expenses',          icon: '➕', desc: 'Create new expense transactions in this group.' },
  { key: 'canEditOwnExpense',     label: 'Edit Own Expenses',     icon: '✏️', desc: 'Modify expenses that you personally added.' },
  { key: 'canEditOthersExpense',  label: 'Edit Others\' Expenses',icon: '🖊️', desc: 'Modify expenses added by other members.' },
  { key: 'canDeleteOwnExpense',   label: 'Delete Own Expenses',   icon: '🗑️', desc: 'Remove expenses that you personally added.' },
  { key: 'canDeleteOthersExpense',label: 'Delete Others\' Expenses',icon:'⛔','desc': 'Remove expenses added by other members.' },
  { key: 'canAddMembers',         label: 'Add Members',           icon: '👥', desc: 'Invite new members and sub-members to this group.' },
  { key: 'canRemoveMembers',      label: 'Remove Members',        icon: '🚫', desc: 'Remove existing members from this group.' },
];

const _PROFILE_PERMS = [
  { key: 'canShareGroups', label: 'Share Groups',    icon: '📤', desc: 'Generate share codes and invite others to join your groups.' },
  { key: 'canJoinGroups',  label: 'Join Groups',     icon: '🔗', desc: 'Join other users\' groups using a share code.' },
  { key: 'canUseCloudSync',label: 'Cloud Sync',      icon: '☁️', desc: 'Sync data between devices and the cloud in real-time.' },
  { key: 'canUseExport',   label: 'Export Data',     icon: '📊', desc: 'Export group data and transaction reports.' },
  { key: 'canUseReports',  label: 'View Analytics',  icon: '📈', desc: 'Access the analytics and insights tab.' },
];

function _ownerPerms() {
  const p = {};
  _GROUP_PERMS.forEach(d => { p[d.key] = true; });
  return p;
}

function _guestPerms() {
  const p = {};
  _GROUP_PERMS.forEach(d => { p[d.key] = true; });
  return p;
}

function _roleLabel(role) {
  const map = { owner: 'Owner', viewer: 'View Only', member: 'Member', admin: 'Admin' };
  return map[role] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member');
}

function _roleColor(role) {
  const map = { owner: '#6366f1', viewer: '#64748b', member: '#0ea5e9', admin: '#f59e0b' };
  return map[role] || 'var(--blue)';
}

function _permRow(def, granted, contactMsg) {
  const statusClass = granted ? 'perm-granted' : 'perm-denied';
  const statusIcon  = granted ? '\u2713' : '\u2717';
  const statusLabel = granted ? 'Allowed' : 'Restricted';
  const hint = contactMsg || 'Contact the group owner to request access.';
  return `
    <div class="perm-row ${statusClass}">
      <div class="perm-icon">${def.icon}</div>
      <div class="perm-body">
        <div class="perm-label">${def.label}</div>
        <div class="perm-desc">${def.desc}</div>
        ${!granted ? `<div class="perm-hint">${hint}</div>` : ''}
      </div>
      <div class="perm-status">
        <span class="perm-badge ${statusClass}">${statusIcon} ${statusLabel}</span>
      </div>
    </div>`;
}

function _renderPermModal({ role, isOwner, perms }) {
  const g = Groups.active();
  const roleColor = _roleColor(role.toLowerCase());
  const roleDisplay = _roleLabel(role.toLowerCase());

  // Group-level permissions section
  const groupPermsHtml = _GROUP_PERMS.map(def => {
    const granted = isOwner ? true : (perms ? !!perms[def.key] : false);
    return _permRow(def, granted);
  }).join('');

  const deniedCount = _GROUP_PERMS.filter(def => !(isOwner ? true : (perms ? !!perms[def.key] : false))).length;
  const summaryHtml = deniedCount > 0
    ? `<div class="perm-summary perm-summary-warn">⚠️ You have <strong>${deniedCount} restriction${deniedCount > 1 ? 's' : ''}</strong> in this group. Contact the group owner to request additional access.</div>`
    : `<div class="perm-summary perm-summary-ok">✅ You have full access to all group features.</div>`;

  const noPermsHtml = (!perms && !isOwner && !STATE.isGuest)
    ? `<div class="perm-loading-note">⏳ Group permissions are still loading from the server. Please check back in a moment.</div>`
    : '';

  openModal(`<div class="modal perm-modal">
    <div class="modal-header" style="margin-bottom:0">
      <div>
        <div class="modal-title">My Permissions</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${Utils.esc(g?.name || 'This Group')}</div>
      </div>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
    </div>

    <div class="perm-role-banner" style="--role-color:${roleColor}">
      <div class="perm-role-avatar" style="background:${roleColor}">${roleDisplay.charAt(0)}</div>
      <div>
        <div class="perm-role-name">${roleDisplay}</div>
        <div class="perm-role-sub">Your role in this group</div>
      </div>
    </div>

    ${noPermsHtml}
    ${summaryHtml}

    <div class="perm-section-title">
      <span>Group Permissions</span>
      <span class="perm-section-sub">What you can do in this group</span>
    </div>
    ${groupPermsHtml}

    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Got it</button>
    </div>
  </div>`);
}

/* ================================================================
   APP-LEVEL PERMISSION MODAL — shown from Dashboard
   ================================================================ */
window.openAppPermissionModal = () => {
  if (STATE.isGuest) {
    _renderAppPermModal(null, true);
    return;
  }
  _renderAppPermModal(STATE.userProfile?.permissions || null, false);
};

function _renderAppPermModal(profilePerms, isGuest) {
  const userName   = STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'You';
  const userStatus = STATE.userProfile?.status || (isGuest ? 'guest' : 'unknown');
  const userRole   = STATE.userProfile?.role   || (isGuest ? 'Guest' : 'User');
  const limits     = STATE.userProfile?.limits  || {};

  const statusMap = {
    approved:  { cls: 'perm-granted', icon: '\u2713', label: 'Approved' },
    pending:   { cls: 'perm-pending', icon: '\u23f3', label: 'Pending Approval' },
    rejected:  { cls: 'perm-denied',  icon: '\u2717', label: 'Rejected' },
    suspended: { cls: 'perm-denied',  icon: '\ud83d\udd12', label: 'Suspended' },
    guest:     { cls: 'perm-pending', icon: '\ud83d\udc64', label: 'Guest Mode' },
    unknown:   { cls: 'perm-pending', icon: '?',  label: 'Unknown' },
  };
  const st = statusMap[userStatus] || statusMap.unknown;

  const contactMsg = 'Contact the application admin to request access.';

  const permsHtml = isGuest
    ? `<div class="perm-loading-note">\ud83d\udc64 You\u2019re in Guest Mode. Sign in to see your personal app permissions.</div>`
    : (!profilePerms
      ? `<div class="perm-loading-note">\u23f3 App permissions are loading. Please try again in a moment.</div>`
      : _PROFILE_PERMS.map(def => _permRow(def, !!profilePerms[def.key], contactMsg)).join(''));

  const _limitDisplay = (val) => (!val || val === 0) ? '∞' : val;
  const _isUnlimited  = (val) => !val || val === 0;
  const maxG  = limits.maxGroups;
  const maxTx = limits.maxTransactions;
  const groupUnlimited = _isUnlimited(maxG);
  const txUnlimited    = _isUnlimited(maxTx);

  // Build the contextual plain-language note
  const _limitsNote = (() => {
    if (groupUnlimited && txUnlimited)
      return `<div class="perm-limits-note perm-limits-note-ok">✅ You can create <strong>unlimited groups</strong> and add <strong>unlimited transactions</strong>.</div>`;
    if (!groupUnlimited && !txUnlimited)
      return `<div class="perm-limits-note perm-limits-note-warn">⚠️ You can create up to <strong>${maxG} group${maxG === 1 ? '' : 's'}</strong> and add up to <strong>${maxTx} transaction${maxTx === 1 ? '' : 's'}</strong> per group. Contact the admin to increase your limits.</div>`;
    if (!groupUnlimited)
      return `<div class="perm-limits-note perm-limits-note-warn">⚠️ You can create up to <strong>${maxG} group${maxG === 1 ? '' : 's'}</strong>, but you can add <strong>unlimited transactions</strong>. Contact the admin to increase your group limit.</div>`;
    return `<div class="perm-limits-note perm-limits-note-warn">⚠️ You have <strong>unlimited groups</strong>, but each group is capped at <strong>${maxTx} transaction${maxTx === 1 ? '' : 's'}</strong>. Contact the admin to increase your transaction limit.</div>`;
  })();

  const limitsHtml = (!isGuest && (maxG !== undefined || maxTx !== undefined))
    ? `<div class="perm-section-title" style="margin-top:20px">
        <span>Account Limits</span>
        <span class="perm-section-sub">Caps set by the application admin</span>
      </div>
      <div class="perm-limits-grid">
        <div class="perm-limit-card ${groupUnlimited ? 'perm-limit-unlimited' : ''}">
          <div class="perm-limit-val">${_limitDisplay(maxG)}</div>
          <div class="perm-limit-label">Max Groups</div>
        </div>
        <div class="perm-limit-card ${txUnlimited ? 'perm-limit-unlimited' : ''}">
          <div class="perm-limit-val">${_limitDisplay(maxTx)}</div>
          <div class="perm-limit-label">Max Transactions</div>
        </div>
      </div>
      ${_limitsNote}`
    : '';


  const deniedCount = (!isGuest && profilePerms)
    ? _PROFILE_PERMS.filter(d => !profilePerms[d.key]).length : 0;
  const summaryHtml = isGuest ? '' : (deniedCount > 0
    ? `<div class="perm-summary perm-summary-warn">\u26a0\ufe0f You have <strong>${deniedCount} app-level restriction${deniedCount > 1 ? 's' : ''}</strong>. Contact the application admin to request access.</div>`
    : (profilePerms ? `<div class="perm-summary perm-summary-ok">\u2705 You have full access to all app features.</div>` : ''));

  openModal(`<div class="modal perm-modal">
    <div class="modal-header" style="margin-bottom:0">
      <div>
        <div class="modal-title">App Permissions</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Your platform-wide access level</div>
      </div>
      <button class="btn btn-ghost btn-icon" onclick="closeModal()">&times;</button>
    </div>

    <div class="perm-role-banner" style="--role-color:#6366f1">
      <div class="perm-role-avatar" style="background:#6366f1">${userName.charAt(0).toUpperCase()}</div>
      <div style="flex:1">
        <div class="perm-role-name">${Utils.esc(userName)}</div>
        <div class="perm-role-sub" style="display:flex;align-items:center;gap:8px">
          ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          &nbsp;&middot;&nbsp;
          <span class="perm-badge perm-${st.cls}" style="font-size:10px;padding:1px 7px">${st.icon} ${st.label}</span>
        </div>
      </div>
    </div>

    ${summaryHtml}

    <div class="perm-section-title">
      <span>Feature Access</span>
      <span class="perm-section-sub">Platform permissions assigned to your account</span>
    </div>
    ${permsHtml}
    ${limitsHtml}

    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Got it</button>
    </div>
  </div>`);
}
