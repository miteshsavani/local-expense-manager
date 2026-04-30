/* ================================================================
   GROUPS CRUD
   All mutations set isDirty=true and call syncManager.onDataChanged()
   ================================================================ */
window.Groups = {
  active: () => STATE.groups.find(g => g.id === STATE.activeGroupId),

  create(name, members) {
    const now = new Date().toISOString();
    const normMembers = memberManager.normalize(members);
    const g = {
      id: Utils.uid(), name: name.trim(),
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
  }
};

