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

function openRoundsModal(eventName) {
  currentEventName = eventName;
  document.getElementById('rounds-event-name').textContent = eventName;
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
document.getElementById('checkout-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const nome = document.getElementById('input-nome').value.trim();
  const cognome = document.getElementById('input-cognome').value.trim();
  const email = document.getElementById('input-email').value.trim();
  const phone = document.getElementById('input-phone').value.trim();
  const qty = 1; // Enforce single ticket
  
  const genderRadio = document.querySelector('input[name="gender"]:checked');
  const gender = genderRadio ? genderRadio.value : '';

  if (!nome || !cognome || !email || !phone || !gender) {
    alert('Per favore compila tutti i campi obbligatori.'); return;
  }
  
  // Save to Admin panel localStorage
  let adminData = JSON.parse(localStorage.getItem('luccaAdminData')) || {
    revenue: 2150, ticketsSold: 135, rounds: {}, orders: []
  };

  // Check if person already has a ticket
  const existingOrder = adminData.orders.find(o => o.email.toLowerCase() === email.toLowerCase());
  if (existingOrder) {
    alert('Hai già prenotato un biglietto con questa email. Ogni persona può ottenere solo un biglietto.');
    return;
  }
  
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
  
  adminData.orders.unshift(newOrder);
  // Add to tickets sold, but not to revenue (since they pay at door)
  adminData.ticketsSold += qty;
  
  if (adminData.rounds) {
    for (const key in adminData.rounds) {
       if (adminData.rounds[key].name === roundName) {
           adminData.rounds[key].sold += qty;
           break;
       }
    }
  }

  localStorage.setItem('luccaAdminData', JSON.stringify(adminData));

  this.style.display = 'none';
  document.getElementById('modal-success').style.display = 'block';
});

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
