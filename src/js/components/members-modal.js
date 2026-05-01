/* ================================================================
   MANAGE MEMBERS MODAL
   ================================================================ */
window.openManageMembersModal = isResume => {
  const g=Groups.active(); if(!g) return;
  if (!isResume) {
    window._editGroupId=g.id;
    window._members=memberManager.normalize(g.members);
  }
  window._lastModal = 'manage';
  const canAdd = permissionManager.can('add_member');
  const canRemove = permissionManager.can('remove_member');

  openModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">Manage Members</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    
    <div class="form-group" style="${canAdd ? '' : 'display:none'}">
      <label>Add Member</label>
      <div style="display:flex;gap:8px"><input class="input" id="mbr-input" placeholder="Member name" onkeydown="if(event.key==='Enter'){addChip('mbr-input','mbr-chips');event.preventDefault();}"><button class="btn btn-secondary" onclick="addChip('mbr-input','mbr-chips')">Add</button></div>
    </div>

    <div id="mbr-chips" style="margin-top:8px"></div>
    <div class="info-text mt-8">${(canAdd || canRemove) ? 'Use "+ sub" button to add sub-members under a member.' : 'Viewing current group members.'}</div>
    
    ${(g.userIds?.length > 1 && (g.ownerId === STATE.user?.uid || g.roles?.[STATE.user?.uid] === 'owner')) ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary btn-sm" onclick="openSharedMembersDetailModal()">🔍 View Shared Member Activity</button>
      </div>
    ` : ''}

    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      ${(canAdd || canRemove) ? `<button class="btn btn-primary" onclick="_submitMembers()">Save</button>` : ''}
    </div>
  </div>`);
  renderChips('mbr-chips');
}
window._submitMembers=()=>{
  const norm = memberManager.normalize(window._members||[]);
  if(!norm.filter(m=>!m.parentId).length){showToast('Need at least one main member','error');return;}
  Groups.update(window._editGroupId,{members:norm});
  closeModal(); renderGroup(); showToast('Members updated!','success');
};

