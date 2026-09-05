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

// ===== ROUNDS MODAL =====
let currentEventName = '';

async function openRoundsModal(eventName) {
  currentEventName = eventName;
  document.getElementById('rounds-event-name').textContent = eventName;
  
  const container = document.getElementById('rounds-list-container');
  if (container) {
    container.innerHTML = '<p style="text-align:center;color:#fff;font-size:0.9rem;margin:1rem 0;">Caricamento...</p>';
    
    try {
      const res = await fetch('/api/get-data');
      if(res.ok) {
        const data = await res.json();
        const rounds = data.rounds;
        
        container.innerHTML = '';
        
        const renderRound = (roundData, name) => {
          if (!roundData) return;
          
          if (!roundData.active) {
            container.innerHTML += `
              <div class="round-list-item" style="opacity:0.6; filter:grayscale(1);">
                <div class="round-list-info">
                  <span class="round-list-name">${name.toUpperCase()}</span>
                  <span class="round-list-price" style="color:var(--red);">CHIUSO</span>
                </div>
                <button class="btn btn-outline" disabled style="border-color:#555;color:#555;">CHIUSO</button>
              </div>
            `;
          } else {
            container.innerHTML += `
              <div class="round-list-item">
                <div class="round-list-info">
                  <span class="round-list-name">${name.toUpperCase()}</span>
                  <span class="round-list-price">€${roundData.price}</span>
                </div>
                <button class="btn btn-primary" onclick="selectRoundAndCheckout('${name.toUpperCase()}', ${roundData.price})">PRENOTA</button>
              </div>
            `;
          }
        };

        renderRound(rounds.r1, 'EARLY TICKETS');
        renderRound(rounds.r2, 'ROUND 2');
        renderRound(rounds.r3, 'LAST ROUND');
      }
    } catch(e) {
      container.innerHTML = '<p style="text-align:center;color:var(--red);font-size:0.9rem;">Errore nel caricamento.</p>';
    }
  }

  document.getElementById('rounds-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeRoundsModal() {
  document.getElementById('rounds-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function selectRoundAndCheckout(roundName, price) {
  closeRoundsModal();
  openCheckoutModal(currentEventName + ' - ' + roundName, price);
}

// ===== CHECKOUT MODAL =====
let currentPrice = 10;

function openCheckoutModal(tier, price) {
  currentPrice = price;
  document.getElementById('modal-event-name').textContent = tier.toUpperCase();
  document.getElementById('modal-total').textContent = '€' + price;
  const btnTotalText = document.getElementById('btn-total-text');
  if (btnTotalText) btnTotalText.textContent = '€' + price;
  document.getElementById('input-qty').value = 1;
  document.getElementById('modal-success').style.display = 'none';
  document.getElementById('checkout-form').style.display = 'block';
  document.getElementById('modal-overlay').classList.add('open');
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
  document.getElementById('modal-total').textContent = '€' + total;
  const btnTotalText = document.getElementById('btn-total-text');
  if (btnTotalText) btnTotalText.textContent = '€' + total;
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
  
  const submitBtn = this.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'ATTENDERE...';
  submitBtn.disabled = true;

  const roundName = document.getElementById('modal-event-name').textContent.split(' - ')[1] || document.getElementById('modal-event-name').textContent || 'Ingresso';
  
  const newOrder = {
    id: 'RES-' + Math.floor(Math.random() * 90000 + 10000),
    date: new Date().toLocaleDateString('it-IT'),
    name: nome + ' ' + cognome,
    email: email,
    gender: gender,
    round: roundName,
    qty: qty,
    total: qty * currentPrice,
    payment: 'Da Pagare',
    used: 0
  };

  try {
    const res = await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'book', email: email, order: newOrder })
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

// Fetch and render events dynamically on page load
async function loadEvents() {
  const track = document.getElementById('events-track');
  if (!track) return;
  
  try {
    const res = await fetch('/api/get-data');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    
    track.innerHTML = '';
    
    if (!data.events || data.events.length === 0) {
      track.style.justifyContent = 'center';
      track.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:1.2rem; padding: 3rem 0; margin: 0 auto; width: 100%;">Nessun evento in programma al momento.</p>';
      return;
    }
    
    track.style.justifyContent = 'flex-start'; // Reset for when events exist
    
    const images = ['crowd.png', 'hero-tower.png', 'event3.png'];
    
    data.events.forEach((ev, idx) => {
      if (!ev.active) return;
      
      const dateParts = ev.date.split(' ');
      const day = dateParts[0] || '00';
      const month = (dateParts[1] || 'MESE').substring(0,3).toUpperCase();
      const year = dateParts[2] || new Date().getFullYear();
      
      const imgSrc = ev.image || images[idx % images.length];
      
      const eventHtml = `
        <div class="event-card">
          <div class="event-img-wrap">
            <img src="${imgSrc}" alt="${ev.name}" class="event-img" onerror="this.src='crowd.png'"/>
            <div class="event-date-badge">
              <span class="date-day">${day}</span>
              <span class="date-month">${month}</span>
              <span class="date-year">${year}</span>
            </div>
          </div>
          <div class="event-content">
            <h3 class="event-title">LUCCA GROOVE<br /><span class="orange">${ev.name}</span></h3>
            <p class="event-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              LUCCA, ITALIA
            </p>
            <button class="btn btn-outline btn-full event-btn" onclick="openRoundsModal('${ev.name}')">
              ACQUISTA BIGLIETTO
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </button>
          </div>
        </div>
      `;
      track.insertAdjacentHTML('beforeend', eventHtml);
    });
    
  } catch (err) {
    console.error(err);
    track.innerHTML = '<p style="text-align:center; width:100%; color:var(--red); font-size:1.2rem; padding: 3rem;">Errore durante il caricamento degli eventi.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadEvents);
