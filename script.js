// ===== REFERRAL & VISIT TRACKING =====
const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get('ref') || urlParams.get('src');
const isQR = (refParam && refParam.toLowerCase() === 'qr') || urlParams.get('utm_source') === 'qr';

try {
  if (isQR) {
    localStorage.setItem('promoter_ref', 'QR CODE');
  } else if (refParam) {
    localStorage.setItem('promoter_ref', refParam.toUpperCase().trim());
  } else if (!localStorage.getItem('promoter_ref')) {
    localStorage.setItem('promoter_ref', 'LUCCA GROOVE IG');
  }
} catch (e) {
  // Gracefully handle private browsing or restricted storage
}

// Track visits deduplicated per session
(function trackAnalytics() {
  try {
    const hasVisited = sessionStorage.getItem('lg_visited_session');
    const hasTrackedQR = sessionStorage.getItem('lg_qr_tracked');

    // Count new session or freshly scanned QR
    const shouldTrackSession = !hasVisited;
    const shouldTrackQR = isQR && !hasTrackedQR;

    if (shouldTrackSession || shouldTrackQR) {
      if (shouldTrackSession) sessionStorage.setItem('lg_visited_session', '1');
      if (isQR) sessionStorage.setItem('lg_qr_tracked', '1');

      const payload = JSON.stringify({ isQR: Boolean(isQR) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track-visit', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    }
  } catch (e) {
    // Fail silently
  }
})();

// ===== NAV =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.background = window.scrollY > 50 ? 'rgba(0,0,0,0.97)' : 'rgba(0,0,0,0.85)';
});

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  if (a.id === 'nav-cta' || a.id === 'hero-cta' || a.classList.contains('mob-cta')) return;
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ===== SCROLL REVEAL =====
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; revealObs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.event-card, .ticket-mockup, .about-right').forEach(el => {
  el.style.opacity = '0'; el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  revealObs.observe(el);
});

// ===== EVENTS CAROUSEL SCROLL =====
const eventsGrid = document.querySelector('.events-grid');
const leftArrow = document.querySelector('.left-arrow');
const rightArrow = document.querySelector('.right-arrow');
if (eventsGrid && leftArrow && rightArrow) {
  leftArrow.addEventListener('click', () => {
    eventsGrid.scrollBy({ left: -340, behavior: 'smooth' });
  });
  rightArrow.addEventListener('click', () => {
    eventsGrid.scrollBy({ left: 340, behavior: 'smooth' });
  });
}

// ===== BARCODE ANIMATION =====
const bars = document.querySelector('.barcode-bars');
if (bars) { setInterval(() => { bars.style.opacity = bars.style.opacity === '0.6' ? '1' : '0.6'; }, 1200); }

// ===== UTILS =====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_ROUNDS = {
  r1: { name: 'Dinner and Party', price: 10, limit: 100, sold: 0, active: true },
  r2: { name: 'Round 2', price: 15, limit: 200, sold: 0, active: true },
  r3: { name: 'Last Round', price: 20, limit: 300, sold: 0, active: true }
};

const DEFAULT_EVENTS = [];

function isEventDatePast(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const str = dateStr.trim().toLowerCase();

  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const evDate = new Date(year, month, day, 23, 59, 59);
    return !isNaN(evDate.getTime()) && evDate.getTime() < Date.now();
  }

  const dmMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    const year = new Date().getFullYear();
    const evDate = new Date(year, month, day, 23, 59, 59);
    return !isNaN(evDate.getTime()) && evDate.getTime() < Date.now();
  }

  const monthsMap = {
    'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3, 'maggio': 4, 'giugno': 5,
    'luglio': 6, 'agosto': 7, 'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11,
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'gen': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mag': 4, 'giu': 5,
    'lug': 6, 'ago': 7, 'set': 8, 'ott': 9, 'nov': 10, 'dic': 11,
    'jan': 0, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'dec': 11
  };

  const parts = str.split(/\s+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const monthKey = parts[1].toLowerCase().replace(/[^a-z]/g, '');
    let year = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
    if (!isNaN(day) && monthsMap[monthKey] !== undefined && !isNaN(year)) {
      const evDate = new Date(year, monthsMap[monthKey], day, 23, 59, 59);
      return !isNaN(evDate.getTime()) && evDate.getTime() < Date.now();
    }
  }

  return false;
}

