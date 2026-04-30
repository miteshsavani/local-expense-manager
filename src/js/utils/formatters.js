/* ================================================================
   UTILITIES
   ================================================================ */
 window.Utils = {
  uid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16));
  },
  fmt:      n   => '₹' + Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}),
  date:     iso => new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
  dateTime: iso => new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) + ' ' +
                   new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
  initials: n   => (n||'').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?',
  esc:      s   => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  escXML:   s   => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),

  emoji(d) {
    d=(d||'').toLowerCase();
    if(/food|meal|lunch|dinner|breakfast|pizza|burger|eat|snack|restaurant|cafe/i.test(d)) return '🍽️';
    if(/transport|uber|ola|cab|taxi|auto|fuel|petrol|bus|train|flight|travel/i.test(d))   return '🚗';
    if(/movie|film|cinema|ticket|show|concert|event/i.test(d))  return '🎬';
    if(/hotel|stay|rent|accommodation/i.test(d))                return '🏨';
    if(/shop|grocery|mart|store|buy|purchase/i.test(d))         return '🛍️';
    if(/electricity|water|bill|utility|internet|wifi/i.test(d)) return '⚡';
    if(/drink|beer|wine|alcohol|coffee|tea/i.test(d))           return '🍺';
    if(/gift|birthday|party|celebrat/i.test(d))                 return '🎁';
    if(/sport|gym|fitness|game/i.test(d))                       return '⚽';
    return '💰';
  },

  memberColor(name) {
    const p = ['#c84b31','#2d7a5e','#2563a8','#7c3aed','#c4860a','#0891b2','#be185d','#065f46','#9a3412','#1e40af'];
    let h=0; for(let i=0;i<(name||'').length;i++) h=(name||'').charCodeAt(i)+((h<<5)-h);
    return p[Math.abs(h)%p.length];
  },

  groupEmoji(name) {
    if(/trip|travel|tour|vacation|goa/i.test(name)) return '✈️';
    if(/home|house|flat|room|rent/i.test(name))     return '🏠';
    if(/office|work|team/i.test(name))              return '💼';
    if(/party|birthday|celebrat/i.test(name))       return '🎉';
    if(/food|meal|dinner|lunch/i.test(name))        return '🍽️';
    return '👥';
  },

  getMainSubMembers(group) {
    const normM = memberManager.normalize(group.members);
    const mainSubMembers = [];
    const mainMembers = normM.filter(m => !m.parentId);
    const subMembers = normM.filter(m => m.parentId);

    mainMembers.forEach(mainMember => {
      const childMembers = subMembers.filter(m => m.parentId === mainMember.id);
      mainSubMembers.push(mainMember);
      mainSubMembers.push(...childMembers);
    });

    return mainSubMembers;
  },

  /* Compute balances supporting participants[] (new) and splitBetween[] (legacy) */
  computeBalances(group) {
    const b = {};
    // Include main members and sub-members

    const allMembers = memberManager.normalize(group.members);

    Utils.getMainSubMembers(group).forEach(m => { b[m.id || m] = 0; });
    group.transactions.forEach(tx => {
      if (tx.deletedFlag) return;
      const paidBy = tx.paidBy;
      if (b[paidBy] !== undefined) b[paidBy] += tx.amount;

      if (tx.participants && tx.participants.length) {
        // New model: participants with shareCount or customAmount
        const total = tx.amount;
        if (tx.splitType === 'custom') {
          tx.participants.forEach(p => {
            if (b[p.memberId] !== undefined) {
              const findMember = allMembers.find(m => m.id === p.memberId);
              if (findMember) {
                  // consider a Parent member share if sub member is present
                  const memberId = findMember.parentId ? findMember.parentId : p.memberId;
                  b[memberId] -= (p.customAmount || 0);
              }
            }
          });
        } else if (tx.splitType === 'share') {
          const totalShares = tx.participants.reduce((s, p) => s + (p.shareCount || 1), 0);
          tx.participants.forEach(p => {
            const share = total * (p.shareCount || 1) / totalShares;
            if (b[p.memberId] !== undefined) {
              const findMember = allMembers.find(m => m.id === p.memberId);
              if (findMember) {
                  // consider a Parent member share if sub member is present
                  const memberId = findMember.parentId ? findMember.parentId : p.memberId;
                  b[memberId] -= share;
              }
            }
          });
        } else {
          // equal
          const share = total / tx.participants.length;
          tx.participants.forEach(p => {
            if (b[p.memberId] !== undefined) {
                const findMember = allMembers.find(m => m.id === p.memberId);
                if (findMember) {
                    // consider a Parent member share if sub member is present
                    const memberId = findMember.parentId ? findMember.parentId : p.memberId;
                    b[memberId] -= share;
                }
            }
          });
        }
      } else if (tx.splitBetween && tx.splitBetween.length) {
        // Legacy model
        const share = tx.amount / tx.splitBetween.length;
        tx.splitBetween.forEach(m => { if(b[m] !== undefined) b[m] -= share; });
      }
    });
    return b;
  },

  computeSettlements(balances) {
    const credits = [], debts = [];
    Object.entries(balances).forEach(([name,amt]) => {
      if (amt >  0.009) credits.push({name,amt});
      if (amt < -0.009) debts.push({name,amt:-amt});
    });
    credits.sort((a,b)=>b.amt-a.amt); debts.sort((a,b)=>b.amt-a.amt);
    const out=[]; let i=0,j=0;
    while(i<credits.length && j<debts.length){
      const min=Math.min(credits[i].amt,debts[j].amt);
      out.push({from:debts[j].name,to:credits[i].name,amount:min});
      credits[i].amt-=min; debts[j].amt-=min;
      if(credits[i].amt<0.009) i++;
      if(debts[j].amt <0.009) j++;
    }
    return out;
  },

  /* Member helpers — supports both string and {id,name,parentId} formats */
  memberName: (m) => m?.name || m,
  memberId:   (m) => m?.id   || m,
  memberIsMain: (m) => !m?.parentId,
  getSubMembers: (members, parentId) => members.filter(m => m?.parentId === parentId),
  getMainMembers: (members) => members.filter(m => !m?.parentId),
  normMembers(members) {
    // Normalize to {id, name, parentId} objects
    return members.map(m => typeof m === 'string' ? { id: m, name: m, parentId: null } : m);
  }
};

