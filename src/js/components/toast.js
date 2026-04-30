/* ================================================================
   TOAST NOTIFICATIONS
   ================================================================ */
window.showToast = (msg, type='default', ms=3200) => {
  const icons = {success:'✓',error:'✕',warning:'⚠',info:'ℹ',default:'·'};
  const el = Object.assign(document.createElement('div'), {
    className: `toast ${type}`,
    innerHTML: `<span>${icons[type]||'·'}</span><span>${Utils.esc(msg)}</span>`
  });
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, ms);
}

