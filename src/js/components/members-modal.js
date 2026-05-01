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

/* ================================================================
   LINK MEMBER MODAL (Shown on Join)
   ================================================================ */
window.openLinkMemberModal = (gid, groupData) => {
  const norm = memberManager.normalize(groupData.members || []);
  const unlinked = norm.filter(m => !m.uid && m.id !== groupData.ownerId);
  
  const optionsHtml = unlinked.map(m => `
    <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:var(--radius2);margin-bottom:8px;cursor:pointer;background:var(--surface2)">
      <input type="radio" name="link_member" value="${Utils.esc(m.id)}" style="accent-color:var(--accent)">
      <div class="chip-avatar" style="background:${Utils.memberColor(m.name)};width:28px;height:28px;font-size:12px">${Utils.initials(m.name)}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${Utils.esc(m.name)}</div>
        ${m.parentId ? `<div style="font-size:11px;color:var(--text3)">Sub-member</div>` : ''}
      </div>
    </label>
  `).join('');

  const addMeOption = `
    <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:var(--radius2);cursor:pointer;background:var(--surface2)">
      <input type="radio" name="link_member" value="new_member" ${unlinked.length === 0 ? 'checked' : ''} style="accent-color:var(--accent)">
      <div class="chip-avatar" style="background:var(--accent);width:28px;height:28px;font-size:12px;color:#fff;display:flex;align-items:center;justify-content:center">+</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">I'm not in this list</div>
        <div style="font-size:11px;color:var(--text3)">Add me as a new member</div>
      </div>
    </label>
  `;

  window._linkModalData = { gid, groupData };
  openModal(`<div class="modal" style="max-width:400px">
    <div class="modal-header"><div class="modal-title">Link Your Profile</div></div>
    <div style="margin-bottom:16px;font-size:14px;color:var(--text2)">
      Select your name from the existing members to link your account, or add yourself as a new member.
    </div>
    <div class="form-group" style="max-height:300px;overflow-y:auto;padding-right:4px">
      ${optionsHtml}
      ${addMeOption}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary btn-full" onclick="_submitLinkMember()">Continue</button>
    </div>
  </div>`);
};

window._submitLinkMember = async () => {
  const selected = document.querySelector('input[name="link_member"]:checked');
  if (!selected) {
    showToast('Please select an option', 'error');
    return;
  }
  
  const val = selected.value;
  const { gid, groupData } = window._linkModalData;
  const norm = memberManager.normalize(groupData.members || []);
  const myName = STATE.user.displayName || STATE.user.email?.split('@')[0] || 'Me';
  const myUid = STATE.user.uid;

  if (val === 'new_member') {
    norm.push({ id: myUid, name: myName, parentId: null, uid: myUid });
  } else {
    const m = norm.find(m => m.id === val);
    if (m) m.uid = myUid;
  }
  
  const localG = STATE.groups.find(g => g.id === gid);
  if (localG) localG.members = norm;
  
  await firebaseService.updateGroupMembers(gid, norm);
  
  closeModal();
  showToast('Profile linked!', 'success');
  showGroup(gid);
};
