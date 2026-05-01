/* ================================================================
   MEMBER CHIP HELPERS (for simple string-based member input)
   ================================================================ */
window.renderChips = cid => {
  const el = document.getElementById(cid); if(!el) return;
  const members = memberManager.normalize(window._members||[]);
  
  const perms = {
    canAdd:    permissionManager.can('add_member'),
    canEdit:   permissionManager.can('edit_member'),
    canRemove: permissionManager.can('remove_member')
  };
  
  el.innerHTML = memberManager.renderTree(members, '_removeChip', perms);
}
window._removeChip = (id) => {
  window._members = memberManager.removeMember(memberManager.normalize(window._members||[]), id);
  renderChips('mbr-chips');
};
window.addChip = (inputId, cid) => {
  const inp = document.getElementById(inputId); const name = inp.value.trim();
  if(!name) return;
  const norm = memberManager.normalize(window._members||[]);
  if(norm.some(m => m.name === name)){showToast('Already added','warning');return;}
  window._members = memberManager.addMember(norm, name, null);
  inp.value=''; renderChips(cid); inp.focus();
}

window.closeAddSubMemberModal = () => {
  closeModal();
  if (window._lastModal === 'create') openCreateGroupModal(true);
  else if (window._lastModal === 'edit') openEditGroupModal(window._editGroupId, true);
  else if (window._lastModal === 'manage') openManageMembersModal(true);
}
window._addSubMember = (parentId) => {
  const name = document.getElementById('sub-name')?.value.trim();
  if(!name){showToast('Name required','error');return;}
  window._members = memberManager.addMember(memberManager.normalize(window._members||[]), name, parentId);
  const norm = memberManager.normalize(window._members||[]); // My Changes
  Groups.update(window._editGroupId,{members:norm}); // My Changes
  closeModal();
  renderChips('mbr-chips');
};

window.openEditMemberNameModal = id => {
  // Capture current form state if in Create/Edit modal
  if (window._lastModal === 'create') {
    window._tempGrpName = document.getElementById('grp-name')?.value || '';
  } else if (window._lastModal === 'edit') {
    window._tempGrpName = document.getElementById('grp-name-edit')?.value || '';
  }

  const norm = memberManager.normalize(window._members||[]);
  const m = norm.find(x => x.id === id);
  if (!m) return;
  
  openModal(`<div class="modal" style="max-width:360px">
    <div class="modal-header"><div class="modal-title">Edit Member Name</div><button class="btn btn-ghost btn-icon" onclick="closeAddSubMemberModal()">✕</button></div>
    <div class="form-group"><label>Member Name</label>
      <input class="input" id="edit-member-name" value="${Utils.esc(m.name)}" autofocus onkeydown="if(event.key==='Enter') _saveMemberName('${id}')">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeAddSubMemberModal()">Cancel</button>
      <button class="btn btn-primary" onclick="_saveMemberName('${id}')">Save Changes</button>
    </div>
  </div>`);
}
window._submitCreateGroup=()=>{
  const name=document.getElementById('grp-name').value.trim();
  if(!name){showToast('Group name required','error');return;}
  const norm = memberManager.normalize(window._members||[]);
  if(!norm.filter(m=>!m.parentId).length){showToast('Add at least one member','error');return;}
  Groups.create(name,norm); closeModal(); renderDashboard(); showToast('Group created!','success');
};

window._saveMemberName = (id) => {
  const name = document.getElementById('edit-member-name')?.value.trim();
  if(!name){showToast('Name required','error');return;}
  const norm = memberManager.normalize(window._members||[]);
  const m = norm.find(x => x.id === id);
  if (m) m.name = name;
  window._members = norm;
  closeAddSubMemberModal();
  renderChips('mbr-chips');
};

window.openAddSubMemberModal = (parentId, parentName) => {
  // Capture current form state if in Create/Edit modal
  if (window._lastModal === 'create') {
    window._tempGrpName = document.getElementById('grp-name')?.value || '';
  } else if (window._lastModal === 'edit') {
    window._tempGrpName = document.getElementById('grp-name-edit')?.value || '';
  }

  openModal(`<div class="modal" style="max-width:360px">
    <div class="modal-header"><div class="modal-title">Add Sub-Member</div><button class="btn btn-ghost btn-icon" onclick="closeAddSubMemberModal()">✕</button></div>
    <p class="text-sm text-muted" style="margin-bottom:14px">Adding a sub-member under <strong>${Utils.esc(parentName)}</strong>. Sub-members can be included in expense splits and their balances are aggregated under their parent.</p>
    <div class="form-group"><label>Sub-Member Name</label>
      <input class="input" id="sub-name" placeholder="e.g. Spouse, Child…" autofocus onkeydown="if(event.key==='Enter') _addSubMember('${parentId}')">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeAddSubMemberModal()">Cancel</button>
      <button class="btn btn-primary" onclick="_addSubMember('${parentId}')">Add Sub-Member</button>
    </div>
  </div>`);
}
window._addSubMember = (parentId) => {
  const name = document.getElementById('sub-name')?.value.trim();
  if(!name){showToast('Name required','error');return;}
  window._members = memberManager.addMember(memberManager.normalize(window._members||[]), name, parentId);
  closeAddSubMemberModal();
  renderChips('mbr-chips');
};

