/* ================================================================
   REPORT MANAGER — supports sub-members and custom splits
   ================================================================ */
window.reportManager = {
  computeBalancesForGroup(group) {
    return Utils.computeBalances(group);
  },

  /* Per-member aggregated spending (paid + owed), sub-members aggregated to parent */
  memberStats(group) {
    const norm = memberManager.normalize(group.members);
    const paid = {}, owed = {};
    norm.forEach(m => { paid[m.id] = 0; owed[m.id] = 0; });

    group.transactions.filter(tx => !tx.deletedFlag).forEach(tx => {
      if (paid[tx.paidBy] !== undefined) paid[tx.paidBy] += tx.amount;

      const participants = tx.participants;
      if (participants && participants.length) {
        if (tx.splitType === 'custom') {
          participants.forEach(p => { if(owed[p.memberId]!==undefined) owed[p.memberId] += p.customAmount||0; });
        } else if (tx.splitType === 'share') {
          const totalShares = participants.reduce((s,p) => s+(p.shareCount||1), 0);
          participants.forEach(p => {
            const share = tx.amount * (p.shareCount||1) / totalShares;
            if(owed[p.memberId]!==undefined) owed[p.memberId] += share;
          });
        } else {
          const share = tx.amount / participants.length;
          participants.forEach(p => { if(owed[p.memberId]!==undefined) owed[p.memberId] += share; });
        }
      } else {
        const share = tx.amount / (tx.splitBetween||[]).length || tx.amount;
        (tx.splitBetween||[]).forEach(m => { if(owed[m]!==undefined) owed[m] += share; });
      }
    });

    // Aggregate sub-members into their parent
    const mains = norm.filter(m => !m.parentId);
    mains.forEach(m => {
      const subs = norm.filter(s => s.parentId === m.id);
      subs.forEach(s => {
        paid[m.id] = (paid[m.id]||0) + (paid[s.id]||0);
        owed[m.id] = (owed[m.id]||0) + (owed[s.id]||0);
      });
    });

    return { paid, owed, members: norm };
  }
};

