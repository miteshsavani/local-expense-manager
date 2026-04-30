/* ================================================================
   ADD / EDIT TRANSACTION MODAL — multi-share + custom split
   ================================================================ */
let _splitMode = 'custom'; // 'equal' | 'custom' // I have hide the equal option
/* Feature #1: Track custom multipliers or manual specific amounts */
let _customManualState = {}; // Tracks manual amounts or multipliers

function openAddTransactionModal(editId){
  const g = Groups.active(); if(!g) return;
  const tx = editId ? g.transactions.find(t=>t.id===editId) : null;
  _splitMode = tx?.splitType || _splitMode;
  if (_splitMode === 'share') _splitMode = 'custom'; // Migrate old 'share' to 'custom'
  _customManualState = {}; // Reset manual flags on open

  // If editing a custom split, mark all existing custom amounts as manual
  if (tx && tx.splitType === 'custom' && tx.participants) {
    tx.participants.forEach(p => {
      if (p.customAmount > 0) _customManualState[p.memberId] = { type: 'fixed' };
    });
  }

  const normM = memberManager.normalize(g.members);
  const paidByOpts = normM.map(m =>
    `<option value="${Utils.esc(m.id)}" ${tx&&tx.paidBy===m.id?'selected':''}>${Utils.esc(m.name)}${m.parentId?' (sub)':''}</option>`
  ).join('');

  openModal(`<div class="modal" style="max-width:560px">
    <div class="modal-header"><div class="modal-title">${tx?'Edit':'Add'} Expense</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    <div class="form-group"><label>Description</label><input class="input" id="tx-desc" placeholder="e.g. Dinner, Cab…" value="${tx?Utils.esc(tx.desc):''}" autofocus></div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1"><label>Amount (₹)</label><input class="input" id="tx-amt" type="number" placeholder="0.00" min="0" step="0.01" value="${tx?tx.amount:''}" oninput="_refreshSplitPreview()"></div>
      <div class="form-group" style="flex:1"><label>Paid By</label><select class="select" id="tx-paidby">${paidByOpts}</select></div>
    </div>
    <div class="form-group">
      <!--
      <label>Split Mode</label>
      <div class="split-mode-tabs">
        <button class="split-mode-btn ${_splitMode==='equal'?'active':''}" onclick="_setSplitMode('equal')">⚖ Equal</button>
        <button class="split-mode-btn ${_splitMode==='custom'?'active':''}" onclick="_setSplitMode('custom')">✏ Custom ₹</button>
      </div>
      -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <label style="margin:0;font-size:11px;color:var(--text2);text-transform:none;letter-spacing:0">Participants</label>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="split-reset-btn" id="custom-reset-btn" onclick="_resetCustomSplit()" style="display:${_splitMode==='custom'?'inline-block':'none'}">↻ Reset Split</button>
          <button class="btn btn-ghost btn-sm" onclick="_toggleAllParticipants()">Toggle All</button>
        </div>
      </div>
      <div id="participants-container"></div>
      <div class="split-preview-box" id="split-preview">Select participants</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="_submitTx('${editId||''}')">${tx?'Save Changes':'Add Expense'}</button>
    </div>
  </div>`);

  _renderParticipants(tx);
  _refreshSplitPreview();
}

