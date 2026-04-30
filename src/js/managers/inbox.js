/* ================================================================
   INBOX MANAGER
   ================================================================ */
window.inboxManager = (() => {
  let _pageSize = 10;
  let _currentPage = 1;
  let _sortMode = 'newest';
  let _filterGroupId = 'all';

  function init() {
    if (!STATE.user || STATE.isGuest) return;
    
    firebaseService.listenToNotifications(STATE.user.uid, (notifs) => {
      STATE.notifications = notifs;
      updateUnreadBadge();
      if (document.getElementById('view-inbox')?.classList.contains('active')) {
        renderInbox();
      }
    });
  }

  function updateUnreadBadge() {
    const unreadCount = STATE.notifications.filter(n => !n.isRead).length;
    const badges = document.querySelectorAll('.inbox-badge');
    badges.forEach(b => {
      b.textContent = unreadCount > 99 ? '99+' : unreadCount;
      b.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
  }

  function renderInbox() {
    const c = document.getElementById('inbox-list');
    const pg = document.getElementById('inbox-pagination');
    if (!c) return;
    
    _updateGroupFilterDropdown();

    if (!STATE.notifications.length) {
      c.innerHTML = `<div class="empty-state" style="padding: 60px 20px">
        <div class="empty-state-icon">📥</div>
        <div class="empty-state-title">Inbox is empty</div>
        <p>Activity from your shared groups will appear here</p>
      </div>`;
      if (pg) pg.innerHTML = '';
      return;
    }

    // Filter
    let list = [...STATE.notifications];
    if (_filterGroupId !== 'all') {
      list = list.filter(n => n.groupId === _filterGroupId);
    }

    // Sort
    if (_sortMode === 'newest') list.sort((a,b) => (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0));
    else if (_sortMode === 'oldest') list.sort((a,b) => (a.createdAt?.toMillis?.()||0) - (b.createdAt?.toMillis?.()||0));
    else if (_sortMode === 'group') list.sort((a,b) => a.groupName.localeCompare(b.groupName));

    const totalPages = Math.ceil(list.length / _pageSize);
    if (_currentPage > totalPages) _currentPage = Math.max(1, totalPages);

    const start = (_currentPage - 1) * _pageSize;
    const paginated = list.slice(start, start + _pageSize);

    if (!paginated.length && _filterGroupId !== 'all') {
       c.innerHTML = `<div class="empty-state" style="padding: 40px 20px">
        <p>No activity found for this group.</p>
        <button class="btn btn-ghost btn-sm" onclick="inboxManager.setFilter('all')">Clear Filter</button>
      </div>`;
      if (pg) pg.innerHTML = '';
      return;
    }

    c.innerHTML = paginated.map(n => {
      const timestamp = n.createdAt?.toMillis ? n.createdAt.toMillis() : n.createdAt;
      const time = Utils.dateTime(timestamp);
      const isUnread = !n.isRead;
      const displayActor = n.actorId === STATE.user?.uid ? 'You' : n.actorName;
      
      return `<div class="notification-item ${isUnread ? 'unread' : ''}" onclick="inboxManager.markRead('${n.id}')">
        <div class="notif-indicator"></div>
        <div class="notif-content">
          <div class="notif-text"><strong>${Utils.esc(displayActor)}</strong> ${n.message}</div>
          <div class="notif-footer">
            <span class="notif-group">📁 ${Utils.esc(n.groupName)}</span>
            <span class="notif-time">🕒 ${time}</span>
          </div>
        </div>
        <div class="notif-actions" style="display:flex;flex-direction:column;gap:8px;align-items:center">
          ${(n.txId && n.type !== 'expense_deleted') ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); inboxManager.editTx('${n.groupId}', '${n.txId}')" style="padding:4px 8px;font-size:11px;color:var(--blue)">✎ Edit</button>` : ''}
          <button class="notif-clear-btn" onclick="event.stopPropagation(); inboxManager.clear('${n.id}')" title="Clear">✕</button>
        </div>
      </div>`;
    }).join('');

    // Pagination controls
    if (pg) {
      pg.innerHTML = totalPages > 1 ? `
        <div class="pagination-controls" style="display:flex;justify-content:center;align-items:center;gap:20px;margin-top:24px;padding-bottom:40px">
          <button class="btn btn-ghost btn-sm" ${_currentPage===1?'disabled':''} onclick="inboxManager.setPage(${_currentPage-1})">← Previous</button>
          <span style="font-size:12px;color:var(--text3);font-weight:600">Page ${_currentPage} / ${totalPages}</span>
          <button class="btn btn-ghost btn-sm" ${_currentPage===totalPages?'disabled':''} onclick="inboxManager.setPage(${_currentPage+1})">Next →</button>
        </div>` : '';
    }
  }

  function _updateGroupFilterDropdown() {
    const filter = document.getElementById('inbox-group-filter');
    if (!filter) return;
    
    const groups = {};
    STATE.notifications.forEach(n => { groups[n.groupId] = n.groupName; });
    
    const options = Object.entries(groups).map(([id, name]) => 
      `<option value="${id}" ${id === _filterGroupId ? 'selected' : ''}>${Utils.esc(name)}</option>`
    ).join('');
    
    filter.innerHTML = `<option value="all" ${_filterGroupId === 'all' ? 'selected' : ''}>All Groups</option>` + options;
  }

  function setPage(p) {
    _currentPage = p;
    renderInbox();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setSort(s) {
    _sortMode = s;
    _currentPage = 1;
    renderInbox();
  }

  function setFilter(gid) {
    _filterGroupId = gid;
    _currentPage = 1;
    renderInbox();
  }

  async function markRead(id) {
    const n = STATE.notifications.find(notif => notif.id === id);
    if (n && !n.isRead) {
      try {
        await firebaseService.updateNotification(id, { isRead: true });
      } catch (e) {
        console.error('Mark read error:', e);
      }
    }
  }

  async function clear(id) {
    try {
      await firebaseService.updateNotification(id, { isCleared: true });
    } catch (e) {
      console.error('Clear notification error:', e);
    }
  }

  async function clearAll() {
    if (!STATE.notifications.length) return;
    if (confirm('Clear all notifications?')) {
      try {
        await firebaseService.clearAllNotifications(STATE.user.uid);
      } catch (e) {
        console.error('Clear all error:', e);
      }
    }
  }

  async function editTx(groupId, txId) {
    let g = STATE.groups.find(g => g.id === groupId);
    if (!g) {
      showToast('Group not found. Opening dashboard...', 'info');
      showDashboard();
      return;
    }

    // Fetch latest data to ensure modal shows current info
    try {
      const latest = await firebaseService.getTransaction(groupId, txId);
      if (latest) {
        const idx = g.transactions.findIndex(t => t.id === txId);
        if (idx > -1) g.transactions[idx] = latest;
        else g.transactions.unshift(latest);
      } else {
        showToast('Expense no longer exists', 'error');
        return;
      }
    } catch (e) {
      console.warn('Sync fetch failed, using local data', e);
    }

    STATE.activeGroupId = groupId;
    showGroup(groupId); // Switch to group view first
    openAddTransactionModal(txId);
  }

  return { init, renderInbox, markRead, clear, clearAll, updateUnreadBadge, editTx, setPage, setSort, setFilter };
})();
