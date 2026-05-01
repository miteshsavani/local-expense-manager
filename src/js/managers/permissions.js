/* ================================================================
   PERMISSION MANAGER
   ================================================================ */
window.permissionManager = (() => {
  
  function can(action, gid) {
    const groupId = gid || STATE.activeGroupId;
    if (!groupId) return false;
    if (STATE.isGuest) return true;

    const g = STATE.groups.find(g => g.id === groupId);
    if (!g) return false;

    // Owner always has all rights
    if (g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner') return true;

    const up = STATE.userPermissions[groupId];
    if (!up) return false; // Default: locked until permissions load

    const p = up.permissions || {};

    switch (action) {
      case 'add_expense':    return !!p.canAddExpense;
      case 'add_member':     return !!p.canAddMembers;
      case 'remove_member':  return !!p.canRemoveMembers;
      case 'edit_member':    return !!p.canAddMembers; // Assume adders can edit for now, or add a field if needed
      case 'edit_group':     return false; // Only owner can edit group metadata
      case 'delete_group':   return false;
      default: return false;
    }
  }

  function canEditTx(tx, gid) {
    const groupId = gid || STATE.activeGroupId;
    if (STATE.isGuest) return true;
    
    const g = STATE.groups.find(g => g.id === groupId);
    if (!g) return false;
    if (g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner') return true;

    const up = STATE.userPermissions[groupId];
    if (!up) return false;
    const p = up.permissions || {};

    const isOwn = (tx.createdBy === STATE.user?.uid) || (tx.updatedBy === STATE.user?.uid);
    return isOwn ? !!p.canEditOwnExpense : !!p.canEditOthersExpense;
  }

  function canDeleteTx(tx, gid) {
    const groupId = gid || STATE.activeGroupId;
    if (STATE.isGuest) return true;
    
    const g = STATE.groups.find(g => g.id === groupId);
    if (!g) return false;
    if (g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner') return true;

    const up = STATE.userPermissions[groupId];
    if (!up) return false;
    const p = up.permissions || {};

    const isOwn = (tx.createdBy === STATE.user?.uid) || (tx.updatedBy === STATE.user?.uid);
    return isOwn ? !!p.canDeleteOwnExpense : !!p.canDeleteOthersExpense;
  }

  /* Helper to start/stop listeners for current active group */
  let _unsub = null;
  function watchActivePermissions(gid) {
    if (_unsub) { _unsub(); _unsub = null; }
    if (!gid || STATE.isGuest) return;

    _unsub = firebaseService.listenToMemberPermissions(gid, STATE.user.uid, (data) => {
      if (data) {
        STATE.userPermissions[gid] = data;
        // Re-render UI to reflect permission changes instantly
        if (STATE.activeGroupId === gid) renderGroup();
      }
    });
  }

  return { can, canEditTx, canDeleteTx, watchActivePermissions };
})();
