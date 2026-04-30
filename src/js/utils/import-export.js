/* ================================================================
   IMPORT / EXPORT
   ================================================================ */
window.openImportExportModal = () => {
  const activeBtn = STATE.activeGroupId
    ? `<button class="btn btn-secondary" onclick="exportXML('active')">⬇ Current Group (XML)</button>
       <button class="btn btn-secondary" onclick="exportJSON('active')">⬇ Current Group (JSON)</button>` : '';
  openModal(`<div class="modal modal-wide">
    <div class="modal-header"><div class="modal-title">Import / Export</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
    <div class="card" style="background:var(--surface2);margin-bottom:16px">
      <div class="section-title">Export</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-primary" onclick="exportJSON('all')">⬇ All Groups (JSON)</button>
        <button class="btn btn-secondary" onclick="exportXML('all')">⬇ All Groups (XML)</button>
        ${activeBtn}
      </div>
    </div>
    <div class="card" style="background:var(--surface2)">
      <div class="section-title">Import</div>
      <p class="text-sm text-muted" style="margin-bottom:12px">Supports JSON and XML. Duplicates are skipped; data is merged.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="file" id="f-json" accept=".json" onchange="importJSON(event)" style="display:none">
        <input type="file" id="f-xml"  accept=".xml"  onchange="importXML(event)"  style="display:none">
        <button class="btn btn-primary"   onclick="document.getElementById('f-json').click()">📂 Import JSON</button>
        <button class="btn btn-secondary" onclick="document.getElementById('f-xml').click()">📂 Import XML</button>
      </div>
      <div id="import-status" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  </div>`);
}

window.exportJSON = (scope) => {
  const groups=(scope==='active'?[Groups.active()]:STATE.groups).filter(Boolean).filter(g=>!g.deletedFlag);
  if(!groups.length){showToast('No data to export','warning');return;}
  const a=Object.assign(document.createElement('a'),{
    href:URL.createObjectURL(new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),groups},null,2)],{type:'application/json'})),
    download:`splitease-${new Date().toISOString().slice(0,10)}.json`
  }); a.click(); showToast('JSON downloaded!','success');
}
window.importJSON = event => {
  const file=event.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!Array.isArray(data.groups)) throw new Error('Invalid JSON');
      let n=0;
      data.groups.forEach(g=>{
        if(!g.id||!g.name||!Array.isArray(g.members)) return;
        if(STATE.groups.find(x=>x.id===g.id)) return;
        // Normalize members
        g.members = memberManager.normalize(g.members);
        g.isDirty = true;
        STATE.groups.push(g); n++;
      });
      syncManager.onDataChanged(); renderDashboard();
      const el=document.getElementById('import-status');
      if(el) el.innerHTML=`<span style="color:var(--green);font-weight:600">✓ Imported ${n} group(s)</span>`;
      showToast(`Imported ${n} group(s)!`,'success');
    }catch(err){
      const el=document.getElementById('import-status');
      if(el) el.innerHTML=`<span style="color:var(--accent);font-weight:600">✕ ${Utils.esc(err.message)}</span>`;
      showToast('Import failed: '+err.message,'error');
    }
  };
  r.readAsText(file);
}
window.exportXML = scope =>{
  const groups=(scope==='active'?[Groups.active()]:STATE.groups).filter(Boolean).filter(g=>!g.deletedFlag);
  if(!groups.length){showToast('No data to export','warning');return;}
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<splitease>\n';
  groups.forEach(g=>{
    xml+=`  <group id="${g.id}" createdAt="${g.createdAt}" updatedAt="${g.updatedAt||''}">\n    <n>${Utils.escXML(g.name)}</n>\n    <members>\n`;
    memberManager.normalize(g.members).forEach(m=>xml+=`      <member id="${m.id}" parentId="${m.parentId||''}">${Utils.escXML(m.name)}</member>\n`);
    xml+=`    </members>\n    <transactions>\n`;
    g.transactions.filter(t=>!t.deletedFlag).forEach(tx=>{
      xml+=`      <transaction id="${tx.id}" date="${tx.date}" updatedAt="${tx.updatedAt}" splitType="${tx.splitType||'equal'}">\n`;
      xml+=`        <desc>${Utils.escXML(tx.desc)}</desc>\n        <amount>${tx.amount}</amount>\n`;
      xml+=`        <paidBy>${Utils.escXML(tx.paidBy)}</paidBy>\n        <emoji>${Utils.escXML(tx.emoji||'💰')}</emoji>\n`;
      if(tx.participants){
        xml+=`        <participants>${tx.participants.map(p=>`<p mid="${p.memberId}" sc="${p.shareCount||1}" ca="${p.customAmount||0}"/>`).join('')}</participants>\n`;
      }
      xml+=`      </transaction>\n`;
    });
    xml+=`    </transactions>\n  </group>\n`;
  });
  xml+='</splitease>';
  const a=Object.assign(document.createElement('a'),{
    href:URL.createObjectURL(new Blob([xml],{type:'application/xml'})),
    download:`splitease-${new Date().toISOString().slice(0,10)}.xml`
  }); a.click(); showToast('XML exported!','success');
};

