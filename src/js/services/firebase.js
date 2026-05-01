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
  const mRef   = (gid,uid) => gRef(gid).collection('members').doc(uid);

  const VIEWER_PERMS = {
    canAddExpense: false,
    canEditOwnExpense: false,
    canEditOthersExpense: false,
    canDeleteOwnExpense: false,
    canDeleteOthersExpense: false,
    canAddMembers: false,
    canRemoveMembers: false
  };

  const OWNER_PERMS = {
    canAddExpense: true,
    canEditOwnExpense: true,
    canEditOthersExpense: true,
    canDeleteOwnExpense: true,
    canDeleteOthersExpense: true,
    canAddMembers: true,
    canRemoveMembers: true
  };

  const DEFAULT_USER_LIMITS = {
    maxGroups: 3,
    maxTransactions: 100
  };

  const DEFAULT_USER_PERMS = {
    canShareGroups: true,
    canJoinGroups: true,
    canUseCloudSync: true,
    canUseExport: true,
    canUseReports: true
  };

  /* Auth */
  async function signIn(email, pw) { return _auth.signInWithEmailAndPassword(email, pw); }
  async function register(email, pw, name) {
    const c = await _auth.createUserWithEmailAndPassword(email, pw);
    await c.user.updateProfile({ displayName: name });
    
    const userDoc = {
      email,
      displayName: name,
      status: 'pending',
      role: 'user',
      limits: DEFAULT_USER_LIMITS,
      permissions: DEFAULT_USER_PERMS,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await uRef(c.user.uid).set(userDoc, { merge: true });
    if (window.STATE) window.STATE.user = _auth.currentUser;
    return c;
  }
  async function signOut() { return _auth.signOut(); }
  function onAuthChange(cb) { return _auth.onAuthStateChanged(cb); }

  /* Admin Actions */
  async function fetchUsersList() {
    const snap = await _db.collection('users').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), uid: d.id }));
  }

  async function updateUserAccess(targetUid, data) {
    // data should contain status, limits, permissions, role, etc.
    return _db.collection('users').doc(targetUid).update({
      ...data,
      approvedBy: _auth.currentUser.uid,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

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
  
  function listenToMemberPermissions(gid, uid, cb) {
    return mRef(gid, uid).onSnapshot(snap => {
      if (snap.exists) cb(snap.data());
      else cb(null);
    }, err => console.warn('Member permissions listener error (expected if new):', err));
  }

  async function joinGroup(uid, shareCode) {
    const snap = await _db.collection('groups').where('shareCode', '==', shareCode).limit(1).get();
    if (snap.empty) throw new Error('Invalid share code');
    
    const groupDoc = snap.docs[0];
    const groupData = groupDoc.data();
    
    if (groupData.userIds.includes(uid)) return { gid: groupDoc.id, isNew: false, groupData }; // Already a member

    // Add user to userIds array and roles map
    const b = _db.batch();
    b.update(groupDoc.ref, {
      userIds: firebase.firestore.FieldValue.arrayUnion(uid),
      [`roles.${uid}`]: 'viewer',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Set default viewer permissions
    b.set(mRef(groupDoc.id, uid), {
      role: 'viewer',
      permissions: VIEWER_PERMS,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await b.commit();
    return { gid: groupDoc.id, isNew: true, groupData };
  }

  async function updateGroupMembers(gid, members) {
    return _db.collection('groups').doc(gid).update({
      members: members,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function getTransaction(gid, tid) {
    const snap = await txRef(gid, tid).get();
    return snap.exists ? { ...snap.data(), id: snap.id } : null;
  }

  async function createNotifications(group, activityData, specificTargetUserId = null) {
    const actorId = _auth.currentUser.uid;
    const actorName = _auth.currentUser.displayName || _auth.currentUser.email.split('@')[0];
    const b = _db.batch();
    
    // Notify specified user OR all members
    const membersToNotify = specificTargetUserId ? [specificTargetUserId] : (group.userIds || []);
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
        isRead: isActor,
        isCleared: false
      });
    });
    return b.commit();
  }

  async function updatePresence(groupId) {
    if (!_auth.currentUser) return;
    const uid = _auth.currentUser.uid;
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return _db.collection('groups').doc(groupId).update({
      [`lastSeen.${uid}`]: now
    }).catch(e => console.warn('Presence update failed:', e));
  }

  async function getGroupMemberDetails(groupId) {
    const gDoc = await _db.collection('groups').doc(groupId).get();
    if (!gDoc.exists) return [];
    const userIds = gDoc.data().userIds || [];

    const details = [];
    const chunks = _chunk(userIds, 10);
    for (const chunk of chunks) {
      // Fetch user profiles
      const uSnap = await _db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
      const uMap = new Map(uSnap.docs.map(d => [d.id, d.data()]));
      
      // Fetch member role/permissions
      const mSnap = await gRef(groupId).collection('members').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
      const mMap = new Map(mSnap.docs.map(d => [d.id, d.data()]));

      chunk.forEach(uid => {
        const u = uMap.get(uid) || {};
        const m = mMap.get(uid) || {};
        details.push({
          uid,
          name: u.displayName || 'Unknown',
          email: u.email || 'N/A',
          role: m.role || 'viewer',
          permissions: m.permissions || VIEWER_PERMS,
          lastSeen: m.lastSeen || null
        });
      });
    }
    return details;
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

    // Handle Leaving Groups
    const leavingGroups = STATE.groups.filter(g => g.leftFlag);
    for (const g of leavingGroups) {
      try {
        await _db.collection('groups').doc(g.id).update({
          userIds: firebase.firestore.FieldValue.arrayRemove(uid),
          [`roles.${uid}`]: firebase.firestore.FieldValue.delete()
        });
        // Notify others
        await createNotifications(g, {
          type: 'member_left',
          message: `left the group`
        });
      } catch (e) {
        console.error('Leave group error:', e);
      }
      // Remove locally immediately after sync
      STATE.groups = STATE.groups.filter(item => item.id !== g.id);
    }

    // Push dirty groups
    const dirtyGroups = STATE.groups.filter(g => g.isDirty);
    if (dirtyGroups.length > 0) {
      const chunks = _chunk(dirtyGroups, 400);
      for (const chunk of chunks) {
        const b = _db.batch();
        chunk.forEach(g => {
          const { ...meta } = g;
          
          // Only initialize metadata if this is a NEW group
          if (!meta.ownerId || !meta.shareCode) {
            meta.ownerId = meta.ownerId || uid;
            meta.userIds = meta.userIds || [uid];
            meta.roles = meta.roles || { [uid]: 'owner' };
            if (!meta.shareCode) meta.shareCode = Utils.generateShareCode();
            
            // Initialize owner permissions in subcollection
            b.set(mRef(g.id, uid), {
              role: 'owner',
              permissions: OWNER_PERMS,
              joinedAt: now,
              updatedAt: now
            }, { merge: true });
          }
          
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
            const { ...txData } = tx;
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

  async function updateMemberPermissions(groupId, targetUid, role, permissions) {
    const b = _db.batch();
    
    b.update(mRef(groupId, targetUid), {
      role,
      permissions,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Also update role in group doc for legacy compatibility and easy listing
    b.update(gRef(groupId), {
      [`roles.${targetUid}`]: role,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await b.commit();

    // Notify user
    const group = STATE.groups.find(g => g.id === groupId);
    return createNotifications(group, {
      type: 'permission_change',
      message: `updated your permissions to ${role}`
    }, targetUid);
  }

  return { init, signIn, register, signOut, onAuthChange, pullChanges, pushChanges, pullAllData, listenToGroups, listenToTransactions, joinGroup, updateGroupMembers, listenToNotifications, createNotifications, updateNotification, clearAllNotifications, getTransaction, updatePresence, getGroupMemberDetails, listenToMemberPermissions, updateMemberPermissions, fetchUsersList, updateUserAccess };
})();
