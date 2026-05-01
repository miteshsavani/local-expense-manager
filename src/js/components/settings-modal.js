/* ================================================================
   SETTINGS MODAL
   ================================================================ */
window.openSettingsModal = () => {
  const user = STATE.user;
  const ago  = STATE.lastSyncAt ? _timeAgo(STATE.lastSyncAt) : null;
  const syncDesc = !navigator.onLine ? '○ Offline'
    : !STATE.syncEnabled ? '⏸ Sync paused'
    : STATE.pendingChanges ? '● Changes pending sync'
    : ago ? `✓ Last synced ${ago}` : 'Not synced yet';

  // Build sync section only for logged-in non-guest users
  const syncSection = STATE.isGuest ? '' : `
    <div class="settings-section">
      <div class="settings-section-title">☁ Cloud Sync</div>
      <div class="settings-row">
        <div><div class="settings-label">Sync Status</div><div class="settings-desc">${syncDesc}</div></div>
        <button class="btn btn-secondary btn-sm" onclick="_settingsSyncNow()" ${(!STATE.syncEnabled || !navigator.onLine)?'disabled':''}>${!navigator.onLine?'○ Offline':'↻ Sync Now'}</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Enable Sync</div><div class="settings-desc">Push/pull changes to Firebase</div></div>
        <label class="toggle-wrap">
          <input type="checkbox" id="sync-enabled-toggle" ${STATE.syncEnabled?'checked':''} onchange="uiManager.setSyncEnabled(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Auto Backup</div><div class="settings-desc">Every ${STATE.backupInterval}s when online</div></div>
        <label class="toggle-wrap">
          <input type="checkbox" id="backup-toggle" ${STATE.backupEnabled?'checked':''} onchange="_toggleBackup(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row" id="interval-row" style="${STATE.backupEnabled?'':'opacity:.4;pointer-events:none'}">
        <div><div class="settings-label">Backup Interval</div><div class="settings-desc">Seconds (30–3600)</div></div>
        <input class="input" id="backup-interval" type="number" min="30" max="3600" value="${STATE.backupInterval}" style="width:80px" onchange="_changeInterval(this.value)">
      </div>
    </div>`;

  // Build account section
  const accountSection = STATE.isGuest
    ? `<div class="settings-section">
        <div class="settings-section-title">👤 Guest Mode</div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Not signed in</div>
            <div class="settings-desc">Your data is stored locally in this browser only</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="closeModal();uiManager.showAuthFromGuest()">Sign In / Register</button>
        </div>
      </div>`
    : `<div class="settings-section">
        <div class="settings-section-title">👤 Account</div>
        <div class="settings-row">
          <div><div class="settings-label">${Utils.esc(user?.displayName||'User')}</div><div class="settings-desc">${Utils.esc(user?.email||'')}</div></div>
        </div>
      </div>`;

  openModal(`<div class="modal modal-wide">
    <div class="modal-header"><div class="modal-title">⚙ Settings</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    ${accountSection}
    ${STATE.isGuest ? '' : _renderAccessSection()}
    ${syncSection}
    <div class="settings-section">
      <div class="settings-section-title">🎨 Appearance</div>
      <div class="settings-row">
        <div><div class="settings-label">Font Family</div><div class="settings-desc">Change the app's body font</div></div>
        <select class="select" id="font-select" style="width:140px" onchange="window._changeFont(this.value)">
          <option value="DM Sans"          ${STATE.fontFamily==='DM Sans'?'selected':''}>DM Sans</option>
          <option value="Inter"            ${STATE.fontFamily==='Inter'?'selected':''}>Inter</option>
          <option value="Roboto"           ${STATE.fontFamily==='Roboto'?'selected':''}>Roboto</option>
          <option value="Playfair Display" ${STATE.fontFamily==='Playfair Display'?'selected':''}>Playfair Display</option>
          <option value="system-ui"        ${STATE.fontFamily==='system-ui'?'selected':''}>System Font</option>
        </select>
      </div>
    </div>
    <div class="divider"></div>
    <div class="settings-section">
      <div class="settings-section-title">🔒 Data Safety</div>
      <div class="settings-row">
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
          ${STATE.isGuest
            ? '⚠ Guest mode: data is stored in this browser only. Sign in to back up to the cloud.'
            : 'Data is stored locally and synced incrementally to Firebase. Only changed records are pushed/pulled.'}
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">More Tools</div><div class="settings-desc">Advanced data handling options</div></div>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();openImportExportModal()">⇅ Import / Export</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Export Backup</div><div class="settings-desc">Download all data as JSON</div></div>
        <button class="btn btn-secondary btn-sm" onclick="${(STATE.userProfile && !STATE.userProfile.permissions?.canUseExport) ? 'showToast(\'Export restricted\',\'error\')' : 'exportJSON(\'all\');closeModal()'}" ${ (STATE.userProfile && !STATE.userProfile.permissions?.canUseExport) ? 'style="opacity:0.5"' : ''}>⬇ Backup JSON</button>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  </div>`);
}
window._settingsSignOut  = async () => { closeModal(); await authManager.signOut(); };
window._settingsSyncNow  = async () => { closeModal(); await syncManager.syncNow(); openSettingsModal(); };
window._toggleBackup     = (on) => {
  STATE.backupEnabled = on; localCacheManager.saveSettings(); backupScheduler.restart();
  const row = document.getElementById('interval-row');
  if(row) row.style = on ? '' : 'opacity:.4;pointer-events:none';
};
window._changeInterval = (val) => {
  STATE.backupInterval = Math.max(30, Math.min(3600, parseInt(val)||120));
  localCacheManager.saveSettings(); backupScheduler.restart();
};

