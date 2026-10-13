// ===== REFERRAL TRACKING =====
const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get('ref');
if (refParam) {
  localStorage.setItem('promoter_ref', refParam.toUpperCase());
} else if (!localStorage.getItem('promoter_ref')) {
  localStorage.setItem('promoter_ref', 'LUCCA GROOVE IG');
}

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
  r1: { name: 'Early Tickets', price: 10, limit: 100, sold: 0, active: true },
  r2: { name: 'Round 2', price: 15, limit: 200, sold: 0, active: true },
  r3: { name: 'Last Round', price: 20, limit: 300, sold: 0, active: true }
};

const DEFAULT_EVENTS = [
  { name: 'SUMMER OPENING', date: '21 Giugno 2025', active: true },
  { name: 'MID SUMMER', date: '19 Luglio 2025', active: true },
  { name: 'CLOSING PARTY', date: '30 Agosto 2025', active: true }
];

let cachedData = null;

// ===== ROUNDS MODAL =====
let currentEventName = '';

async function openRoundsModal(eventName) {
  // 1. OPEN MODAL INSTANTLY: 0ms delay for immediate user feedback
  const overlay = document.getElementById('rounds-modal-overlay');
  if (overlay) {
    overlay.classList.add('open');
  }
  document.body.style.overflow = 'hidden';

  // 2. Identify target event name
  if (!eventName) {
    if (cachedData && cachedData.events && cachedData.events.length > 0) {
      const activeEv = cachedData.events.find(e => e.active);
      eventName = activeEv ? activeEv.name : cachedData.events[0].name;
    } else {
      const firstCardBtn = document.querySelector('.event-btn[data-event-name]');
      if (firstCardBtn) {
        eventName = decodeURIComponent(firstCardBtn.getAttribute('data-event-name'));
      } else {
        eventName = DEFAULT_EVENTS[0].name;
      }
    }
  }

  currentEventName = eventName;
  const titleEl = document.getElementById('rounds-event-name');
  if (titleEl) titleEl.textContent = eventName;

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

    renderRound(rounds.r1, 'EARLY TICKETS');
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

function selectRoundAndCheckout(roundName, price) {
  currentRoundName = roundName;
  closeRoundsModal();
  openCheckoutModal(currentEventName + ' - ' + roundName, price);
}

// ===== CHECKOUT MODAL =====
let currentPrice = 10;

function openCheckoutModal(tier, price) {
  currentPrice = Number(price);
  const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
  const priceDisplay = currentPrice === 0 ? (isEn ? 'FREE' : 'GRATIS') : '€' + currentPrice;
  const nameEl = document.getElementById('modal-event-name');
  if (nameEl) nameEl.textContent = tier.toUpperCase();
  const totalEl = document.getElementById('modal-total');
  if (totalEl) totalEl.textContent = priceDisplay;
  const btnTotalText = document.getElementById('btn-total-text');
  if (btnTotalText) btnTotalText.textContent = priceDisplay;
  const qtyInput = document.getElementById('input-qty');
  if (qtyInput) qtyInput.value = 1;
  const successEl = document.getElementById('modal-success');
  if (successEl) successEl.style.display = 'none';
  const formEl = document.getElementById('checkout-form');
  if (formEl) formEl.style.display = 'block';
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('checkout-form').reset();
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
  const qty = 1; // Enforce single ticket
  
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
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'ATTENDERE...';
  submitBtn.disabled = true;

  const modalEventName = document.getElementById('modal-event-name').textContent;
  const eventName = currentEventName || (modalEventName.includes(' - ') ? modalEventName.split(' - ')[0] : '-');
  const roundName = currentRoundName || (modalEventName.includes(' - ') ? modalEventName.split(' - ').slice(1).join(' - ') : modalEventName || 'Ingresso');
  
  const promoterRef = localStorage.getItem('promoter_ref') || '';

  const bookingPayload = {
    name: nome + ' ' + cognome,
    email: email,
    phone: phone,
    gender: gender,
    event: eventName,
    round: roundName,
    promoter: promoterRef
  };

  try {
    const res = await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'book', email: email, order: bookingPayload })
    });
    
    const data = await res.json();
    if (!res.ok) {
      showBookingError(data.error || 'Errore durante la prenotazione.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    this.style.display = 'none';
    document.getElementById('modal-success').style.display = 'block';
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

  visibleEvents.forEach((ev, idx) => {
    const dateParts = (ev.date || '').split(' ');
    const day = dateParts[0] || '00';
    const month = (dateParts[1] || 'MESE').substring(0,3).toUpperCase();
    const year = dateParts[2] || new Date().getFullYear();
    const imgSrc = ev.image || images[idx % images.length];

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
        ${!ev.active ? '<div style="background:#ff4444;color:#fff;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold;margin-bottom:0.5rem;display:inline-block;">TEST EVENT (INATTIVO)</div>' : ''}
        <h3 class="event-title">LUCCA GROOVE<br /><span class="orange">${escapeHtml(ev.name)}</span></h3>
        <p class="event-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          LUCCA, ITALIA
        </p>
        <button class="btn btn-outline btn-full event-btn" data-event-name="${encodeURIComponent(ev.name)}">
          <span data-i18n="events.buyTicket">${buyBtnText}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
        </button>
      </div>
    `;

    // Direct event listener in JS eliminates all inline quote escaping issues!
    const buyBtn = card.querySelector('.event-btn');
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
             <p style="color: #aaa; font-family: 'Barlow', sans-serif; font-size: 1.1rem; max-width: 500px; margin: 0 auto;" data-i18n="events.comingSoonDesc">Stiamo preparando qualcosa di speciale. Resta sintonizzato per scoprire i prossimi eventi Lucca Groove.</p>
           </div>
         `;
         if (typeof applyTranslations === 'function') applyTranslations(typeof currentLang !== 'undefined' ? currentLang : 'it');
      }
      return;
    }

    renderEventCards(data.events && data.events.length > 0 ? data.events : DEFAULT_EVENTS);
  } catch (err) {
    console.warn('API error, checking localStorage or fallback events', err);
    let fallback = DEFAULT_EVENTS;
    try {
      const local = JSON.parse(localStorage.getItem('luccaAdminData') || '{}');
      if (local && local.events && local.events.length > 0) fallback = local.events;
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

    let targetEventName = '';
    if (cachedData && cachedData.events) {
      const activeEv = cachedData.events.find(ev => ev.active);
      if (activeEv) targetEventName = activeEv.name;
    }
    if (!targetEventName) {
      const firstBtn = document.querySelector('.event-btn[data-event-name]');
      if (firstBtn) {
        targetEventName = decodeURIComponent(firstBtn.getAttribute('data-event-name'));
      }
    }
    if (!targetEventName) {
      targetEventName = DEFAULT_EVENTS[0].name;
    }

    openRoundsModal(targetEventName);
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
