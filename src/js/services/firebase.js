/* ================================================================
   FIREBASE SERVICE
   ================================================================ */
window.firebaseService = (() => {
  let _db = null, _auth = null;

  function init() {
    firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
    _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return { db: _db, auth: _auth };
  }

  const uRef   = uid     => _db.collection('users').doc(uid);
  const gRef   = gid     => _db.collection('groups').doc(gid);
  const txRef  = (gid,t) => gRef(gid).collection('transactions').doc(t);
  const gmRef  = uid     => _db.collection('groupMembers').doc(uid);

  /* Auth */
  async function signIn(email, pw) { return _auth.signInWithEmailAndPassword(email, pw); }
  async function register(email, pw, name) {
    const c = await _auth.createUserWithEmailAndPassword(email, pw);
    await c.user.updateProfile({ displayName: name });
    // Refresh STATE.user to ensure displayName is available
    if (window.STATE) window.STATE.user = _auth.currentUser;
    await uRef(c.user.uid).set({ email, displayName: name, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return c;
  }
  async function signOut() { return _auth.signOut(); }
  function onAuthChange(cb) { return _auth.onAuthStateChanged(cb); }

  /* ---- REAL-TIME LISTENERS ---- */
  function listenToGroups(uid, cb) {
    return _db.collection('groups')
      .where('userIds', 'array-contains', uid)
      .onSnapshot(snap => {
        const groups = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        cb(groups);
      }, err => console.error('Groups listener error:', err));
  }

  function listenToTransactions(gid, cb) {
    return gRef(gid).collection('transactions')
      .onSnapshot(snap => {
        const txs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        cb(txs);
      }, err => console.error('Tx listener error:', err));
  }
  
  function listenToNotifications(uid, cb) {
    return _db.collection('notifications')
      .where('targetUserId', '==', uid)
      .where('isCleared', '==', false)
      .onSnapshot(snap => {
        const notifs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        // Manual sort by createdAt as fallback for missing index
        notifs.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        cb(notifs);
      }, err => console.error('Notifications listener error:', err));
  }

  async function joinGroup(uid, shareCode) {
    const snap = await _db.collection('groups').where('shareCode', '==', shareCode).limit(1).get();
    if (snap.empty) throw new Error('Invalid share code');
    
    const groupDoc = snap.docs[0];
    const groupData = groupDoc.data();
    
    if (groupData.userIds.includes(uid)) return groupDoc.id; // Already a member

    // Add user to userIds array and roles map
    await groupDoc.ref.update({
      userIds: firebase.firestore.FieldValue.arrayUnion(uid),
      [`roles.${uid}`]: 'member',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return groupDoc.id;
  }

  async function getTransaction(gid, tid) {
    const snap = await txRef(gid, tid).get();
    return snap.exists ? { ...snap.data(), id: snap.id } : null;
  }

  async function createNotifications(group, activityData) {
    const actorId = _auth.currentUser.uid;
    const actorName = _auth.currentUser.displayName || _auth.currentUser.email.split('@')[0];
    const b = _db.batch();
    
    // Notify all members including actor
    const membersToNotify = group.userIds || [];
    if (!membersToNotify.length) return;

    membersToNotify.forEach(uid => {
      const isActor = uid === actorId;
      const ref = _db.collection('notifications').doc();
      b.set(ref, {
        groupId: group.id,
        groupName: group.name,
        actorId,
        actorName,
        targetUserId: uid,
        ...activityData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isRead: isActor, // Already read for the person who did the action
        isCleared: false
      });
    });
    return b.commit();
  }

  async function updateNotification(id, data) {
    return _db.collection('notifications').doc(id).update(data);
  }

  async function clearAllNotifications(uid) {
    const snap = await _db.collection('notifications')
      .where('targetUserId', '==', uid)
      .where('isCleared', '==', false)
      .get();
    const b = _db.batch();
    snap.docs.forEach(d => b.update(d.ref, { isCleared: true }));
    return b.commit();
  }

  /* ---- INCREMENTAL PULL: (Kept as fallback for non-realtime parts if any) ---- */
  async function pullChanges(uid, lastSyncAt) {
    let q = _db.collection('groups').where('userIds', 'array-contains', uid);
    if (lastSyncAt) q = q.where('updatedAt', '>', new Date(lastSyncAt));

    const groupsSnap = await q.get();
    const changedGroups = [];

    for (const gDoc of groupsSnap.docs) {
      const gData = gDoc.data();
      let txQuery = gRef(gDoc.id).collection('transactions');
      if (lastSyncAt) txQuery = txQuery.where('updatedAt', '>', new Date(lastSyncAt));
      const txSnap = await txQuery.get();
      const transactions = txSnap.docs.map(t => ({ ...t.data(), id: t.id }));
      changedGroups.push({ ...gData, id: gDoc.id, _changedTransactions: transactions });
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
          // Ensure meta contains necessary fields for sharing
          if (!meta.ownerId) meta.ownerId = uid;
          if (!meta.userIds) meta.userIds = [uid];
          if (!meta.roles) meta.roles = { [uid]: 'owner' };
          if (!meta.shareCode) meta.shareCode = Utils.generateShareCode();
          
          b.set(gRef(g.id), { ...meta, updatedAt: now, updatedBy: uid }, { merge: true });
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
          const ref = txRef(group.id, tx.id);
          if (tx.deletedFlag) {
            b.delete(ref);
          } else {
            const { isDirty, ...txData } = tx;
            b.set(ref, { 
              ...txData, 
              updatedAt: now, 
              updatedBy: uid, 
              updatedByName: STATE.user?.displayName || STATE.user?.email?.split('@')[0] || 'Unknown' 
            }, { merge: true });
          }
        });
        await b.commit();
      }
    }

    // Handle group deletions (only if owner)
    const deletedGroups = STATE.groups.filter(g => g.deletedFlag);
    for (const g of deletedGroups) {
      if (g.roles?.[uid] !== 'owner') {
        console.warn('Only owner can delete group');
        continue;
      }
      try {
        const txSnap = await gRef(g.id).collection('transactions').get();
        if (!txSnap.empty) {
          const b = _db.batch(); txSnap.docs.forEach(d => b.delete(d.ref)); await b.commit();
        }
        await gRef(g.id).delete();
      } catch(e) { console.warn('Delete group remote:', e); }
    }
  }

  /* Old full-sync helpers kept for first-time load fallback */
  async function pullAllData(uid) {
    const groupsSnap = await _db.collection('groups').where('userIds', 'array-contains', uid).get();
    const groups = [];
    for (const gDoc of groupsSnap.docs) {
      const gData = gDoc.data();
      const txSnap = await gRef(gDoc.id).collection('transactions').get();
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

  return { init, signIn, register, signOut, onAuthChange, pullChanges, pushChanges, pullAllData, listenToGroups, listenToTransactions, joinGroup, listenToNotifications, createNotifications, updateNotification, clearAllNotifications, getTransaction };
})();

