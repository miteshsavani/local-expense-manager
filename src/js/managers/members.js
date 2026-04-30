/* ================================================================
   MEMBER MANAGER — sub-member support
   ================================================================ */
const memberManager = {
  /* Convert old string members array to new structured format */
  normalize(members) {
    return members.map(m => typeof m === 'string'
      ? { id: m, name: m, parentId: null }
      : { id: m.id || m.name, name: m.name, parentId: m.parentId || null }
    );
  },

  addMember(members, name, parentId = null) {
    const id = Utils.uid();
    return [...members, { id, name: name.trim(), parentId }];
  },

  removeMember(members, id) {
    // Also remove sub-members of this member
    return members.filter(m => m.id !== id && m.parentId !== id);
  },

  /* Render hierarchical member tree for modal */
  renderTree(members, onRemove) {
    const norm = this.normalize(members);
    const mains = norm.filter(m => !m.parentId);
    let html = '<div class="member-tree">';
    mains.forEach(m => {
      const subs = norm.filter(s => s.parentId === m.id);
      html += `<div class="member-tree-item" data-id="${m.id}">
        <div class="chip-avatar" style="background:${Utils.memberColor(m.name)}">${Utils.initials(m.name)}</div>
        <span class="member-name">${Utils.esc(m.name)}</span>
        <button class="btn btn-ghost btn-sm" onclick="openEditMemberNameModal('${m.id}')" style="padding:2px 6px;font-size:13px" title="Edit Name">✎</button>
        <button class="add-sub-btn" onclick="openAddSubMemberModal('${m.id}','${Utils.esc(m.name)}')" title="Add sub-member">+ sub</button>
        <button class="btn btn-ghost btn-sm" onclick="${onRemove}('${m.id}')" style="padding:2px 6px;font-size:13px" title="Remove">×</button>
      </div>`;
      subs.forEach(s => {
        html += `<div class="member-tree-item sub" data-id="${s.id}">
          <div class="chip-avatar" style="background:${Utils.memberColor(s.name)}">${Utils.initials(s.name)}</div>
          <span class="member-name">${Utils.esc(s.name)}</span>
          <span class="sub-badge">sub of ${Utils.esc(m.name)}</span>
          <button class="btn btn-ghost btn-sm" onclick="openEditMemberNameModal('${s.id}')" style="padding:2px 6px;font-size:13px" title="Edit Name">✎</button>
          <button class="btn btn-ghost btn-sm" onclick="${onRemove}('${s.id}')" style="padding:2px 6px;font-size:13px" title="Remove">×</button>
        </div>`;
      });
    });
    html += '</div>';
    return html;
  }
};

