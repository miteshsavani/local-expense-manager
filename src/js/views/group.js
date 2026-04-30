/* ================================================================
   GROUP VIEW
   ================================================================ */
window.renderGroup = () => {
  const g = Groups.active(); if (!g) { showDashboard(); return; }
  const normMembers = memberManager.normalize(g.members);
  const mainMembers = normMembers.filter(m => !m.parentId);
  document.getElementById('group-breadcrumb').textContent = g.name;
  document.getElementById('group-title').textContent    = g.name;
  document.getElementById('group-subtitle').textContent = `${normMembers.length} members (${mainMembers.length} main) · Created ${Utils.date(g.createdAt)}`;
  renderSummaryCards(g);
  renderTransactions();
}

window.renderSummaryCards = g => {
  const activeTx = g.transactions.filter(t => !t.deletedFlag);
  const total = activeTx.reduce((s,t)=>s+t.amount,0);
  const normMembers = memberManager.normalize(g.members);
  const avg = normMembers.length ? total/normMembers.length : 0;
  const bals = Utils.computeBalances(g);
  const vals = Object.values(bals);
  const maxD = vals.length ? Math.min(...vals) : 0;
  const maxC = vals.length ? Math.max(...vals) : 0;
  const dirtyCount = g.transactions.filter(t => t.isDirty && !t.deletedFlag).length;
  const dirtyBadge = (dirtyCount > 0 && !STATE.isGuest)
    ? `<div class="summary-card" style="border-color:var(--yellow)">
        <div class="summary-card-val" style="color:var(--yellow);font-size:18px">${dirtyCount}</div>
        <div class="summary-card-label" style="color:var(--yellow)">${!STATE.syncEnabled ? 'Pending Sync' : 'Syncing'}</div>
      </div>` : '';
  document.getElementById('summary-cards').innerHTML = `
    <div class="summary-card"><div class="summary-card-val">${Utils.fmt(total)}</div><div class="summary-card-label">Total Spent</div></div>
    <div class="summary-card"><div class="summary-card-val">${Utils.fmt(avg)}</div><div class="summary-card-label">Per Person</div></div>
    <div class="summary-card"><div class="summary-card-val" style="color:var(--accent)">${Utils.fmt(Math.abs(maxD))}</div><div class="summary-card-label">Largest Debt</div></div>
    <div class="summary-card"><div class="summary-card-val" style="color:var(--green)">${Utils.fmt(maxC)}</div><div class="summary-card-label">Largest Credit</div></div>
    <div class="summary-card"><div class="summary-card-val">${activeTx.length}</div><div class="summary-card-label">Expenses</div></div>
    <div class="summary-card"><div class="summary-card-val">${normMembers.length}</div><div class="summary-card-label">Members</div></div>
    ${dirtyBadge}`;
}

window.renderTransactions = () => {
  const g = Groups.active(); if (!g) return;
  const search = document.getElementById('tx-search').value;
  const sort   = document.getElementById('tx-sort').value;
  const list   = Transactions.sorted(g.transactions, sort, search);
  const c = document.getElementById('transactions-list');
  const normM = memberManager.normalize(g.members);
  const getName = id => normM.find(m => m.id === id)?.name || id;

  if (!list.length) {
    c.innerHTML = `<div class="empty-state" style="padding:40px">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-title">${search?'No results':'No expenses yet'}</div>
      <p>${search?'Try a different search term':'Add your first expense'}</p>
    </div>`; return;
  }
  c.innerHTML = `<div class="transactions-list">${list.map(tx => {
    const share = Transactions.perPersonShare(tx);
    const shareLabel = share.type==='equal' ? `${Utils.fmt(share.amount)}/person` : 'custom split';
    const showDirty = tx.isDirty && !STATE.isGuest;
    const dirtyIndicator = showDirty
      ? `<span class="tx-dirty-dot" title="Pending sync"></span>` : '';
    const cardClass = showDirty ? 'card transaction-card tx-card-dirty' : 'card transaction-card';
    const cornerText = !STATE.syncEnabled ? 'Pending Sync' : 'Syncing';
    const txCornerBadge = showDirty ? `<span class="card-pending-corner" title="Pending sync">${cornerText}</span>` : '';

    // Participant display
    let participantDisplay = '';
    if (tx.participants && tx.participants.length) {
      participantDisplay = tx.participants.slice(0,4).map(p => {
        const mName = getName(p.memberId);
        const shareAmt = tx.splitType==='custom' ? Utils.fmt(p.customAmount||0) :
          tx.splitType==='share' ? `${p.shareCount||1}x` : '';
        return `<span class="tx-share-pill">${Utils.esc(mName)}${shareAmt?' ('+shareAmt+')':''}</span>`;
      }).join('');
      if (tx.participants.length > 4) participantDisplay += `<span class="tx-share-pill">+${tx.participants.length-4}</span>`;
    } else {
      participantDisplay = (tx.splitBetween||[]).slice(0,3).map(m =>
        `<span class="tx-share-pill">${Utils.esc(getName(m))}</span>`
      ).join('');
      if ((tx.splitBetween||[]).length > 3) participantDisplay += `<span class="tx-share-pill">+${tx.splitBetween.length-3}</span>`;
    }

    return `<div class="${cardClass}" style="position:relative">
      ${txCornerBadge}
      <div class="tx-icon">${tx.emoji||'💰'}</div>
      <div class="tx-body">
        <div class="tx-desc" style="display:flex;align-items:center;gap:6px">${dirtyIndicator}${Utils.esc(tx.desc)}</div>
        <div class="tx-meta">
          <span>👤 ${Utils.esc(getName(tx.paidBy))}</span>
          <span>🗓 ${Utils.dateTime(tx.date)}</span>
        </div>
        <div class="tx-share-pills">${participantDisplay}</div>
      </div>
      <div class="tx-amount">
        <div class="tx-amount-val">${Utils.fmt(tx.amount)}</div>
        <div class="tx-per-person">${shareLabel}</div>
      </div>
      <div class="tx-actions">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openAddTransactionModal('${tx.id}')" title="Edit">✎</button>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="confirmDeleteTransaction('${tx.id}')" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.renderBalances = () => {
  const g = Groups.active(); if (!g) return;
  const b = Utils.computeBalances(g);
  const normM = memberManager.normalize(g.members);
  document.getElementById('balances-content').innerHTML = `
    <div class="section-title">Balance Sheet</div>
    <div class="balance-list">${Object.entries(b).map(([id,amt]) => {
      const member = normM.find(m => m.id === id) || { name: id, parentId: null };
      const isSubMember = member.parentId;
      if (isSubMember) return '';
      const cls   = amt>0.009?'positive':amt<-0.009?'negative':'neutral';
      const label = amt>0.009?'Gets back':amt<-0.009?'Owes':'Settled';
      const subBadge = member.parentId ? '<span class="group-pending-badge" style="background:var(--blue-bg);color:var(--blue);border-color:#c7ddf7">sub</span>' : '';
      return `<div class="balance-row" style="${member.parentId?'margin-left:24px;opacity:.85':''}">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="chip-avatar" style="background:${Utils.memberColor(member.name)};width:32px;height:32px;font-size:13px">${Utils.initials(member.name)}</div>
          <div><div style="font-weight:600">${Utils.esc(member.name)} ${subBadge}</div><div class="text-sm text-muted">${label}</div></div>
        </div>
        <div class="balance-amount ${cls}">${amt>=0?'+':''}${Utils.fmt(amt)}</div>
      </div>`;
    }).join('')}</div>`;
}

