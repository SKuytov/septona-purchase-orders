"use strict";
// Optional, same-origin addon. Only GET /api/suppliers is used.
(() => {
  const input = document.querySelector('[data-key="supplier"]');
  if (!input || document.getElementById('partpulse-lookup')) return;
  const panel = document.createElement('div');
  panel.id = 'partpulse-lookup';
  const info = document.createElement('p');
  info.setAttribute('role', 'status');
  info.style.fontSize = '14px';
  const login = document.createElement('a');
  login.textContent = 'Open PartPulse login';
  login.href = '/';
  login.target = '_blank';
  login.rel = 'noopener noreferrer';
  login.style.color = 'var(--accent)';
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.textContent = 'Retry supplier lookup';
  const results = document.createElement('div');
  results.setAttribute('role', 'group');
  results.setAttribute('aria-label', 'Matching PartPulse suppliers');
  panel.append(info, login, document.createTextNode(' '), refresh, results);
  input.closest('label').insertAdjacentElement('afterend', panel);
  const style = document.createElement('style');
  style.textContent = '#partpulse-lookup{margin:12px 0}#partpulse-lookup p{margin:8px 0}#partpulse-lookup button{margin:4px 0}#partpulse-lookup [role=group] button{display:block;width:100%;text-align:left;white-space:normal}@media print{#partpulse-lookup{display:none!important}}';
  document.head.append(style);
  let timer;
  let controller;
  let serial = 0;
  const text = value => typeof value === 'string' ? value : '';
  function token() {
    try { return localStorage.getItem('authToken') || ''; }
    catch (_) { return ''; }
  }
  function reset() {
    clearTimeout(timer);
    serial++;
    if (controller) controller.abort();
    results.replaceChildren();
  }
  function setField(key, value) {
    const field = document.querySelector('[data-key="' + key + '"]');
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function search() {
    reset();
    const requestId = serial;
    const query = input.value.trim();
    if (query.length < 2) {
      info.textContent = 'Type at least two characters. Supplier details remain manually editable.';
      return;
    }
    const auth = token();
    if (!auth) {
      info.textContent = 'Log in to PartPulse on this exact website address, then retry. Manual entry still works.';
      return;
    }
    info.textContent = 'Reading active suppliers from PartPulse...';
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + auth, Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal
      });
      if (requestId !== serial || query !== input.value.trim() || token() !== auth) return;
      if (response.status === 401) throw new Error('Session expired. Log in to PartPulse again, then retry.');
      if (response.status === 403) throw new Error('Access denied. Supplier lookup requires an admin or procurement account.');
      if (!response.ok) throw new Error('Supplier service is unavailable. Manual entry still works.');
      const data = await response.json();
      if (requestId !== serial || query !== input.value.trim() || token() !== auth) return;
      if (data.success !== true || !Array.isArray(data.suppliers)) throw new Error('Unexpected supplier response. Deploy this addon on the PartPulse website.');
      const needle = query.toLocaleLowerCase();
      const matches = data.suppliers.filter(s => s && (s.active === undefined || Number(s.active) === 1) && text(s.name).toLocaleLowerCase().includes(needle));
      info.textContent = matches.length ? 'Select a supplier to fill the form. Showing up to 10 matches; narrow your search if needed.' : 'No matching active supplier. You can enter all details manually.';
      for (const supplier of matches.slice(0, 10)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = [text(supplier.name), text(supplier.contact_person), text(supplier.email)].filter(Boolean).join(' | ');
        button.addEventListener('click', () => {
          if (requestId !== serial || token() !== auth || query !== input.value.trim()) {
            reset();
            info.textContent = 'The search or login changed. Retry lookup.';
            return;
          }
          const keys = ['supplierAddress', 'supplierContact', 'supplierEmail'];
          const existing = keys.some(key => document.querySelector('[data-key="' + key + '"]').value.trim());
          if (existing && !confirm('Replace the current supplier address, contact and email with this supplier record? Missing database values will be left blank. Changes affect only this draft, not PartPulse.')) return;
          reset();
          setField('supplier', text(supplier.name));
          setField('supplierAddress', text(supplier.address));
          setField('supplierContact', text(supplier.contact_person));
          setField('supplierEmail', text(supplier.email));
          clearTimeout(timer);
          info.textContent = 'Supplier copied into this draft. All fields remain editable. Nothing was saved to PartPulse.';
        });
        results.append(button);
      }
    } catch (error) {
      if (requestId !== serial) return;
      results.replaceChildren();
      info.textContent = error.name === 'AbortError' ? 'Supplier request timed out. Retry or enter details manually.' : (error instanceof SyntaxError ? 'No valid supplier API response. Check deployment on the PartPulse website.' : error.message);
    } finally {
      clearTimeout(timeout);
    }
  }
  input.addEventListener('input', () => {
    reset();
    info.textContent = 'Type at least two characters, then select a matching supplier.';
    timer = setTimeout(search, 300);
  });
  input.addEventListener('keydown', event => { if (event.key === 'Escape') reset(); });
  refresh.addEventListener('click', search);
  window.addEventListener('storage', event => {
    if (event.key === 'authToken' || event.key === null) {
      reset();
      info.textContent = 'PartPulse login changed. Retry lookup when ready.';
    }
  });
  for (const id of ['new', 'example', 'file']) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(id === 'file' ? 'change' : 'click', () => {
      reset();
      info.textContent = 'Type a supplier name or retry lookup. Manual entry remains available.';
    });
  }
  window.addEventListener('pagehide', reset);
  info.textContent = 'Optional read-only PartPulse lookup. Type at least two characters. Log in to PartPulse on the same website address first.';
})();
