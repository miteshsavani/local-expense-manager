/* ================================================================
   FIREBASE SERVICE
   ================================================================ */
const firebaseService = (() => {
  let _db = null, _auth = null;

  function init() {
    firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
    _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return { db: _db, auth: _auth };
  }

  const uRef  = uid     => _db.collection('users').doc(uid);
  const gRef  = (u,g)   => uRef(u).collection('groups').doc(g);
  const txRef = (u,g,t) => gRef(u,g).collection('transactions').doc(t);

  /* Auth */
  async function signIn(email, pw) { return _auth.signInWithEmailAndPassword(email, pw); }
  async function register(email, pw, name) {
    const c = await _auth.createUserWithEmailAndPassword(email, pw);
    await c.user.updateProfile({ displayName: name });
    await uRef(c.user.uid).set({ email, displayName: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return c;
  }
  async function signOut() { return _auth.signOut(); }
  function onAuthChange(cb) { return _auth.onAuthStateChanged(cb); }

  /* ---- INCREMENTAL PULL: only records updated after lastSyncAt ---- */
  async function pullChanges(uid, lastSyncAt) {
    const groupsRef = uRef(uid).collection('groups');
    let gQuery = lastSyncAt
      ? groupsRef.where('updatedAt', '>', new Date(lastSyncAt))
      : groupsRef.orderBy('createdAt', 'asc');

    const groupsSnap = await gQuery.get();
    const changedGroups = [];

    for (const gDoc of groupsSnap.docs) {
      const gData = gDoc.data();
      // Fetch transactions for this group updated after lastSyncAt
      let txQuery = gRef(uid, gDoc.id).collection('transactions');
      if (lastSyncAt) txQuery = txQuery.where('updatedAt', '>', new Date(lastSyncAt));
      const txSnap = await txQuery.get();
      const transactions = txSnap.docs.map(t => ({ ...t.data(), id: t.id }));
      changedGroups.push({ ...gData, id: gDoc.id, _changedTransactions: transactions });
    }

    // Also fetch ALL transactions for groups not yet known locally (first sync)
    const localIds = new Set(STATE.groups.map(g => g.id));
    const newGroupIds = changedGroups.filter(g => !localIds.has(g.id)).map(g => g.id);
    for (const gid of newGroupIds) {
      const idx = changedGroups.findIndex(g => g.id === gid);
      const fullTxSnap = await gRef(uid, gid).collection('transactions').get();
      changedGroups[idx]._changedTransactions = fullTxSnap.docs.map(t => ({ ...t.data(), id: t.id }));
    }

    return changedGroups;
  }

  /* ---- INCREMENTAL PUSH: only isDirty groups + transactions ---- */
  async function pushChanges(uid) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Push dirty groups
    const dirtyGroups = STATE.groups.filter(g => g.isDirty);
    if (dirtyGroups.length > 0) {
      const chunks = _chunk(dirtyGroups, 400);
      for (const chunk of chunks) {
        const b = _db.batch();
        chunk.forEach(g => {
          const { transactions, isDirty, ...meta } = g;
          b.set(gRef(uid, g.id), { ...meta, updatedAt: now }, { merge: true });
        });
        await b.commit();
      }
    }

    // Push dirty & deleted transactions per group
    for (const group of STATE.groups) {
      const dirtyTx = group.transactions.filter(tx => tx.isDirty || tx.deletedFlag);
      if (!dirtyTx.length) continue;

      const chunks = _chunk(dirtyTx, 400);
      for (const chunk of chunks) {
        const b = _db.batch();
        chunk.forEach(tx => {
          const ref = txRef(uid, group.id, tx.id);
          if (tx.deletedFlag) {
            b.delete(ref);
          } else {
            const { isDirty, ...txData } = tx;
            b.set(ref, { ...txData, updatedAt: now }, { merge: true });
          }
        });
        await b.commit();
      }
    }

    // Handle group deletions (groups marked deletedFlag)
    const deletedGroups = STATE.groups.filter(g => g.deletedFlag);
    for (const g of deletedGroups) {
      try {
        const txSnap = await gRef(uid, g.id).collection('transactions').get();
        if (!txSnap.empty) {
          const b = _db.batch(); txSnap.docs.forEach(d => b.delete(d.ref)); await b.commit();
        }
        await gRef(uid, g.id).delete();
      } catch(e) { console.warn('Delete group remote:', e); }
    }
  }

  /* Old full-sync helpers kept for first-time load fallback */
  async function pullAllData(uid) {
    const groupsSnap = await uRef(uid).collection('groups').orderBy('createdAt','asc').get();
    const groups = [];
    for (const gDoc of groupsSnap.docs) {
      const gData = gDoc.data();
      const txSnap = await gRef(uid, gDoc.id).collection('transactions').get();
      const transactions = txSnap.docs.map(t => ({ ...t.data(), id: t.id }));
      transactions.sort((a,b) => new Date(b.date||b.createdAt||0) - new Date(a.date||a.createdAt||0));
      groups.push({ ...gData, id: gDoc.id, transactions });
    }
    return groups;
  }

  function _chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i,i+size));
    return out;
  }

  return { init, signIn, register, signOut, onAuthChange, pullChanges, pushChanges, pullAllData };
})();

