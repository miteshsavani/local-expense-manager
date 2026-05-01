/* ================================================================
   TRANSACTIONS CRUD
   Supports new participants[] model and legacy splitBetween[] model
   ================================================================ */
window.Transactions = {
  add(group, data) {
    const now = new Date().toISOString();
    const tx = {
      id: Utils.uid(),
      desc: data.desc,
      amount: +data.amount,
      paidBy: data.paidBy,
      splitType: data.splitType || 'equal',
      participants: data.participants || null,
      splitBetween: data.splitBetween || [],  // keep for backward compat
      date: now, updatedAt: now,
      emoji: Utils.emoji(data.desc),
      isDirty: true,
      deletedFlag: false,
      createdBy: STATE.user?.uid,
      updatedBy: STATE.user?.uid,
      updatedByName: STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'Unknown',
      history: [{
        at: now,
        by: STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'Unknown',
        action: `Created expense (₹ ${data.amount})`
      }]
    };
    group.transactions.unshift(tx);
    group.updatedAt = now;
    group.isDirty = true;
    syncManager.onDataChanged();
    
    // Create activity notification
    if (!STATE.isGuest && STATE.syncEnabled && group.userIds?.length > 1) {
      firebaseService.createNotifications(group, {
        type: 'expense_added',
        txId: tx.id,
        message: `added expense ₹${tx.amount} for ${tx.desc}`,
        metadata: { newValue: tx.amount }
      });
    }
    return tx;
  },

  update(group, id, data) {
    const tx = group.transactions.find(t => t.id === id); if (!tx) return;
    const oldAmount = tx.amount;
    const oldDesc = tx.desc;
    const now = new Date().toISOString();
    Object.assign(tx, {
      desc: data.desc, amount: +data.amount,
      paidBy: data.paidBy,
      splitType: data.splitType || 'equal',
      participants: data.participants || null,
      splitBetween: data.splitBetween || [],
      updatedAt: now, emoji: Utils.emoji(data.desc),
      isDirty: true,
      updatedByName: STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'Unknown'
    });
    if (!tx.history) tx.history = [];
    tx.history.push({
      at: now,
      by: STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'Unknown',
      action: `Updated expense (₹${tx.amount})`
    });
    group.updatedAt = now;
    group.isDirty = true;
    syncManager.onDataChanged();

    // Create activity notification
    if (!STATE.isGuest && STATE.syncEnabled && group.userIds?.length > 1) {
      const msg = data.amount !== oldAmount 
        ? `updated expense ${data.desc}: ₹${oldAmount} → ₹${data.amount}`
        : `updated expense details for ${data.desc}`;
      firebaseService.createNotifications(group, {
        type: 'expense_updated',
        txId: data.id || id,
        message: msg,
        metadata: { oldValue: oldAmount, newValue: data.amount }
      });
    }
    return tx;
  },

  delete(group, id) {
    const tx = group.transactions.find(t => t.id === id);
    if (tx) {
      // Mark for remote deletion; will be filtered from UI but kept for sync
      tx.deletedFlag = true;
      tx.isDirty = true;
      tx.updatedAt = new Date().toISOString();
    }
    group.updatedAt = new Date().toISOString();
    group.isDirty = true;
    syncManager.onDataChanged();

    // Create activity notification
    if (!STATE.isGuest && STATE.syncEnabled && group.userIds?.length > 1 && tx) {
      firebaseService.createNotifications(group, {
        type: 'expense_deleted',
        message: `removed expense ${tx.desc} (₹${tx.amount})`,
        metadata: { oldValue: tx.amount }
      });
    }
  },

  sorted(txns, sort, search) {
    // Filter out deleted
    let list = txns.filter(t => !t.deletedFlag);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.desc.toLowerCase().includes(q) || t.paidBy.toLowerCase().includes(q));
    }
    if      (sort==='date-asc')    list.sort((a,b) => new Date(a.date)-new Date(b.date));
    else if (sort==='amount-desc') list.sort((a,b) => b.amount-a.amount);
    else if (sort==='amount-asc')  list.sort((a,b) => a.amount-b.amount);
    else list.sort((a,b) => new Date(b.date)-new Date(a.date));
    return list;
  },

  /* Compute per-person share for display */
  perPersonShare(tx) {
    if (!tx.participants || !tx.participants.length) {
      const cnt = (tx.splitBetween||[]).length || 1;
      return { type:'equal', amount: tx.amount/cnt };
    }
    if (tx.splitType === 'equal') {
      return { type:'equal', amount: tx.amount/tx.participants.length };
    }
    return { type:'custom' };
  }
};