function _renderParticipants(tx) {
  const g = Groups.active(); if(!g) return;
  const container = document.getElementById('participants-container'); if(!container) return;
  //const normM = memberManager.normalize(g.members);
  const prevParts = tx?.participants || null;
  const prevSplit = tx?.splitBetween || [];

  // const mainSubMemebers = [];

  // const mainMembers = normM.filter(m => !m.parentId);
  // const subMembers = normM.filter(m => m.parentId);

  // mainMembers.forEach(mainMember => {
  //   const childMembers = subMembers.filter(m => m.parentId === mainMember.id);
  //   mainSubMemebers.push(mainMember);
  //   mainSubMemebers.push(...childMembers);
  // });



  container.innerHTML = Utils.getMainSubMembers(g).map(m => {
    let isChecked;
    if (prevParts) {
      isChecked = prevParts.some(p => p.memberId === m.id);
    } else {
      isChecked = !tx || prevSplit.includes(m.id) || prevSplit.includes(m.name);
    }
    const shareVal = prevParts?.find(p=>p.memberId===m.id)?.shareCount || 1;
    const customVal = prevParts?.find(p=>p.memberId===m.id)?.customAmount || '';
    const indent = m.parentId ? 'margin-left:24px;' : '';

    if (_splitMode === 'equal') {
      return `<div class="split-member-row" style="${indent}">
        <input type="checkbox" class="pchk" value="${Utils.esc(m.id)}" data-name="${Utils.esc(m.name)}" ${isChecked?'checked':''} onchange="_refreshSplitPreview()" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer">
        <div class="chip-avatar" style="background:${Utils.memberColor(m.name)};width:22px;height:22px;border-radius:50%;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${Utils.initials(m.name)}</div>
        <div class="split-member-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(m.name)}</div>
      </div>`;
    } else {
      // Feature #1: custom split with multipliers and fixed values tracking
      const state = _customManualState[m.id];
      const isManual = state !== undefined;
      const manualClass = isManual ? ' manual-edit' : '';
      const is0_5 = state?.type === 'multi' && state.value === 0.5;
      const is2_0 = state?.type === 'multi' && state.value === 2;
      const is1_0 = !isManual; // default is 1x for checked participants

      return `<div class="split-member-row" style="${indent}">
        <input type="checkbox" class="pchk" value="${Utils.esc(m.id)}" data-name="${Utils.esc(m.name)}" ${isChecked?'checked':''} onchange="_onCustomParticipantToggle(this)" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer">
        <div class="chip-avatar" style="background:${Utils.memberColor(m.name)};width:22px;height:22px;border-radius:50%;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${Utils.initials(m.name)}</div>
        <div class="split-member-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(m.name)}</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="share-btn ${is0_5?'active':''}" onclick="_setCustomMultiplier('${Utils.esc(m.id)}', 0.5)">0.5x</button>
          <button class="share-btn ${is1_0?'active':''}" onclick="_setCustomMultiplier('${Utils.esc(m.id)}', 1)">1x</button>
          <button class="share-btn ${is2_0?'active':''}" onclick="_setCustomMultiplier('${Utils.esc(m.id)}', 2)">2x</button>
          <input class="split-input-sm${manualClass}" type="number" min="0" step="0.01" value="${customVal}" placeholder="₹ amt" data-mid="${Utils.esc(m.id)}" oninput="_onCustomAmountInput(this)" style="width:72px">
        </div>
      </div>`;
    }
  }).join('');
}

