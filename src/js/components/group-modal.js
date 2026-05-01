/* ================================================================
   CREATE / EDIT GROUP MODALS
   ================================================================ */
window.openCreateGroupModal = isResume => {
  if (!isResume) {
    window._members = [];
    if (STATE.user && !STATE.isGuest) {
      const ownerName = STATE.user.displayName || STATE.user.email?.split('@')[0] || 'Me';
      window._members.push({ id: STATE.user.uid, name: ownerName, parentId: null, uid: STATE.user.uid });
    }
    window._tempGrpName = '';
  }
  window._lastModal = 'create';
  openModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">Create New Group</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    <div class="form-group"><label>Group Name</label><input class="input" id="grp-name" placeholder="e.g. Goa Trip, Flatmates…" value="${Utils.esc(window._tempGrpName || '')}" autofocus></div>
    <div class="form-group">
      <label>Members</label>
      <div style="display:flex;gap:8px"><input class="input" id="mbr-input" placeholder="Member name" onkeydown="if(event.key==='Enter'){addChip('mbr-input','mbr-chips');event.preventDefault();}"><button class="btn btn-secondary" onclick="addChip('mbr-input','mbr-chips')">Add</button></div>
      <div id="mbr-chips" style="margin-top:8px"></div>
      <div class="info-text">Press Enter or click Add. Use "+ sub" to add sub-members.</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="_submitCreateGroup()">Create Group</button></div>
  </div>`);
  renderChips('mbr-chips');
}
window._submitCreateGroup=()=>{
  const name=document.getElementById('grp-name').value.trim();
  if(!name){showToast('Group name required','error');return;}
  const norm = memberManager.normalize(window._members||[]);
  if(!norm.filter(m=>!m.parentId).length){showToast('Add at least one member','error');return;}
  Groups.create(name,norm); closeModal(); renderDashboard(); showToast('Group created!','success');
};

window.openEditGroupModal = (id, isResume) => {
  const g=STATE.groups.find(g=>g.id===id); if(!g) return;
  if (!isResume) {
    window._editGroupId=id;
    window._members=memberManager.normalize(g.members);
    window._tempGrpName = g.name;
  }
  window._lastModal = 'edit';
  openModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">Edit Group</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    <div class="form-group"><label>Group Name</label><input class="input" id="grp-name-edit" value="${Utils.esc(window._tempGrpName)}" autofocus></div>
    <div class="form-group">
      <label>Members</label>
      <div style="display:flex;gap:8px"><input class="input" id="mbr-input" placeholder="Add member" onkeydown="if(event.key==='Enter'){addChip('mbr-input','mbr-chips');event.preventDefault();}"><button class="btn btn-secondary" onclick="addChip('mbr-input','mbr-chips')">Add</button></div>
      <div id="mbr-chips" style="margin-top:8px"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="_submitEditGroup()">Save</button></div>
  </div>`);
  renderChips('mbr-chips');
}
window._submitEditGroup=()=>{
  const name=document.getElementById('grp-name-edit').value.trim();
  if(!name){showToast('Name required','error');return;}
  Groups.update(window._editGroupId,{name,members:[...window._members]});
  closeModal(); renderDashboard(); showToast('Updated!','success');
};

window.confirmDeleteGroup = id => {
  const g=STATE.groups.find(g=>g.id===id); if(!g) return;
  const txCount = g.transactions.filter(t=>!t.deletedFlag).length;
  openConfirm('Delete Group',`Delete <span class="confirm-hl">"${Utils.esc(g.name)}"</span>? This removes all ${txCount} expenses and cannot be undone.`,
    ()=>{ Groups.delete(id); showToast('Group deleted','default'); });
}