window.importXML = (event) => {
  const file=event.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const doc=new DOMParser().parseFromString(e.target.result,'application/xml');
      if(doc.querySelector('parsererror')) throw new Error('Invalid XML');
      const gEls=doc.querySelectorAll('group'); if(!gEls.length) throw new Error('No groups found');
      let n=0;
      gEls.forEach(gEl=>{
        const id=gEl.getAttribute('id')||Utils.uid();
        if(STATE.groups.find(g=>g.id===id)) return;
        const name=gEl.querySelector('name')?.textContent||'Unnamed';
        const rawMembers=[...gEl.querySelectorAll('members > member')].map(m=>({
          id: m.getAttribute('id')||m.textContent,
          name: m.textContent,
          parentId: m.getAttribute('parentId')||null
        }));
        if(!rawMembers.length) return;
        STATE.groups.push({
          id, name, members: rawMembers, isDirty: true,
          createdAt:gEl.getAttribute('createdAt')||new Date().toISOString(),
          updatedAt:gEl.getAttribute('updatedAt')||new Date().toISOString(),
          transactions:[...gEl.querySelectorAll('transaction')].map(txEl=>{
            const pEls=[...txEl.querySelectorAll('participants > p')];
            return {
              id:txEl.getAttribute('id')||Utils.uid(),
              desc:txEl.querySelector('desc')?.textContent||'',
              amount:parseFloat(txEl.querySelector('amount')?.textContent||'0'),
              paidBy:txEl.querySelector('paidBy')?.textContent||'',
              emoji:txEl.querySelector('emoji')?.textContent||'💰',
              splitType:txEl.getAttribute('splitType')||'equal',
              participants:pEls.length?pEls.map(p=>({memberId:p.getAttribute('mid'),shareCount:parseFloat(p.getAttribute('sc')||'1'),customAmount:parseFloat(p.getAttribute('ca')||'0')})):null,
              splitBetween:[],
              date:txEl.getAttribute('date')||new Date().toISOString(),
              updatedAt:txEl.getAttribute('updatedAt')||new Date().toISOString(),
              isDirty:true, deletedFlag:false
            };
          })
        }); n++;
      });
      syncManager.onDataChanged(); renderDashboard();
      const el=document.getElementById('import-status');
      if(el) el.innerHTML=`<span style="color:var(--green);font-weight:600">✓ Imported ${n} group(s)</span>`;
      showToast(`Imported ${n} group(s)!`,'success');
    }catch(err){
      const el=document.getElementById('import-status');
      if(el) el.innerHTML=`<span style="color:var(--accent);font-weight:600">✕ ${Utils.esc(err.message)}</span>`;
      showToast('Import failed: '+err.message,'error');
    }
  };
  r.readAsText(file);
}