window._setSplitMode = (mode) => {
  _splitMode = mode;
  _customManualState = {}; // Reset manual flags when switching modes
  document.querySelectorAll('.split-mode-btn').forEach((b,i) => {
    b.classList.toggle('active', ['equal','custom'][i] === mode);
  });
  // Show/hide reset button
  const resetBtn = document.getElementById('custom-reset-btn');
  if (resetBtn) resetBtn.style.display = mode === 'custom' ? 'inline-block' : 'none';
  const g = Groups.active();
  const editId = document.querySelector('[onclick^="_submitTx"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  const tx = editId ? g?.transactions.find(t=>t.id===editId) : null;
  _renderParticipants(tx);
  _refreshSplitPreview();
};

window._toggleAllParticipants = () => {
  const checks = [...document.querySelectorAll('.pchk')];
  const allChecked = checks.every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
  _refreshSplitPreview();
};

window._setCustomMultiplier = (mid, val) => {
  if (val === 1) {
    delete _customManualState[mid];
  } else {
    _customManualState[mid] = { type: 'multi', value: val };
  }
  _autoAdjustCustomSplit();
  _refreshSplitPreview();
};

window._onCustomAmountInput = (inputEl) => {
  const mid = inputEl.dataset.mid;
  _customManualState[mid] = { type: 'fixed' };
  _autoAdjustCustomSplit();
  _refreshSplitPreview();
};

window._onCustomParticipantToggle = () => {
  _autoAdjustCustomSplit();
  _refreshSplitPreview();
};

window._resetCustomSplit = () => {
  _customManualState = {};
  _autoAdjustCustomSplit();
  _refreshSplitPreview();
  showToast('Split reset to equal (1x)', 'info', 1500);
};

/* Feature #1: Auto-adjust non-manual custom amounts to fill remaining */
function _autoAdjustCustomSplit_old() {
  if (_splitMode !== 'custom') return;
  const amt = parseFloat(document.getElementById('tx-amt')?.value) || 0;
  const sel = [...document.querySelectorAll('.pchk')].filter(c => c.checked);
  const inputs = [...document.querySelectorAll('.split-input-sm')];
  const selIds = new Set(sel.map(c => c.value));
  
  let baseShare = sel.length > 0 ? amt / sel.length : 0;
  let manualTotal = 0;
  let autoInputs = [];


  // re-calcuate the baseShare.
  let actualShares = 0;
  let actualRemainingAmount = amt;

  inputs.forEach(inp => {
    const mid = inp.dataset.mid;
    if (!selIds.has(mid)) {
       return;
    }

    const state = _customManualState[mid];
    if (state && state.type === 'multi') {
      actualShares += state.value;
    } else if (state && state.type === 'fixed') {
      actualRemainingAmount -= (inp.value) || 0;
    } else {
      console.warn('==========>>>>> Not found', {inp, state});
    }
  });

  // Re adjust the baseShare
  baseShare = sel.length > 0 ? actualRemainingAmount / actualShares.length : 0;



  inputs.forEach(inp => {
    const mid = inp.dataset.mid;
    if (!selIds.has(mid)) {
       inp.value = '';
       inp.classList.remove('manual-edit');
       return;
    }
    
    const state = _customManualState[mid];
    if (state && state.type === 'multi') {
      const v = baseShare * state.value;
      inp.value = v.toFixed(2);
      manualTotal += v;
      inp.classList.add('manual-edit');
    } else if (state && state.type === 'fixed') {
      manualTotal += parseFloat(inp.value) || 0;
      inp.classList.add('manual-edit');
    } else {
      autoInputs.push(inp);
    }
    
    const row = inp.closest('.split-member-row');
    if (row) {
      const btns = row.querySelectorAll('.share-btn');
      if(btns.length >= 3) {
        btns[0].classList.toggle('active', state?.type === 'multi' && state.value === 0.5);
        btns[1].classList.toggle('active', !state);
        btns[2].classList.toggle('active', state?.type === 'multi' && state.value === 2);
      }
    }
  });

  const remaining = amt - manualTotal;
  if (autoInputs.length > 0) {
    const autoShare = Math.max(0, remaining / autoInputs.length);
    autoInputs.forEach(inp => {
      inp.value = autoShare.toFixed(2);
      inp.classList.remove('manual-edit');
    });
  }
}

function _autoAdjustCustomSplit() {
  if (_splitMode !== 'custom') return;

  const amt = parseFloat(document.getElementById('tx-amt')?.value) || 0;

  const selected = [...document.querySelectorAll('.pchk')]
    .filter(c => c.checked);

  const inputs = [...document.querySelectorAll('.split-input-sm')];

  const selectedIds = new Set(selected.map(c => c.value));

  let manualTotal = 0;
  let weightUsers = [];

  // STEP 1: CLASSIFY USERS
  inputs.forEach(inp => {
    const mid = inp.dataset.mid;

    if (!selectedIds.has(mid)) {
      inp.value = '';
      inp.classList.remove('manual-edit');
      return;
    }

    const state = _customManualState[mid];

    if (state && state.type === 'fixed') {
      const val = parseFloat(inp.value) || 0;
      manualTotal += val;
      inp.classList.add('manual-edit');

    } else {
      // weight-based user
      const weight = state?.type === 'multi' ? state.value : 1;
      weightUsers.push({ inp, mid, weight });
      inp.classList.remove('manual-edit');
    }

    // UI state update (buttons)
    const row = inp.closest('.split-member-row');
    if (row) {
      const btns = row.querySelectorAll('.share-btn');
      if (btns.length >= 3) {
        btns[0].classList.toggle('active', state?.type === 'multi' && state.value === 0.5);
        btns[1].classList.toggle('active', !state);
        btns[2].classList.toggle('active', state?.type === 'multi' && state.value === 2);
      }
    }
  });

  // STEP 2: CALCULATE REMAINING
  let remaining = amt - manualTotal;

  if (remaining < 0) remaining = 0;

  // STEP 3: CALCULATE TOTAL WEIGHT
  const totalWeight = weightUsers.reduce((sum, u) => sum + u.weight, 0);

  // STEP 4: DISTRIBUTE BASED ON WEIGHT
  weightUsers.forEach(u => {
    const value = totalWeight > 0
      ? (u.weight / totalWeight) * remaining
      : 0;

    u.inp.value = value.toFixed(2);
  });

  // STEP 5: OPTIONAL VALIDATION UI (GOOD UX)
  const assigned = manualTotal + weightUsers.reduce((sum, u) => sum + (parseFloat(u.inp.value) || 0), 0);

  const statusEl = document.getElementById('split-status');
  if (statusEl) {
    if (Math.abs(assigned - amt) < 0.01) {
      statusEl.innerText = `Assigned ₹${assigned.toFixed(2)} of ₹${amt.toFixed(2)} ✓ balanced`;
      statusEl.className = 'balanced';
    } else if (assigned > amt) {
      statusEl.innerText = `Over by ₹${(assigned - amt).toFixed(2)}`;
      statusEl.className = 'error';
    } else {
      statusEl.innerText = `Remaining ₹${(amt - assigned).toFixed(2)}`;
      statusEl.className = 'warning';
    }
  }
}

window._refreshSplitPreview = () => {
  const amt = parseFloat(document.getElementById('tx-amt')?.value) || 0;
  if (_splitMode === 'custom') _autoAdjustCustomSplit();

  const sel = [...document.querySelectorAll('.pchk')].filter(c => c.checked);
  const preview = document.getElementById('split-preview'); if(!preview) return;

  if (!sel.length) { preview.innerHTML = '<span class="split-warn">Select at least one participant</span>'; return; }

  if (_splitMode === 'equal') {
    const share = amt / sel.length;
    preview.innerHTML = `Splitting <strong>${Utils.fmt(amt)}</strong> equally → <strong>${Utils.fmt(share)}</strong> × ${sel.length} people`;
  } else {
    // Custom split preview with manual indicator
    const inputs = [...document.querySelectorAll('.split-input-sm')];
    const selIds = sel.map(c => c.value);
    let assigned = 0;
    let manualCount = 0;
    inputs.forEach(inp => {
      if(selIds.includes(inp.dataset.mid)) {
        assigned += parseFloat(inp.value)||0;
        if (_customManualState[inp.dataset.mid]) manualCount++;
      }
    });
    const diff = amt - assigned;
    const ok = Math.abs(diff) < 0.01;
    const manualInfo = manualCount > 0 ? ` · <span style="color:var(--blue);font-size:11px">${manualCount} manual edits</span>` : '';
    preview.innerHTML = `Assigned <strong>${Utils.fmt(assigned)}</strong> of <strong>${Utils.fmt(amt)}</strong> ${ok ? '<span class="split-ok">✓ balanced</span>' : `<span class="split-warn">${diff>0?'Remaining: '+Utils.fmt(diff):'Over by: '+Utils.fmt(-diff)}</span>`}${manualInfo}`;
  }
};

window._submitTx = (editId) => {
  const desc  = document.getElementById('tx-desc').value.trim();
  const amt   = parseFloat(document.getElementById('tx-amt').value);
  const paidBy = document.getElementById('tx-paidby').value;
  const selEls = [...document.querySelectorAll('.pchk')].filter(c => c.checked);
  const inputs = [...document.querySelectorAll('.split-input-sm')];

  if(!desc)        { showToast('Description required','error'); return; }
  if(!amt||amt<=0) { showToast('Enter a valid amount','error'); return; }
  if(!selEls.length){ showToast('Select at least one participant','error'); return; }

  let participants = [];
  if (_splitMode === 'equal') {
    participants = selEls.map(c => ({ memberId: c.value, shareCount: 1 }));
  } else {
    // custom
    const selIds = selEls.map(c => c.value);
    let total = 0;
    participants = selEls.map(c => {
      const inp = inputs.find(i => i.dataset.mid === c.value);
      const v = parseFloat(inp?.value)||0;
      total += v;
      return { memberId: c.value, customAmount: v };
    });
    if (Math.abs(total - amt) > 0.01) {
      showToast(`Custom amounts must sum to ${Utils.fmt(amt)}`, 'error'); return;
    }
  }

  // Backward compat: also set splitBetween
  const splitBetween = selEls.map(c => c.value);

  const g = Groups.active();
  const data = { desc, amount: amt, paidBy, splitType: _splitMode, participants, splitBetween };
  if (editId) {
    Transactions.update(g, editId, data); showToast('Expense updated!','success');
  } else {
    Transactions.add(g, data); showToast('Expense added!','success');
  }
  closeModal(); renderGroup();
};

function confirmDeleteTransaction(id){
  const g = Groups.active(); const tx = g?.transactions.find(t=>t.id===id); if(!tx) return;
  openConfirm('Delete Expense',`Delete <span class="confirm-hl">"${Utils.esc(tx.desc)}"</span> (${Utils.fmt(tx.amount)})? Cannot be undone.`,
    ()=>{ Transactions.delete(g,id); renderGroup(); showToast('Deleted','default'); });
}

