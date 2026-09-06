// ===== STATE MANAGEMENT =====
let appData = {
  revenue: 0,
  ticketsSold: 0,
  rounds: {
    r1: { name: 'Early Tickets', price: 10, limit: 100, sold: 0, active: true },
    r2: { name: 'Round 2', price: 15, limit: 200, sold: 0, active: true },
    r3: { name: 'Last Round', price: 20, limit: 300, sold: 0, active: true }
  },
  orders: []
};

async function loadData() {
  try {
    const res = await fetch('/api/get-data');
    if (res.ok) {
      appData = await res.json();
      
      // Ensure all orders have id, payment type and used count
      appData.orders = appData.orders.map(o => ({
        ...o,
        id: o.id || 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
        payment: o.payment || 'Online',
        used: o.used || 0
      }));
      
      renderDashboard();
    }
  } catch (error) {
    console.error('Failed to load data', error);
  }
}

async function saveSettingsToBackend() {
  try {
    await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settings', rounds: appData.rounds, events: appData.events })
    });
  } catch(e) { console.error(e); }
}

function saveState() {
  // localStorage.setItem('luccaAdminData', JSON.stringify(appData));
  saveSettingsToBackend();
  renderDashboard();
}

// ===== NAVIGATION =====
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    document.getElementById(target).classList.add('active');
    
    document.getElementById('page-title').textContent = btn.textContent.trim();
  });
});

// ===== IMAGE DROP ZONE =====
function compressAndSetImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1200;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('edit-event-image').value = dataUrl;
      const preview = document.getElementById('drop-zone-preview');
      preview.src = dataUrl;
      preview.style.display = 'block';
      document.getElementById('drop-zone-inner').style.display = 'none';
      document.getElementById('remove-cover-btn').style.display = 'inline-block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeCoverImage() {
  document.getElementById('edit-event-image').value = '';
  document.getElementById('drop-zone-preview').style.display = 'none';
  document.getElementById('drop-zone-preview').src = '';
  document.getElementById('drop-zone-inner').style.display = 'flex';
  document.getElementById('remove-cover-btn').style.display = 'none';
}

function initDropZone() {
  const zone = document.getElementById('image-drop-zone');
  const fileInput = document.getElementById('image-file-input');
  if (!zone || !fileInput) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    compressAndSetImage(e.dataTransfer.files[0]);
  });
  zone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'LABEL') fileInput.click();
  });
  fileInput.addEventListener('change', () => { compressAndSetImage(fileInput.files[0]); fileInput.value = ''; });
}

document.addEventListener('DOMContentLoaded', initDropZone);

// ===== EDITOR TOGGLE =====
function openEventEditor(eventName = '') {
  document.getElementById('event-editor').style.display = 'block';
  
  if(eventName) {
    document.getElementById('editor-event-title').textContent = 'Modifica Evento: ' + eventName;
    document.getElementById('edit-event-name').value = eventName;
    const ev = appData.events.find(e => e.name === eventName);
    if(ev) {
      document.getElementById('edit-event-date').value = ev.date;
      const img = ev.image || '';
      document.getElementById('edit-event-image').value = img;
      // Show preview if there's a saved image
      const preview = document.getElementById('drop-zone-preview');
      const inner = document.getElementById('drop-zone-inner');
      if(img) {
        preview.src = img; preview.style.display = 'block'; inner.style.display = 'none';
        document.getElementById('remove-cover-btn').style.display = 'inline-block';
      } else {
        preview.src = ''; preview.style.display = 'none'; inner.style.display = 'flex';
        document.getElementById('remove-cover-btn').style.display = 'none';
      }
    }
    document.getElementById('edit-event-original-name').value = eventName;
  } else {
    document.getElementById('editor-event-title').textContent = 'Nuovo Evento';
    document.getElementById('edit-event-name').value = '';
    document.getElementById('edit-event-date').value = '';
    document.getElementById('edit-event-image').value = '';
    document.getElementById('drop-zone-preview').style.display = 'none';
    document.getElementById('drop-zone-inner').style.display = 'flex';
    document.getElementById('remove-cover-btn').style.display = 'none';
    document.getElementById('edit-event-original-name').value = '';
  }

  // Load current values
  document.getElementById('price-r1').value = appData.rounds.r1.price;
  document.getElementById('limit-r1').value = appData.rounds.r1.limit;
  document.getElementById('toggle-r1').checked = appData.rounds.r1.active;
  
  document.getElementById('price-r2').value = appData.rounds.r2.price;
  document.getElementById('limit-r2').value = appData.rounds.r2.limit;
  document.getElementById('toggle-r2').checked = appData.rounds.r2.active;
  
  document.getElementById('price-r3').value = appData.rounds.r3.price;
  document.getElementById('limit-r3').value = appData.rounds.r3.limit;
  document.getElementById('toggle-r3').checked = appData.rounds.r3.active;
}

