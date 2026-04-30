/* ================================================================
   TRANSACTIONS CRUD
   Supports new participants[] model and legacy splitBetween[] model
   ================================================================ */
const Transactions = {
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
      deletedFlag: false
    };
    group.transactions.unshift(tx);
    group.updatedAt = now;
    group.isDirty = true;
    syncManager.onDataChanged();
    return tx;
  },

  update(group, id, data) {
    const tx = group.transactions.find(t => t.id === id); if (!tx) return;
    const now = new Date().toISOString();
    Object.assign(tx, {
      desc: data.desc, amount: +data.amount,
      paidBy: data.paidBy,
      splitType: data.splitType || 'equal',
      participants: data.participants || null,
      splitBetween: data.splitBetween || [],
      updatedAt: now, emoji: Utils.emoji(data.desc),
      isDirty: true
    });
    group.updatedAt = now;
    group.isDirty = true;
    syncManager.onDataChanged();
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

