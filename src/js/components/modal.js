/* ================================================================
   MODAL SYSTEM
   ================================================================ */
window.openModal = html => {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay">${html}</div>`;
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', _escKey);
}
window._escKey = e => { if(e.key==='Escape') closeModal(); }
window.closeModal = () => { document.getElementById('modal-root').innerHTML=''; document.removeEventListener('keydown',_escKey); }

window.openConfirm = (title, body, onConfirm) => {
  openModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">${Utils.esc(title)}</div></div>
    <p class="confirm-msg">${body}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="_doConfirm()">Delete</button>
    </div>
  </div>`);
  window._doConfirm = () => { closeModal(); onConfirm(); };
}