function closeEventEditor() {
  document.getElementById('event-editor').style.display = 'none';
}

function saveRounds() {
  appData.rounds.r1.price = parseInt(document.getElementById('price-r1').value);
  appData.rounds.r1.limit = parseInt(document.getElementById('limit-r1').value);
  appData.rounds.r1.active = document.getElementById('toggle-r1').checked;

  appData.rounds.r2.price = parseInt(document.getElementById('price-r2').value);
  appData.rounds.r2.limit = parseInt(document.getElementById('limit-r2').value);
  appData.rounds.r2.active = document.getElementById('toggle-r2').checked;

  appData.rounds.r3.price = parseInt(document.getElementById('price-r3').value);
  appData.rounds.r3.limit = parseInt(document.getElementById('limit-r3').value);
  appData.rounds.r3.active = document.getElementById('toggle-r3').checked;

  // Note: saveState() calls saveSettingsToBackend()
  saveState();
}

function saveEventDetails() {
  const newName = document.getElementById('edit-event-name').value.trim();
  const newDate = document.getElementById('edit-event-date').value.trim();
  const newImage = document.getElementById('edit-event-image').value.trim();
  const originalName = document.getElementById('edit-event-original-name').value;
  
  if (!newName || !newDate) {
    alert("Nome evento e data sono obbligatori.");
    return;
  }
  
  if (originalName) {
    const evIndex = appData.events.findIndex(e => e.name === originalName);
    if(evIndex !== -1) {
      appData.events[evIndex].name = newName;
      appData.events[evIndex].date = newDate;
      appData.events[evIndex].image = newImage;
    }
  } else {
    appData.events.push({
      name: newName,
      date: newDate,
      image: newImage,
      active: true
    });
  }
  
  // Save rounds data as well
  appData.rounds.r1.price = parseInt(document.getElementById('price-r1').value);
  appData.rounds.r1.limit = parseInt(document.getElementById('limit-r1').value);
  appData.rounds.r1.active = document.getElementById('toggle-r1').checked;
  appData.rounds.r2.price = parseInt(document.getElementById('price-r2').value);
  appData.rounds.r2.limit = parseInt(document.getElementById('limit-r2').value);
  appData.rounds.r2.active = document.getElementById('toggle-r2').checked;
  appData.rounds.r3.price = parseInt(document.getElementById('price-r3').value);
  appData.rounds.r3.limit = parseInt(document.getElementById('limit-r3').value);
  appData.rounds.r3.active = document.getElementById('toggle-r3').checked;

  saveState();
  
  showToast('Salvataggio effettuato con successo!');
  closeEventEditor();
  renderEvents();
}