window.renderSettle = () => {
  const g = Groups.active(); if (!g) return;
  const s = Utils.computeSettlements(Utils.computeBalances(g));
  const normM = memberManager.normalize(g.members);
  const getName = id => normM.find(m => m.id === id)?.name || id;
  document.getElementById('settle-content').innerHTML = `
    <div class="section-title">Minimum Settlements Required</div>
    ${s.length
      ? `<div class="info-text" style="margin-bottom:12px">Fewest transactions to settle all debts</div>
         <div class="settlement-list">${s.map(x=>`<div class="settlement-row">
           <div class="chip-avatar" style="background:${Utils.memberColor(getName(x.from))}">${Utils.initials(getName(x.from))}</div>
           <strong>${Utils.esc(getName(x.from))}</strong>
           <span style="color:var(--green);font-size:18px">→</span>
           <div class="chip-avatar" style="background:${Utils.memberColor(getName(x.to))}">${Utils.initials(getName(x.to))}</div>
           <strong>${Utils.esc(getName(x.to))}</strong>
           <span style="flex:1;text-align:right;font-weight:700;font-family:var(--font-mono);color:var(--green)">${Utils.fmt(x.amount)}</span>
         </div>`).join('')}</div>`
      : `<div class="card" style="text-align:center;padding:32px;color:var(--text3)">✅ All settled up!</div>`}`;
}

window.renderAnalytics = () => {
  const g = Groups.active(); if (!g) return;
  const { paid, owed, members } = reportManager.memberStats(g);
  const mainMembers = members.filter(m => !m.parentId);
  const total = g.transactions.filter(t=>!t.deletedFlag).reduce((s,t)=>s+t.amount,0);
  const maxP = Math.max(...mainMembers.map(m=>paid[m.id]||0),1);
  const maxO = Math.max(...mainMembers.map(m=>owed[m.id]||0),1);
  const bars = (getter,max) => mainMembers.map(m => {
    const a = getter(m.id)||0;
    return `<div class="bar-row"><div class="bar-label"><span>${Utils.esc(m.name)}</span><span class="font-mono">${Utils.fmt(a)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(a/max*100).toFixed(1)}%;background:${Utils.memberColor(m.name)}"></div></div></div>`;
  }).join('');
  const cats={};
  g.transactions.filter(t=>!t.deletedFlag).forEach(tx=>{const e=tx.emoji||'💰';cats[e]=(cats[e]||0)+tx.amount;});
  document.getElementById('analytics-content').innerHTML = `
    <div class="analytics-grid">
      <div class="card"><div class="section-title">Paid By</div><div class="bar-chart">${bars(id=>paid[id],maxP)}</div></div>
      <div class="card"><div class="section-title">Owes</div><div class="bar-chart">${bars(id=>owed[id],maxO)}</div></div>
    </div>
    <div class="card mt-16"><div class="section-title">Category Breakdown</div>
      <div class="balance-list mt-8">${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([e,a])=>
        `<div class="balance-row"><span style="font-size:20px">${e}</span>
         <span class="font-mono" style="font-weight:700">${Utils.fmt(a)}</span>
         <span class="badge badge-gray">${total?((a/total)*100).toFixed(1)+'%':'—'}</span></div>`
      ).join('')||'<div class="text-muted">No data yet</div>'}</div>
    </div>`;
}