window._timeAgo = iso => {
  const s = Math.round((Date.now() - new Date(iso))/1000);
  if (s < 10)    return 'just now';
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  const d = Math.floor(s/86400);
  return d===1 ? 'yesterday' : `${d} days ago`;
}

function _renderAccessSection() {
  const p = STATE.userProfile || {};
  const status = p.status || 'pending';
  const limits = p.limits || { maxGroups: 3, maxTransactions: 100 };
  
  // Calculate Group Usage
  const currentGroups = STATE.groups.filter(g => g.ownerId === STATE.user?.uid && !g.deletedFlag).length;
  const isGroupsUnlimited = limits.maxGroups === 0;
  const groupPerc = isGroupsUnlimited ? 0 : Math.min(100, (currentGroups / limits.maxGroups) * 100);
  const groupStatus = groupPerc >= 100 ? 'danger' : groupPerc >= 80 ? 'warning' : '';

  // Calculate Transaction Usage
  let currentTx = 0;
  STATE.groups.forEach(g => {
    if (g.ownerId === STATE.user?.uid) {
      currentTx += g.transactions.filter(t => !t.deletedFlag).length;
    }
  });
  const isTxUnlimited = limits.maxTransactions === 0;
  const txPerc = isTxUnlimited ? 0 : Math.min(100, (currentTx / limits.maxTransactions) * 100);
  const txStatus = txPerc >= 100 ? 'danger' : txPerc >= 80 ? 'warning' : '';

  const perms = p.permissions || {};
  const permList = [
    { label: 'Create Groups', val: true }, // Logic: if they can see this, they are approved (mostly)
    { label: 'Add Expenses', val: true },
    { label: 'Edit Expenses', val: perms.canEditOwnTransactions ?? true },
    { label: 'Delete Expenses', val: perms.canDeleteOwnTransactions ?? true },
    { label: 'Share Groups', val: perms.canShareGroups ?? false },
    { label: 'Join Groups', val: perms.canJoinGroups ?? false },
    { label: 'Export Data', val: perms.canUseExport ?? false },
    { label: 'View Reports', val: perms.canUseReports ?? false },
    { label: 'Cloud Sync', val: perms.canUseCloudSync ?? false }
  ];

  return `
    <div class="settings-section">
      <div class="settings-section-title">🛡️ My Access & Limits</div>
      <div style="margin-bottom:16px">
        <span class="user-status-badge status-${status}">${status}</span>
        ${p.approvedAt ? `<span class="text-xs text-muted" style="margin-left:8px">Approved on ${Utils.date(p.approvedAt.toDate ? p.approvedAt.toDate() : p.approvedAt)}</span>` : ''}
      </div>
      
      <div class="access-grid">
        <div class="limit-card">
          <div class="limit-label">Groups Owned</div>
          <div class="limit-value">${currentGroups} / ${isGroupsUnlimited ? 'Unlimited' : limits.maxGroups}</div>
          ${isGroupsUnlimited ? '' : `
            <div class="progress-bg"><div class="progress-fill ${groupStatus}" style="width:${groupPerc}%"></div></div>
            ${groupPerc >= 80 ? `<div style="font-size:10px;color:var(--${groupStatus==='danger'?'accent':'yellow'});margin-top:4px;font-weight:600">${groupPerc>=100?'Limit reached':'Nearing limit'}</div>` : ''}
          `}
        </div>
        <div class="limit-card">
          <div class="limit-label">Total Expenses</div>
          <div class="limit-value">${currentTx} / ${isTxUnlimited ? 'Unlimited' : limits.maxTransactions}</div>
          ${isTxUnlimited ? '' : `
            <div class="progress-bg"><div class="progress-fill ${txStatus}" style="width:${txPerc}%"></div></div>
            ${txPerc >= 80 ? `<div style="font-size:10px;color:var(--${txStatus==='danger'?'accent':'yellow'});margin-top:4px;font-weight:600">${txPerc>=100?'Limit reached':'Nearing limit'}</div>` : ''}
          `}
        </div>
      </div>

      <div class="perm-list">
        ${permList.map(item => `
          <div class="perm-item">
            <span class="perm-dot ${item.val ? 'allow' : 'deny'}"></span>
            <span style="${item.val ? '' : 'opacity:0.6'}">${item.label}</span>
          </div>
        `).join('')}
      </div>
      
      ${p.lastPermissionUpdate ? `
        <div style="margin-top:12px;font-size:10px;color:var(--text3);text-align:right">
          Last permission update: ${Utils.date(p.lastPermissionUpdate.toDate ? p.lastPermissionUpdate.toDate() : p.lastPermissionUpdate)}
        </div>
      ` : ''}
    </div>
    <div class="divider"></div>`;
}

