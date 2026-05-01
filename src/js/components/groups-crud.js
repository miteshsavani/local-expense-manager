/* ================================================================
   GROUPS CRUD
   All mutations set isDirty=true and call syncManager.onDataChanged()
   ================================================================ */
window.Groups = {
  active: () => STATE.groups.find(g => g.id === STATE.activeGroupId),

  create(name, members) {
    // Limit check
    if (STATE.user && STATE.userProfile) {
      const ownedCount = STATE.groups.filter(g => g.ownerId === STATE.user.uid && !g.deletedFlag).length;
      const max = STATE.userProfile.limits?.maxGroups || 3;
      if (max !== 0) {
        if (ownedCount >= max) {
          showToast(`Limit reached: You can own up to ${max} groups.`, 'error');
          throw new Error('Limit reached');
        }
        if (ownedCount >= max * 0.8) {
          showToast(`Warning: You are using ${ownedCount}/${max} groups.`, 'warning');
        }
      }
    }

    const now = new Date().toISOString();
    const normMembers = memberManager.normalize(members);
    const g = {
      id: Utils.uid(), 
      name: name.trim(),
      ownerId: STATE.user?.uid || null,
      members: normMembers,
      transactions: [],
      createdAt: now, updatedAt: now,
      isDirty: true
    };
    STATE.groups.unshift(g);
    syncManager.onDataChanged();
    return g;
  },

  delete(id) {
    const g = STATE.groups.find(g => g.id === id);
    if (g) {
      // Mark for deletion — will be removed from state after successful push
      g.deletedFlag = true;
      g.isDirty = true;
    }
    syncManager.onDataChanged();
    renderDashboard();
  },

  update(id, patch) {
    const g = STATE.groups.find(g => g.id === id);
    if (g) {
      Object.assign(g, patch, { updatedAt: new Date().toISOString(), isDirty: true });
    }
    syncManager.onDataChanged();
  },

  leave(id) {
    const g = STATE.groups.find(g => g.id === id);
    if (g) {
      g.leftFlag = true; // Mark as left
      g.isDirty = true;
    }
    syncManager.onDataChanged();
    renderDashboard();
  }
};