function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `
    <svg class="toast-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function deleteEvent(index) {
  if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;
  
  appData.events.splice(index, 1);
  renderEvents();
  
  fetch('/api/save-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete-event', index })
  }).catch(e => console.error(e));
}

function renderEvents() {
  const tbodyEvents = document.getElementById('events-tbody');
  if (!tbodyEvents) return;
  tbodyEvents.innerHTML = '';
  
  if (!appData.events || appData.events.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align: center; color: #aaa; padding: 20px;">Nessun evento presente</td>`;
    tbodyEvents.appendChild(tr);
    return;
  }
  
  appData.events.forEach((ev, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${ev.name}</strong></td>
      <td>${ev.date}</td>
      <td><span class="badge ${ev.active ? 'badge-active' : ''}">${ev.active ? 'Attivo' : 'Inattivo'}</span></td>
      <td style="display: flex; gap: 5px;">
        <button class="btn btn-ghost btn-sm" onclick="openEventEditor('${ev.name}')">Modifica</button>
        <button class="btn btn-ghost btn-sm" style="color: #ff4444; border-color: #ff4444;" onclick="deleteEvent(${index})">Elimina</button>
      </td>
    `;
    tbodyEvents.appendChild(tr);
  });
}

// ===== RENDER DASHBOARD =====
function renderDashboard() {
  // Stats
  document.getElementById('dash-revenue').textContent = '€' + appData.revenue;
  document.getElementById('dash-tickets').textContent = appData.ticketsSold;
  
  const activeEventsCount = appData.events ? appData.events.filter(e => e.active).length : 0;
  const dashEventsEl = document.getElementById('dash-events');
  if (dashEventsEl) dashEventsEl.textContent = activeEventsCount;

  // Progress Bars
  const r1 = appData.rounds.r1;
  const p1 = (r1.sold / r1.limit) * 100;
  document.getElementById('prog-early').textContent = `${r1.sold} / ${r1.limit}`;
  document.getElementById('fill-early').style.width = `${Math.min(p1, 100)}%`;

  const r2 = appData.rounds.r2;
  const p2 = (r2.sold / r2.limit) * 100;
  document.getElementById('prog-round2').textContent = `${r2.sold} / ${r2.limit}`;
  document.getElementById('fill-round2').style.width = `${Math.min(p2, 100)}%`;

  const r3 = appData.rounds.r3;
  const p3 = (r3.sold / r3.limit) * 100;
  document.getElementById('prog-last').textContent = `${r3.sold} / ${r3.limit}`;
  document.getElementById('fill-last').style.width = `${Math.min(p3, 100)}%`;

  // Recent Orders Table
  const tbodyRecent = document.querySelector('#recent-orders-table tbody');
  tbodyRecent.innerHTML = '';
  appData.orders.slice(0, 3).forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.name}</strong><br/><span style="font-size:0.6rem;color:var(--text-muted)">${o.round}</span></td>
      <td>${o.qty}</td>
      <td style="color:var(--orange);font-weight:600">€${o.total}</td>
    `;
    tbodyRecent.appendChild(tr);
  });

  // All Orders Table
  const tbodyAll = document.querySelector('#all-orders-table tbody');
  tbodyAll.innerHTML = '';
  appData.orders.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:0.8rem;color:var(--text-muted)">${o.id}</td>
      <td>${o.date}</td>
      <td><strong>${o.name}</strong><br/><span style="font-size:0.7rem;color:var(--text-muted)">${o.email || '-'}</span></td>
      <td><strong>${o.event || '-'}</strong></td>
      <td><span class="badge ${o.payment === 'Contanti' ? 'badge-active' : ''}">${o.payment}</span></td>
      <td>${o.round}</td>
      <td>${o.qty}</td>
      <td>${o.used} / ${o.qty}</td>
      <td style="color:var(--orange);font-weight:600">€${o.total}</td>
    `;
    tbodyAll.appendChild(tr);
  });

  renderEvents();
  renderSubscribers();
  renderRefunds();
}

// Initial Render
loadData();
setInterval(loadData, 10000); // Auto refresh every 10s

// ===== MANUAL TICKET (CASSA) =====
function generateManualTicket() {
  const name = document.getElementById('manual-name').value.trim();
  const email = document.getElementById('manual-email').value.trim();
  const roundKey = document.getElementById('manual-round').value;
  const qty = parseInt(document.getElementById('manual-qty').value);

  if (!name || qty < 1) {
    alert("Inserisci un nome e una quantità valida.");
    return;
  }

  const round = appData.rounds[roundKey];
  const total = round.price * qty;

  const newOrder = {
    id: 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
    date: new Date().toLocaleDateString('it-IT'),
    name: name,
    email: email,
    event: 'Manuale',
    round: round.name,
    qty: qty,
    total: total,
    payment: 'Contanti',
    used: 0
  };

  appData.orders.unshift(newOrder);
  appData.revenue += total;
  appData.ticketsSold += qty;
  appData.rounds[roundKey].sold += qty;

  // Send to backend
  fetch('/api/save-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'manual', order: newOrder })
  }).then(res => res.json()).then(data => {
     if(data.success) {
       appData = data.data;
       renderDashboard();
     }
  }).catch(e => console.error(e));

  // Show QR
  document.getElementById('manual-qr-container').style.display = 'flex';
  document.getElementById('ticket-name-label').textContent = name;
  document.getElementById('ticket-round-label').textContent = round.name;
  document.getElementById('ticket-info-label').textContent = `${qty} INGRESS${qty > 1 ? 'I' : 'O'} - ORDINE: ${newOrder.id}`;

  document.getElementById('manual-qrcode').innerHTML = '';
  new QRCode(document.getElementById('manual-qrcode'), {
    text: newOrder.id,
    width: 130,
    height: 130,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  // Reset form
  document.getElementById('manual-name').value = '';
  document.getElementById('manual-email').value = '';
  document.getElementById('manual-qty').value = '1';
}

function downloadTicketPDF() {
  const element = document.getElementById('printable-ticket');
  const nameLabel = document.getElementById('ticket-name-label').textContent;
  
  const opt = {
    margin:       1,
    filename:     `LuccaGroove_Ticket_${nameLabel.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 4, useCORS: true, backgroundColor: '#000000' },
    jsPDF:        { unit: 'in', format: 'a5', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}