let cachedData = null;

// ===== ROUNDS MODAL =====
let currentEventName = '';

async function openRoundsModal(eventName) {
  // If coming soon is active, tickets cannot be purchased
  if (cachedData && cachedData.comingSoon) {
    const eventsSec = document.getElementById('events');
    if (eventsSec) eventsSec.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // 1. Identify target event name if not provided
  if (!eventName) {
    if (cachedData && Array.isArray(cachedData.events)) {
      const activeEv = cachedData.events.find(e => e.active && !isEventDatePast(e.date));
      if (activeEv) eventName = activeEv.name;
    }
    if (!eventName) {
      const firstCardBtn = document.querySelector('.event-btn[data-event-name]:not([disabled])');
      if (firstCardBtn) {
        eventName = decodeURIComponent(firstCardBtn.getAttribute('data-event-name'));
      }
    }
  }

  // If no active upcoming event found, do not open modal!
  if (!eventName) {
    const eventsSec = document.getElementById('events');
    if (eventsSec) eventsSec.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Check if requested event is inactive or past
  if (cachedData && Array.isArray(cachedData.events)) {
    const foundEv = cachedData.events.find(e => e.name.toLowerCase() === eventName.toLowerCase());
    if (foundEv && (!foundEv.active || isEventDatePast(foundEv.date))) {
      const isTestMode = window.location.search.includes('test=1');
      if (!isTestMode) {
        const eventsSec = document.getElementById('events');
        if (eventsSec) eventsSec.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
  }

  // 2. OPEN MODAL now that we verified an active event exists
  const overlay = document.getElementById('rounds-modal-overlay');
  if (overlay) {
    overlay.classList.add('open');
  }
  document.body.style.overflow = 'hidden';

  currentEventName = eventName;
  const titleEl = document.getElementById('rounds-event-name');
  if (titleEl) {
    let subInfo = eventName;
    const currentEv = (cachedData && cachedData.events) ? cachedData.events.find(e => e.name === eventName) : null;
    if (currentEv) {
      let locStr = '';
      if (currentEv.club && currentEv.location) locStr = `${currentEv.club} • ${currentEv.location}`;
      else if (currentEv.location) locStr = currentEv.location;
      else if (currentEv.club) locStr = currentEv.club;
      if (locStr) subInfo = `${eventName} • ${locStr}`;
    }
    titleEl.textContent = subInfo;
  }

  const container = document.getElementById('rounds-list-container');
  if (!container) return;

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');

  // Render helper function using safe DOM creation (avoids inline JS quote syntax errors)
  const renderRoundsList = (rounds) => {
    if (!rounds) return;
    container.innerHTML = '';
    
    const renderRound = (roundData, defaultName) => {
      if (!roundData) return;
      const roundTitle = (roundData.name || defaultName).toUpperCase();
      const isSoldOut = Number(roundData.sold || 0) >= Number(roundData.limit || 0);

      if (!roundData.active || isSoldOut) {
        const label = isSoldOut ? 'SOLD OUT' : (isEn ? 'CLOSED' : 'CHIUSO');
        const div = document.createElement('div');
        div.className = 'round-list-item';
        div.style.cssText = 'opacity:0.6; filter:grayscale(1);';
        div.innerHTML = `
          <div class="round-list-info">
            <span class="round-list-name">${escapeHtml(roundTitle)}</span>
            <span class="round-list-price" style="color:var(--red);">${label}</span>
          </div>
          <button class="btn btn-outline" disabled style="border-color:#555;color:#555;">${label}</button>
        `;
        container.appendChild(div);
      } else {
        const remaining = Math.max(0, Number(roundData.limit) - Number(roundData.sold || 0));
        const lowStock  = remaining > 0 && remaining <= 10;
        const isFree = Number(roundData.price) === 0;
        const priceTag = isFree ? `<span style="color:#4CAF50;font-weight:bold;">${isEn ? 'FREE' : 'GRATIS'}</span>` : `€${roundData.price}`;
        const remainingLabel = isEn ? `${remaining} left` : `${remaining} rimasti`;
        const bookBtnLabel = isEn ? 'BOOK' : 'PRENOTA';

        const div = document.createElement('div');
        div.className = 'round-list-item';
        div.innerHTML = `
          <div class="round-list-info">
            <span class="round-list-name">${escapeHtml(roundTitle)}</span>
            <span class="round-list-price">${priceTag}${lowStock ? ` <span style="color:#ff8800;font-size:0.75rem;">(${remainingLabel})</span>` : ''}</span>
          </div>
          <button class="btn btn-primary round-book-btn">${bookBtnLabel}</button>
        `;
        // Attach click listener safely in JS (no inline quoting bugs)
        const btn = div.querySelector('.round-book-btn');
        btn.addEventListener('click', () => {
          selectRoundAndCheckout(roundTitle, Number(roundData.price));
        });
        container.appendChild(div);
      }
    };

    renderRound(rounds.r1, 'DINNER AND PARTY');
    renderRound(rounds.r2, 'ROUND 2');
    renderRound(rounds.r3, 'LAST ROUND');
  };

  // Immediate render from cache or local data if available
  let initialRounds = (cachedData && cachedData.rounds) ? cachedData.rounds : null;
  if (!initialRounds) {
    try {
      const local = JSON.parse(localStorage.getItem('luccaAdminData') || '{}');
      if (local && local.rounds) initialRounds = local.rounds;
    } catch(e) {}
  }

  if (initialRounds) {
    renderRoundsList(initialRounds);
  } else {
    container.innerHTML = `<p style="text-align:center;color:#fff;font-size:0.9rem;margin:1rem 0;">${isEn ? 'Loading tickets...' : 'Caricamento...'}</p>`;
  }

  // Fetch fresh rounds asynchronously from API
  try {
    const res = await fetch('/api/get-data');
    if (res.ok) {
      const data = await res.json();
      cachedData = data;
      if (data.rounds) {
        renderRoundsList(data.rounds);
        return;
      }
    }
  } catch(e) {
    console.warn('Could not refresh rounds from API, using fallback data', e);
  }

  // If container is still empty or showing loading message, fallback to DEFAULT_ROUNDS
  if (!container.children.length || container.querySelector('p')) {
    renderRoundsList(DEFAULT_ROUNDS);
  }
}

function closeRoundsModal() {
  const overlay = document.getElementById('rounds-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

let currentRoundName = '';

function isGroupAllowedForRound(roundName) {
  if (!roundName) return false;
  const lower = roundName.toLowerCase();
  return lower.includes('lunch') || lower.includes('pranzo') || lower.includes('dinner') || lower.includes('cena');
}

function selectRoundAndCheckout(roundName, price) {
  currentRoundName = roundName;
  closeRoundsModal();
  openCheckoutModal(currentEventName + ' - ' + roundName, price);
}

// ===== CHECKOUT MODAL & GROUP BOOKING =====
let currentPrice = 10;
let isGroupBooking = false;
let groupSize = 2; // 2 to 8 people

function setBookingType(type) {
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const singleBtn = document.getElementById('btn-type-single');
  const groupBtn = document.getElementById('btn-type-group');
  const sizeBox = document.getElementById('group-size-container');
  const guestsBox = document.getElementById('group-guests-container');
  const titleEl = document.getElementById('checkout-section-main-title');

  if (type === 'group') {
    isGroupBooking = true;
    if (singleBtn) singleBtn.classList.remove('active');
    if (groupBtn) groupBtn.classList.add('active');
    if (sizeBox) sizeBox.style.display = 'block';
    if (guestsBox) guestsBox.style.display = 'block';
    if (titleEl) titleEl.textContent = isEn ? 'Group Leader (Main Contact)' : 'Capogruppo (Referente)';
    renderGuestInputs();
  } else {
    isGroupBooking = false;
    if (singleBtn) singleBtn.classList.add('active');
    if (groupBtn) groupBtn.classList.remove('active');
    if (sizeBox) sizeBox.style.display = 'none';
    if (guestsBox) guestsBox.style.display = 'none';
    if (titleEl) titleEl.textContent = isEn ? 'Your Details' : 'I Tuoi Dati';
  }
  updateModalTotalDisplay();
}

function adjustGroupSize(delta) {
  let newSize = groupSize + delta;
  if (newSize < 2) newSize = 2;
  if (newSize > 8) newSize = 8;
  groupSize = newSize;

  const displayEl = document.getElementById('group-size-display');
  if (displayEl) displayEl.textContent = groupSize;

  const minusBtn = document.getElementById('group-step-minus');
  const plusBtn = document.getElementById('group-step-plus');
  if (minusBtn) minusBtn.disabled = (groupSize <= 2);
  if (plusBtn) plusBtn.disabled = (groupSize >= 8);

  renderGuestInputs();
  updateModalTotalDisplay();
}

function renderGuestInputs() {
  const container = document.getElementById('group-guests-container');
  if (!container) return;

  // Preserve existing field values across stepper clicks
  const savedData = [];
  for (let i = 2; i <= 8; i++) {
    const nomeEl = document.getElementById(`input-guest-nome-${i}`);
    const cognomeEl = document.getElementById(`input-guest-cognome-${i}`);
    const emailEl = document.getElementById(`input-guest-email-${i}`);
    const genderRadio = document.querySelector(`input[name="guest-gender-${i}"]:checked`);
    if (nomeEl) {
      savedData[i] = {
        nome: nomeEl.value,
        cognome: cognomeEl ? cognomeEl.value : '',
        email: emailEl ? emailEl.value : '',
        gender: genderRadio ? genderRadio.value : ''
      };
    }
  }

  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  let html = '';

  for (let i = 2; i <= groupSize; i++) {
    const prev = savedData[i] || {};
    const guestLabel = isEn ? `Guest ${i}` : `Ospite ${i}`;
    html += `
      <div class="guest-card" id="guest-card-${i}">
        <div class="guest-card-header">
          <span class="guest-card-title">
            <span>👥</span> ${escapeHtml(guestLabel)}
          </span>
          <span style="font-size:0.75rem; color:#888;">#${i}</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>${isEn ? 'First Name *' : 'Nome *'}</label>
            <input type="text" id="input-guest-nome-${i}" value="${escapeHtml(prev.nome || '')}" placeholder="${isEn ? 'First Name' : 'Nome'}" required />
          </div>
          <div class="form-group">
            <label>${isEn ? 'Last Name *' : 'Cognome *'}</label>
            <input type="text" id="input-guest-cognome-${i}" value="${escapeHtml(prev.cognome || '')}" placeholder="${isEn ? 'Last Name' : 'Cognome'}" required />
          </div>
        </div>
        <div class="form-group">
          <label>Email * (${isEn ? 'receives personal ticket' : 'riceve biglietto personale'})</label>
          <input type="email" id="input-guest-email-${i}" value="${escapeHtml(prev.email || '')}" placeholder="ospite${i}@gmail.com" required />
        </div>
        <div class="form-group">
          <label>${isEn ? 'Gender *' : 'Sesso *'}</label>
          <div style="display:flex;gap:1rem;margin-top:0.3rem;">
            <label style="display:flex;align-items:center;gap:0.4rem;font-weight:normal;font-size:0.85rem;cursor:pointer;">
              <input type="radio" name="guest-gender-${i}" value="Male" ${prev.gender === 'Male' ? 'checked' : ''} required> ${isEn ? 'Male' : 'Uomo'}
            </label>
            <label style="display:flex;align-items:center;gap:0.4rem;font-weight:normal;font-size:0.85rem;cursor:pointer;">
              <input type="radio" name="guest-gender-${i}" value="Female" ${prev.gender === 'Female' ? 'checked' : ''} required> ${isEn ? 'Female' : 'Donna'}
            </label>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function updateModalTotalDisplay() {
  const count = isGroupBooking ? groupSize : 1;
  const total = currentPrice * count;
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  let totalStr = '';
  if (currentPrice === 0) {
    totalStr = isEn ? 'FREE' : 'GRATIS';
  } else {
    totalStr = isGroupBooking ? `€${total} (${count} × €${currentPrice})` : `€${total}`;
  }
  const totalEl = document.getElementById('modal-total');
  if (totalEl) totalEl.textContent = totalStr;
  const btnTotalText = document.getElementById('btn-total-text');
  if (btnTotalText) btnTotalText.textContent = totalStr;
}

function openCheckoutModal(tier, price) {
  currentPrice = Number(price);
  const nameEl = document.getElementById('modal-event-name');
  if (nameEl) nameEl.textContent = tier.toUpperCase();

  const successEl = document.getElementById('modal-success');
  if (successEl) successEl.style.display = 'none';
  const formEl = document.getElementById('checkout-form');
  if (formEl) formEl.style.display = 'block';

  // Check if Group Booking is allowed for this round (Dinner and Party)
  const isAllowed = isGroupAllowedForRound(currentRoundName || tier);
  const typeContainer = document.getElementById('booking-type-container');
  if (typeContainer) {
    typeContainer.style.display = isAllowed ? 'block' : 'none';
  }

  // Always reset to single booking on fresh open
  groupSize = 2;
  const displayEl = document.getElementById('group-size-display');
  if (displayEl) displayEl.textContent = groupSize;
  setBookingType('single');

  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('checkout-form').reset();
  setBookingType('single');
  hideBookingError();
}

function changeQty(delta) {
  const input = document.getElementById('input-qty');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 10) val = 10;
  input.value = val;
  const total = val * currentPrice;
  const totalDisplay = currentPrice === 0 ? 'GRATIS' : '€' + total;
  document.getElementById('modal-total').textContent = totalDisplay;
  const btnTotalText = document.getElementById('btn-total-text');
  if (btnTotalText) btnTotalText.textContent = totalDisplay;
}

// Form submit
document.getElementById('checkout-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nome = document.getElementById('input-nome').value.trim();
  const cognome = document.getElementById('input-cognome').value.trim();
  const email = document.getElementById('input-email').value.trim();
  const phone = document.getElementById('input-phone').value.trim();
  
  const genderRadio = document.querySelector('input[name="gender"]:checked');
  const gender = genderRadio ? genderRadio.value : '';

  if (!nome || !cognome || !email || !phone || !gender) {
    showBookingError('Compila tutti i campi obbligatori prima di procedere.');
    return;
  }

  const terms = document.getElementById('input-terms');
  if (terms && !terms.checked) {
    showBookingError('È necessario accettare i Termini e Condizioni e le informative per proseguire.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showBookingError('Inserisci un indirizzo email valido.');
    return;
  }

  if (phone.replace(/\D/g, '').length < 6) {
    showBookingError('Inserisci un numero di telefono valido.');
    return;
  }

  const modalEventName = document.getElementById('modal-event-name').textContent;
  const eventName = currentEventName || (modalEventName.includes(' - ') ? modalEventName.split(' - ')[0] : '-');
  const roundName = currentRoundName || (modalEventName.includes(' - ') ? modalEventName.split(' - ').slice(1).join(' - ') : modalEventName || 'Ingresso');
  let promoterRef = 'LUCCA GROOVE IG';
  try {
    promoterRef = (localStorage.getItem('promoter_ref') || '').trim() || 'LUCCA GROOVE IG';
  } catch (e) {
    promoterRef = 'LUCCA GROOVE IG';
  }

  let requestBody = {};

  if (isGroupBooking) {
    // Collect and validate all guests
    const guestList = [
      { name: nome + ' ' + cognome, email: email, phone: phone, gender: gender, isLeader: true }
    ];
    const seenEmails = new Set([email.toLowerCase()]);

    for (let i = 2; i <= groupSize; i++) {
      const gNome = (document.getElementById(`input-guest-nome-${i}`)?.value || '').trim();
      const gCognome = (document.getElementById(`input-guest-cognome-${i}`)?.value || '').trim();
      const gEmail = (document.getElementById(`input-guest-email-${i}`)?.value || '').trim().toLowerCase();
      const gGenderRadio = document.querySelector(`input[name="guest-gender-${i}"]:checked`);
      const gGender = gGenderRadio ? gGenderRadio.value : '';

      if (!gNome || !gCognome) {
        showBookingError(`Nome e cognome obbligatori per l'ospite ${i}.`);
        return;
      }
      if (!gEmail || !emailRegex.test(gEmail)) {
        showBookingError(`Inserisci un'email valida per l'ospite ${i}.`);
        return;
      }
      if (!gGender) {
        showBookingError(`Seleziona il sesso per l'ospite ${i}.`);
        return;
      }
      if (seenEmails.has(gEmail)) {
        showBookingError(`L'email ${gEmail} è stata inserita più di una volta. Ogni partecipante deve avere un'email diversa per ricevere il proprio biglietto.`);
        return;
      }
      seenEmails.add(gEmail);

      guestList.push({
        name: gNome + ' ' + gCognome,
        email: gEmail,
        phone: phone, // leader's contact phone as default
        gender: gGender,
        isLeader: false
      });
    }

    requestBody = {
      action: 'book',
      isGroup: true,
      event: eventName,
      round: roundName,
      promoter: promoterRef,
      guests: guestList
    };
  } else {
    // Single Booking
    const bookingPayload = {
      name: nome + ' ' + cognome,
      email: email,
      phone: phone,
      gender: gender,
      event: eventName,
      round: roundName,
      promoter: promoterRef
    };

    requestBody = {
      action: 'book',
      email: email,
      order: bookingPayload
    };
  }
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'ATTENDERE...';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await res.json();
    if (!res.ok) {
      showBookingError(data.error || 'Errore durante la prenotazione.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    this.style.display = 'none';
    const successEl = document.getElementById('modal-success');
    if (successEl) {
      const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
      const msgP = successEl.querySelector('p:not(.success-sub)');
      if (msgP && isGroupBooking) {
        msgP.innerHTML = isEn 
          ? `All <strong>${groupSize} tickets</strong> with individual QR Codes have been sent to each group member's email.<br />Show them at the door to pay and enter.<br />See you at Lucca Groove!`
          : `Tutti i <strong>${groupSize} biglietti</strong> con QR Code personali sono stati inviati all'email di ciascun partecipante del gruppo.<br />Mostrateli alla porta per pagare ed entrare.<br />Ci vediamo a Lucca Groove!`;
      } else if (msgP) {
        msgP.innerHTML = isEn
          ? 'Your booking code has been sent to your email. Show it at the door to pay and enter.<br />See you at Lucca Groove!'
          : 'Il tuo codice di prenotazione è stato inviato alla tua email. Mostralo alla porta per pagare ed entrare.<br />Ci vediamo a Lucca Groove!';
      }
      successEl.style.display = 'block';
    }
  } catch(err) {
    showBookingError('Errore di connessione. Riprova tra qualche secondo.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

function showBookingError(message) {
  const banner = document.getElementById('booking-error-banner');
  const text = document.getElementById('booking-error-text');
  if (!banner || !text) { alert(message); return; }
  text.textContent = message;
  banner.style.display = 'flex';
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideBookingError() {
  const banner = document.getElementById('booking-error-banner');
  if (banner) banner.style.display = 'none';
}

// Close on overlay click / ESC
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });
document.getElementById('rounds-modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('rounds-modal-overlay')) closeRoundsModal(); });

document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') {
    closeModal(); 
    closeRoundsModal();
  }
});

// Expose to HTML onclick
window.openCheckoutModal = openCheckoutModal;
window.closeModal = closeModal;
window.changeQty = changeQty;
window.openRoundsModal = openRoundsModal;
window.closeRoundsModal = closeRoundsModal;
window.selectRoundAndCheckout = selectRoundAndCheckout;
window.setBookingType = setBookingType;
window.adjustGroupSize = adjustGroupSize;

// Render event cards to #events-track safely
function renderEventCards(eventsList) {
  const track = document.getElementById('events-track');
  if (!track) return;
  track.innerHTML = '';
  track.style.justifyContent = 'flex-start';

  const isTestMode = window.location.search.includes('test=1');
  const visibleEvents = (eventsList || []).filter(ev => ev.active || isTestMode);

  if (visibleEvents.length === 0) {
    track.style.justifyContent = 'center';
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    track.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:1.2rem; padding: 3rem 0; margin: 0 auto; width: 100%;">${isEn ? 'No events scheduled at the moment.' : 'Nessun evento in programma al momento.'}</p>`;
    return;
  }

  const images = ['crowd.png', 'hero-tower.png', 'event3.png'];
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const buyBtnText = isEn ? 'BUY TICKET' : 'ACQUISTA BIGLIETTO';
  const endedText = isEn ? 'EVENT CONCLUDED' : 'EVENTO CONCLUSO';

  visibleEvents.forEach((ev, idx) => {
    const isPast = isEventDatePast(ev.date);
    const dateParts = (ev.date || '').split(' ');
    const day = dateParts[0] || '00';
    const month = (dateParts[1] || 'MESE').substring(0,3).toUpperCase();
    const year = dateParts[2] || new Date().getFullYear();
    const imgSrc = ev.image || images[idx % images.length];

    let locDisplay = 'LUCCA, ITALIA';
    if (ev.club && ev.location) {
      locDisplay = `${ev.club} • ${ev.location}`;
    } else if (ev.location) {
      locDisplay = ev.location;
    } else if (ev.club) {
      locDisplay = ev.club;
    }

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-img-wrap">
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(ev.name)}" class="event-img" onerror="this.src='crowd.png'"/>
        <div class="event-date-badge">
          <span class="date-day">${escapeHtml(day)}</span>
          <span class="date-month">${escapeHtml(month)}</span>
          <span class="date-year">${escapeHtml(year)}</span>
        </div>
      </div>
      <div class="event-content">
        ${!ev.active ? '<div style="background:#ff4444;color:#fff;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold;margin-bottom:0.5rem;display:inline-block;">TEST EVENT (INATTIVO)</div>' : (isPast ? `<div style="background:#444;color:#bbb;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold;margin-bottom:0.5rem;display:inline-block;">${endedText}</div>` : '')}
        <h3 class="event-title">LUCCA GROOVE<br /><span class="orange">${escapeHtml(ev.name)}</span></h3>
        <p class="event-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${escapeHtml(locDisplay.toUpperCase())}
        </p>
        ${isPast && !isTestMode ? `
          <button class="btn btn-outline btn-full event-btn" disabled style="opacity:0.6; cursor:not-allowed; border-color:#555; color:#888;">
            <span>${endedText}</span>
          </button>
        ` : `
          <button class="btn btn-outline btn-full event-btn" data-event-name="${encodeURIComponent(ev.name)}">
            <span data-i18n="events.buyTicket">${buyBtnText}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </button>
        `}
      </div>
    `;

    const buyBtn = card.querySelector('.event-btn:not([disabled])');
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openRoundsModal(ev.name);
      });
    }

    track.appendChild(card);
  });
}

// Fetch and render events dynamically on page load
async function loadEvents() {
  const track = document.getElementById('events-track');
  if (!track) return;
  
  try {
    const res = await fetch('/api/get-data');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    cachedData = data;
    
    if (data.comingSoon) {
      const eventsInner = document.querySelector('.events-inner');
      if (eventsInner) {
         eventsInner.innerHTML = `
           <h2 class="section-title center-title" data-i18n="events.title">VIVI IL PROSSIMO <span class="orange">GROOVE</span></h2>
           <div style="text-align:center; padding: 4rem 1rem; border: 1px solid rgba(255,107,0,0.3); border-radius: 12px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); margin-top: 3rem; margin-bottom: 3rem;">
             <h3 style="font-family: 'Barlow Condensed', sans-serif; font-size: 3rem; color: #fff; letter-spacing: 0.1em; margin-bottom: 1rem;">COMING SOON</h3>
             <p style="color: #aaa; font-family: 'Barlow', sans-serif; font-size: 1.1rem; max-width: 500px; margin: 0 auto;" data-i18n="events.comingSoonDesc">Stiamo preparando il prossimo evento speciale. Resta sintonizzato per scoprire i prossimi eventi Lucca Groove.</p>
           </div>
         `;
         if (typeof applyTranslations === 'function') applyTranslations(typeof currentLang !== 'undefined' ? currentLang : 'it');
      }
      return;
    }

    const eventsList = (data.events && Array.isArray(data.events)) ? data.events : [];
    renderEventCards(eventsList);
  } catch (err) {
    console.warn('API error, checking localStorage or fallback events', err);
    let fallback = [];
    try {
      const local = JSON.parse(localStorage.getItem('luccaAdminData') || '{}');
      if (local && Array.isArray(local.events)) fallback = local.events;
    } catch(e) {}
    renderEventCards(fallback);
  }
}

// Setup Buy Ticket buttons across navbar, hero, and mobile menu
function setupBuyTicketButtons() {
  const handleBuyTicketsClick = (e) => {
    if (e) e.preventDefault();

    const mobMenu = document.getElementById('mobile-menu');
    if (mobMenu && mobMenu.classList.contains('open')) {
      mobMenu.classList.remove('open');
    }

    const eventsSec = document.getElementById('events');
    if (eventsSec) {
      eventsSec.scrollIntoView({ behavior: 'smooth' });
    }

    // 1. If Coming Soon is active, DO NOT open tickets modal
    if (cachedData && cachedData.comingSoon) {
      return;
    }

    // 2. Find an active, upcoming event (not expired/past)
    let targetEventName = '';
    if (cachedData && Array.isArray(cachedData.events)) {
      const activeEv = cachedData.events.find(ev => ev.active && !isEventDatePast(ev.date));
      if (activeEv) targetEventName = activeEv.name;
    }

    // 3. Fallback to first active event button on page if available
    if (!targetEventName) {
      const firstBtn = document.querySelector('.event-btn[data-event-name]:not([disabled])');
      if (firstBtn) {
        targetEventName = decodeURIComponent(firstBtn.getAttribute('data-event-name'));
      }
    }

    // 4. ONLY open modal if a valid active upcoming event exists!
    if (targetEventName) {
      openRoundsModal(targetEventName);
    }
  };

  const navCta = document.getElementById('nav-cta');
  if (navCta) navCta.addEventListener('click', handleBuyTicketsClick);

  const heroCta = document.getElementById('hero-cta');
  if (heroCta) heroCta.addEventListener('click', handleBuyTicketsClick);

  document.querySelectorAll('.mob-cta').forEach(btn => {
    btn.addEventListener('click', handleBuyTicketsClick);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  setupBuyTicketButtons();
});

// ===== LUNCH MENU MODAL =====
function openLunchMenuModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  const mobMenu = document.getElementById('mobile-menu');
  if (mobMenu && mobMenu.classList.contains('open')) {
    mobMenu.classList.remove('open');
  }
  const overlay = document.getElementById('lunch-menu-modal-overlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLunchMenuModal() {
  const overlay = document.getElementById('lunch-menu-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  const checkoutModal = document.getElementById('modal-overlay');
  const roundsModal = document.getElementById('rounds-modal-overlay');
  const checkoutOpen = checkoutModal && checkoutModal.classList.contains('open');
  const roundsOpen = roundsModal && roundsModal.classList.contains('open');
  if (!checkoutOpen && !roundsOpen) {
    document.body.style.overflow = '';
  }
}

function filterMenuCat(cat, btn) {
  document.querySelectorAll('.menu-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const sections = document.querySelectorAll('.menu-cat-section');
  sections.forEach(sec => {
    if (cat === 'all' || sec.getAttribute('data-cat') === cat) {
      sec.style.display = 'block';
    } else {
      sec.style.display = 'none';
    }
  });
}

window.openLunchMenuModal = openLunchMenuModal;
window.closeLunchMenuModal = closeLunchMenuModal;
window.filterMenuCat = filterMenuCat;

// Close menu modal if clicking backdrop
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('lunch-menu-modal-overlay');
  if (overlay && e.target === overlay) {
    closeLunchMenuModal();
  }
});

