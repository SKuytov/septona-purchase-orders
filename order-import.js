"use strict";
// Read-only addon. Source IDs are encoded in code to survive the existing v1 draft importer.
(function () {
  function parseIds(value) {
    const parts = value.trim().split(/[\s,;|]+/).filter(Boolean);
    if (!parts.length) throw Error('Enter at least one PartPulse order ID.');
    if (parts.some(x => !/^#?[1-9]\d{0,9}$/.test(x))) throw Error('Use positive numeric IDs separated by commas, spaces or new lines.');
    const ids = [...new Set(parts.map(x => String(Number(x.replace('#', '')))))];
    if (ids.length > 20) throw Error('Load up to 20 unique IDs at a time.');
    return ids;
  }
  function source(code) {
    const match = /^PP#([1-9]\d*) \| (.*)$/s.exec(String(code));
    return match ? { id: match[1], part: match[2] } : null;
  }
  function itemFrom(order) {
    const id = String(order.id);
    if (!/^[1-9]\d*$/.test(id)) throw Error('Invalid returned order ID.');
    if (typeof order.item_description !== 'string' || !order.item_description.trim()) throw Error('Order #' + id + ' has no description.');
    const qty = Number(order.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw Error('Order #' + id + ' has an invalid quantity.');
    return { code: 'PP#' + id + ' | ' + (typeof order.part_number === 'string' ? order.part_number : ''), description: order.item_description, qty, unit: '', price: '' };
  }
  const core = { parseIds, source, itemFrom };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }
  if (document.getElementById('order-import-panel')) return;
  const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const panel = el('details'); panel.id = 'order-import-panel'; panel.open = true;
  panel.append(el('summary', 'Load items from PartPulse orders (read only)'));
  const label = el('label', 'PartPulse IDs — for example: 4010, 3969, 3993, 340');
  const idsInput = el('textarea'); idsInput.rows = 2; label.append(idsInput);
  const load = el('button', 'Load / preview orders'); load.type = 'button';
  const cancel = el('button', 'Cancel lookup'); cancel.type = 'button';
  const status = el('p', 'Log in to PartPulse on the same hostname first. No changes are saved to PartPulse.'); status.setAttribute('role', 'status');
  const preview = el('div');
  const modeLabel = el('label', 'How to add selected items');
  const mode = el('select');
  for (const [v,t] of [['append','Append; skip source IDs already in this draft'],['replace','Replace the current item list']]) { const o = el('option',t); o.value=v; mode.append(o); }
  modeLabel.append(mode);
  const supplierLabel = el('label'); const fillSupplier = el('input'); fillSupplier.type = 'checkbox'; fillSupplier.style.width = 'auto'; fillSupplier.style.display = 'inline';
  supplierLabel.append(fillSupplier, document.createTextNode(' Fill supplier from selected orders only if all identify the same supplier'));
  const apply = el('button', 'Add reviewed items to draft'); apply.type = 'button'; apply.disabled = true;
  panel.append(label, load, cancel, status, preview, modeLabel, supplierLabel, apply, el('p', 'Prices and units must be reviewed from the quotation. Requester information is shown here only, not copied to the PDF. Keep the PP#ID | prefix in item codes to preserve source references.'));
  document.querySelector('.editor').insertBefore(panel, document.querySelector('.editor details'));
  const style=el('style'); style.textContent='#order-import-panel button{margin:8px 4px 8px 0}#order-import-panel p{font-size:14px}#order-import-panel .review-row{padding:12px 0;border-bottom:1px solid var(--line)}#order-import-panel input[type=checkbox]{display:inline;width:auto;min-height:24px;margin-right:8px}@media print{#order-import-panel{display:none!important}}'; document.head.append(style);
  let generation=0, controller=null, staged=[], stagedToken='', stagedIds='', stagedState=null;
  function token() { try { return localStorage.getItem('authToken') || ''; } catch (_) { return ''; } }
  function invalidate(note) { generation++; if(controller)controller.abort(); staged=[]; stagedToken=''; stagedState=null; apply.disabled=true; preview.replaceChildren(); if(note)status.textContent=note; }
  async function get(path, auth, signal) {
    const response=await fetch(path,{method:'GET',headers:{Authorization:'Bearer '+auth,Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal});
    if(response.status===401)throw Error('Session expired. Log in to PartPulse again.');
    if(response.status===403)throw Error('Access denied by PartPulse.');
    if(response.status===404)throw Error('Order not found or inaccessible.');
    if(!response.ok)throw Error('PartPulse returned HTTP '+response.status+'.');
    const data=await response.json(); if(data.success!==true)throw Error('PartPulse did not return a successful response.'); return data;
  }
  async function loadOrders() {
    invalidate(); const run=generation;
    let ids; try{ids=parseIds(idsInput.value);}catch(e){status.textContent=e.message;return;}
    const auth=token(); if(!auth){status.textContent='Log in to PartPulse on this exact hostname, then retry.';return;}
    controller=new AbortController(); const active=controller;
    const timeout=setTimeout(()=>active.abort(),45000);
    const snapshot=JSON.stringify(state); const entered=idsInput.value;
    status.textContent='Reading orders. Existing draft is unchanged...';
    try {
      const user=await get('/api/auth/verify',auth,active.signal);
      if(!user.user||!['admin','procurement'].includes(user.user.role))throw Error('This import tool requires an admin or procurement login.');
      const found=[], failures=[];
      for(const id of ids){
        if(run!==generation)return;
        try{const data=await get('/api/orders/'+encodeURIComponent(id),auth,active.signal); if(!data.order||String(data.order.id)!==id)throw Error('Returned ID did not match requested ID.'); const item=itemFrom(data.order); found.push({order:data.order,item});}
        catch(e){if(active.signal.aborted)throw e;failures.push('#'+id+': '+e.message);}
      }
      if(run!==generation)return;
      if(token()!==auth||idsInput.value!==entered||JSON.stringify(state)!==snapshot)throw Error('Login, draft or IDs changed during lookup. Load a fresh preview.');
      stagedToken=auth; stagedIds=entered; stagedState=snapshot;
      for(const row of found){
        const box=el('div'); box.className='review-row'; const l=el('label'); const check=el('input'); check.type='checkbox'; check.checked=true;
        l.append(check,document.createTextNode('#'+row.order.id+' — '+row.item.description+' — Qty: '+row.item.qty)); box.append(l);
        box.append(el('p',['Requester: '+(row.order.requester_name||'not specified'),'Building: '+(row.order.building||'not specified'),'Cost centre: '+(row.order.cost_center_code||'not specified'),'Status: '+(row.order.status||'not specified'),'Supplier: '+(row.order.supplier_name||row.order.supplier||'not assigned')].join(' | ')));
        if(row.order.status==='Cancelled') {check.checked=false;box.append(el('p','Cancelled order: excluded by default. Check explicitly only after reviewing.'));}
        preview.append(box); staged.push({...row,check});
      }
      for(const failure of failures)preview.append(el('p',failure));
      fillSupplier.checked=!String(state.supplier||'').trim();
      apply.disabled=!staged.length;
      status.textContent=found.length+' of '+ids.length+' unique orders loaded. Review selected items; missing orders will not be added. Prices are deliberately blank.';
    }catch(e){if(run===generation){staged=[];preview.replaceChildren();apply.disabled=true;status.textContent=active.signal.aborted?'Lookup cancelled or timed out. The draft is unchanged.':e.message;}}
    finally{clearTimeout(timeout);}
  }
  load.addEventListener('click',loadOrders);
  cancel.addEventListener('click',()=>invalidate('Lookup cancelled. Draft unchanged.'));
  idsInput.addEventListener('input',()=>invalidate('IDs changed. Click Load / preview orders.'));
  apply.addEventListener('click',async()=>{
    const run=generation, auth=token();
    if(!staged.length||!auth||auth!==stagedToken||idsInput.value!==stagedIds||JSON.stringify(state)!==stagedState){invalidate('Draft, login or IDs changed. Load a fresh preview before adding items.');return;}
    const rows=staged.filter(x=>x.check.checked); if(!rows.length){status.textContent='Select at least one item.';return;}
    const replacing=mode.value==='replace';
    const existingIds=new Set(state.items.map(i=>source(i.code)?.id).filter(Boolean));
    const added=rows.filter(x=>replacing||!existingIds.has(String(x.order.id)));
    if(!added.length){status.textContent='All selected source IDs are already in this draft. No changes made.';return;}
    const base=replacing?[]:state.items.filter(i=>String(i.code||'').trim()||String(i.description||'').trim()||i.price!=='');
    if(base.length+added.length>200){status.textContent='The resulting draft would exceed 200 items.';return;}
    let supplier=null;
    apply.disabled=true;
    try {
      if(fillSupplier.checked){
        const suppliers=new Set(rows.map(x=>String(x.order.supplier_id||'')));
        if(suppliers.size!==1||suppliers.has(''))throw Error('Selected orders do not all identify one supplier. Uncheck supplier filling, choose the intended supplier manually, then retry.');
        controller=new AbortController(); const active=controller; const timeout=setTimeout(()=>active.abort(),15000);
        let data;try{data=await get('/api/suppliers',auth,active.signal);}finally{clearTimeout(timeout);}
        const id=[...suppliers][0]; supplier=Array.isArray(data.suppliers)?data.suppliers.find(s=>String(s.id)===id):null;
        if(!supplier||typeof supplier.name!=='string')throw Error('Assigned supplier is not available in the active supplier list. Uncheck supplier filling and select manually.');
      }
      if(run!==generation)return;
      if(token()!==auth||JSON.stringify(state)!==stagedState||idsInput.value!==stagedIds){invalidate('Draft or login changed. Load a fresh preview.');return;}
      if(!confirm((replacing?'REPLACE current items with ':'APPEND ')+added.length+' item(s)?'+(supplier?' Supplier details will be replaced with '+supplier.name+'.':' Supplier details will stay unchanged.')+' Prices will be blank for imported items. Document status will become DRAFT. Nothing will be saved to PartPulse.'))return;
      state.items=[...base,...added.map(x=>({...x.item}))];
      if(supplier){state.supplier=supplier.name;state.supplierAddress=typeof supplier.address==='string'?supplier.address:'';state.supplierContact=typeof supplier.contact_person==='string'?supplier.contact_person:'';state.supplierEmail=typeof supplier.email==='string'?supplier.email:'';}
      if(!String(state.order||'').trim()||state.order==='#')state.order=state.items.map(i=>source(i.code)?.id).filter(Boolean).map(id=>'#'+id).join(' / ');
      state.state='draft'; hydrate(); invalidate('Items added as DRAFT. Review units, approved quote prices, shipping, discount, VAT and delivery terms before issuing.');
    }catch(e){if(run===generation)status.textContent=e.name==='AbortError'?'Supplier lookup timed out. Retry or fill supplier manually.':e.message;}
    finally{if(run===generation)apply.disabled=!staged.length;}
  });
  // Decorate the rendered document; the editor and v1 JSON retain the source marker.
  if(typeof dict!=='undefined'){dict.en.id='Document reference';dict.bg.id='Референция на документа';}
  const referenceInput=document.querySelector('[data-key="order"]');
  if(referenceInput){referenceInput.parentElement.firstChild.textContent='Document reference (separate from source order IDs)';referenceInput.placeholder='Your reference, or auto-filled when blank';}
  const originalRender=render;
  render=function(){
    originalRender();
    const table=document.querySelector('#document table'); if(!table)return;
    const refs=state.items.map(i=>source(i.code)); if(!refs.some(Boolean))return;
    const bg=state.language==='bg';
    const head=el('th',bg?'Вътр. ID':'Internal ID');table.tHead.rows[0].prepend(head);
    [...table.tBodies[0].rows].forEach((tr,index)=>{const ref=refs[index];if(ref)tr.cells[0].textContent=ref.part;tr.prepend(el('td',ref?'#'+ref.id:'—'));});
    const note=el('p',(bg?'Включени вътрешни заявки: ':'Included PartPulse requests: ')+[...new Set(refs.filter(Boolean).map(r=>'#'+r.id))].join(', '));
    table.before(note);
  };
  for(const id of ['new','example','file']){const n=document.getElementById(id);if(n)n.addEventListener(id==='file'?'change':'click',()=>invalidate('Draft action detected. Load a fresh preview if needed.'));}
  window.addEventListener('storage',e=>{if(e.key==='authToken'||e.key===null)invalidate('Login changed. Load a fresh preview.');});
  window.addEventListener('pagehide',()=>invalidate());
  render();
})();
