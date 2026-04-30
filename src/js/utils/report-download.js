/* ================================================================
   REPORT DOWNLOAD
   ================================================================ */
window.downloadReport = () => {
  const g=Groups.active(); if(!g) return;
  const activeTx = g.transactions.filter(t=>!t.deletedFlag);
  const total=activeTx.reduce((s,t)=>s+t.amount,0);
  const balances=Utils.computeBalances(g);
  const settlements=Utils.computeSettlements(balances);
  const normM=memberManager.normalize(g.members);
  const getName=id=>normM.find(m=>m.id===id)?.name||id;
  const txRows=activeTx.map((tx,i)=>{
    const sp=Transactions.perPersonShare(tx);
    const spLabel=sp.type==='equal'?Utils.fmt(sp.amount)+'/person':'custom';
    return `<tr style="background:${i%2?'#faf9f7':'#fff'}"><td>${tx.emoji} ${tx.desc}</td><td style="text-align:right;font-weight:bold">₹${tx.amount.toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td>${getName(tx.paidBy)}</td><td>${tx.splitType||'equal'} (${spLabel})</td><td>${Utils.date(tx.date)}</td></tr>`;
  }).join('');
  const bRows=Object.entries(balances).map(([id,a])=>`<tr><td>${getName(id)}</td><td style="font-weight:bold;color:${a>=0?'#2d7a5e':'#c84b31'}">${a>=0?'+':''}₹${a.toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td>${a>0.009?'Gets Back':a<-0.009?'Owes':'Settled'}</td></tr>`).join('');
  const sRows=settlements.map(s=>`<tr><td>${getName(s.from)}</td><td>→</td><td>${getName(s.to)}</td><td style="font-weight:bold;color:#2d7a5e">₹${s.amount.toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${g.name} — SplitEase</title>
  <style>body{font-family:Georgia,serif;color:#1a1714;margin:40px;font-size:13px}h1{font-size:28px;color:#c84b31}h2{font-size:16px;margin:24px 0 10px;border-bottom:2px solid #c84b31;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#c84b31;color:#fff;padding:8px 12px;text-align:left}td{padding:8px 12px;border-bottom:1px solid #e8e4dc}.box{background:#fdf0ed;border:1px solid #f3c5bc;border-radius:8px;padding:16px 24px;margin:16px 0;display:inline-block}.val{font-size:28px;font-weight:bold;color:#c84b31}.tip{background:#eef4fb;border:1px solid #c7ddf7;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#2563a8}@media print{.tip{display:none}body{margin:20px}}</style>
  </head><body>
  <div class="tip">💡 Press <strong>Ctrl+P</strong> → set destination to <strong>"Save as PDF"</strong></div>
  <h1>SplitEase — ${g.name}</h1>
  <p style="color:#5c564e;font-size:12px">Generated ${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · ${normM.length} members · ${activeTx.length} transactions</p>
  <div class="box"><div style="font-size:11px;color:#5c564e;margin-bottom:4px">TOTAL SPENT</div><div class="val">₹${total.toLocaleString('en-IN',{minimumFractionDigits:2})}</div></div>
  <p><strong>Members:</strong> ${normM.map(m=>m.name+(m.parentId?' (sub)':'')).join(', ')}</p>
  <h2>Transactions</h2><table><thead><tr><th>Description</th><th>Amount</th><th>Paid By</th><th>Split</th><th>Date</th></tr></thead><tbody>${txRows}</tbody></table>
  <h2>Balances</h2><table><thead><tr><th>Member</th><th>Balance</th><th>Status</th></tr></thead><tbody>${bRows}</tbody></table>
  <h2>Settlement Plan</h2>${settlements.length?`<table><thead><tr><th>Payer</th><th></th><th>Receiver</th><th>Amount</th></tr></thead><tbody>${sRows}</tbody></table>`:'<p style="color:#2d7a5e;font-weight:bold">✅ All settled up!</p>'}
  </body></html>`;
  const a=Object.assign(document.createElement('a'),{
    href:URL.createObjectURL(new Blob([html],{type:'text/html'})),
    download:`splitease-${g.name.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.html`
  }); a.click(); showToast('Report downloaded — open in browser → Ctrl+P → Save as PDF','success',6000);
}