// ===== LISTA ISCRITTI =====
function renderSubscribers() {
  const tbody = document.getElementById('subscribers-tbody');
  const countEl = document.getElementById('sub-count');
  if (!tbody) return;
  
  const subs = appData.subscribers || [];
  if (countEl) countEl.textContent = subs.length;
  
  tbody.innerHTML = '';
  if (subs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px;">Nessun iscritto ancora</td></tr>';
    return;
  }
  subs.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.name}</strong></td>
      <td>${s.email}</td>
      <td>${s.phone || '-'}</td>
      <td>${s.date || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openNotifyModal() {
  const overlay = document.getElementById('notify-modal-overlay');
  overlay.style.display = 'flex';
  document.getElementById('notify-subject').value = '';
  document.getElementById('notify-message').value = '';
  document.getElementById('notify-status').style.display = 'none';
}

function closeNotifyModal() {
  document.getElementById('notify-modal-overlay').style.display = 'none';
}

async function sendNotifyAll() {
  const subject = document.getElementById('notify-subject').value.trim();
  const message = document.getElementById('notify-message').value.trim();
  const statusEl = document.getElementById('notify-status');
  
  if (!subject || !message) {
    statusEl.textContent = '⚠️ Oggetto e messaggio sono obbligatori.';
    statusEl.style.display = 'block';
    return;
  }
  
  statusEl.textContent = '⏳ Invio in corso...';
  statusEl.style.display = 'block';
  
  try {
    const res = await fetch('/api/notify-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message })
    });
    const data = await res.json();
    if (data.success) {
      statusEl.textContent = `✅ Email inviata a ${data.sent} iscritti!`;
    } else {
      statusEl.textContent = `❌ Errore: ${data.error}`;
    }
  } catch(e) {
    statusEl.textContent = '❌ Errore di connessione.';
  }
}

// ===== RIMBORSI =====
function renderRefunds() {
  const tbody = document.getElementById('refunds-tbody');
  if (!tbody) return;
  
  const refunds = appData.refundRequests || [];
  tbody.innerHTML = '';
  
  if (refunds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:20px;">Nessuna richiesta di rimborso</td></tr>';
    return;
  }
  
  const statusColors = { pending: '#FF6B00', approved: '#4CAF50', rejected: '#f44336' };
  const statusLabels = { pending: 'In Attesa', approved: 'Approvato', rejected: 'Rifiutato' };
  
  refunds.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:0.75rem;color:#888;">${r.id}</td>
      <td><strong>${r.orderId}</strong></td>
      <td>${r.name}</td>
      <td style="font-size:0.8rem;">${r.email}</td>
      <td style="font-size:0.85rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.reason}">${r.reason}</td>
      <td>${r.date}</td>
      <td><span style="color:${statusColors[r.status] || '#888'};font-weight:700;">${statusLabels[r.status] || r.status}</span></td>
      <td style="display:flex;gap:5px;">
        ${r.status === 'pending' ? `
          <button class="btn btn-ghost btn-sm" style="color:#4CAF50;border-color:#4CAF50;" onclick="handleRefund('${r.id}', 'approved')">✅ Approva</button>
          <button class="btn btn-ghost btn-sm" style="color:#f44336;border-color:#f44336;" onclick="handleRefund('${r.id}', 'rejected')">❌ Rifiuta</button>
        ` : '-'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function handleRefund(requestId, status) {
  const label = status === 'approved' ? 'approvare' : 'rifiutare';
  if (!confirm(`Sei sicuro di voler ${label} questa richiesta?`)) return;
  
  try {
    const res = await fetch('/api/refund-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', requestId, status })
    });
    const data = await res.json();
    if (data.success) {
      // Update locally
      const idx = appData.refundRequests.findIndex(r => r.id === requestId);
      if (idx !== -1) appData.refundRequests[idx].status = status;
      renderRefunds();
      alert(status === 'approved' ? '✅ Rimborso approvato! Email inviata al cliente.' : '❌ Rimborso rifiutato. Email inviata al cliente.');
    }
  } catch(e) {
    alert('Errore di connessione. Riprova.');
  }
}
