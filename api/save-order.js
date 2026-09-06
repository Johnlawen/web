const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const defaultData = {
  revenue: 0,
  ticketsSold: 0,
  rounds: {
    r1: { name: 'Early Tickets', price: 10, limit: 100, sold: 0, active: true },
    r2: { name: 'Round 2', price: 15, limit: 200, sold: 0, active: true },
    r3: { name: 'Last Round', price: 20, limit: 300, sold: 0, active: true }
  },
  orders: [],
  events: [
    { name: 'SUMMER OPENING', date: '21 Giugno 2025', active: true },
    { name: 'MID SUMMER', date: '19 Luglio 2025', active: true },
    { name: 'CLOSING PARTY', date: '30 Agosto 2025', active: true }
  ]
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let data = await redis.get('luccaAdminData');
    if (!data) {
      data = defaultData;
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    const { email, order, action, index } = req.body;

    if (action === 'repair-stats') {
      // Recompute all counters from actual orders
      let revenue = 0;
      let ticketsSold = 0;
      
      // Reset round sold counts
      for (const key in data.rounds) {
        data.rounds[key].sold = 0;
      }
      
      (data.orders || []).forEach(o => {
        ticketsSold += (o.qty || 0);
        // Only count paid orders toward revenue
        const isPaid = o.payment === 'Pagato' || o.status === 'Pagato';
        if (isPaid) revenue += (o.total || 0);
        
        // If used>=1 but still marked Da Pagare, fix it (scanned before fix deployed)
        if ((o.used || 0) >= 1 && (o.payment === 'Da Pagare' || o.payment === 'To Pay' || o.payment === 'To Be Paid')) {
          o.payment = 'Pagato';
          o.status = 'Pagato';
          revenue += (o.total || 0);
        }
        
        // Update round sold (case-insensitive)
        for (const key in data.rounds) {
          if (data.rounds[key].name.toLowerCase() === (o.round || '').toLowerCase()) {
            data.rounds[key].sold += (o.qty || 0);
            break;
          }
        }
      });
      
      data.revenue = revenue;
      data.ticketsSold = ticketsSold;
      
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    if (action === 'reset-orders') {
      data.orders = [];
      data.pastOrders = [];
      data.archivedEvents = [];
      data.revenue = 0;
      data.ticketsSold = 0;
      
      // Reset rounds
      data.rounds.r1.sold = 0;
      data.rounds.r2.sold = 0;
      data.rounds.r3.sold = 0;

      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    if (!data.events) {
      data.events = defaultData.events;
    }

    // Delete Event
    if (action === 'delete-event') {
      data.events.splice(index, 1);
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    // Save Settings
    if (action === 'settings') {
      if (req.body.events) data.events = req.body.events;
      if (req.body.rounds) data.rounds = req.body.rounds;
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    // Archive Event
    if (action === 'archive-event') {
      const eventName = req.body.eventName;
      if (!data.archivedEvents) data.archivedEvents = [];
      if (!data.pastOrders) data.pastOrders = [];

      const evIndex = data.events.findIndex(e => e.name === eventName);
      if (evIndex === -1) return res.status(404).json({ error: 'Event not found' });
      
      const evDate = data.events[evIndex].date;

      // Extract orders for this event (case-insensitive)
      const eventOrders = data.orders.filter(o => (o.event || '').toLowerCase() === eventName.toLowerCase());
      const otherOrders = data.orders.filter(o => (o.event || '').toLowerCase() !== eventName.toLowerCase());

      // Calculate stats
      let evRevenue = 0;
      let evTickets = 0;
      eventOrders.forEach(o => {
        evRevenue += o.total || 0;
        evTickets += o.qty || 0;
        
        // Decrement round sold count
        for (const key in data.rounds) {
          if (data.rounds[key].name.toLowerCase() === (o.round || '').toLowerCase()) {
            data.rounds[key].sold = Math.max(0, (data.rounds[key].sold || 0) - (o.qty || 0));
            break;
          }
        }
      });

      // Update global counters (remove archived stats so dashboard only shows active)
      data.revenue = Math.max(0, data.revenue - evRevenue);
      data.ticketsSold = Math.max(0, data.ticketsSold - evTickets);

      // Save archive summary
      data.archivedEvents.unshift({
        name: eventName,
        date: evDate,
        ticketsSold: evTickets,
        revenue: evRevenue,
        orderCount: eventOrders.length
      });

      // Move orders to pastOrders and update active orders
      data.pastOrders.push(...eventOrders);
      data.orders = otherOrders;
      
      // Clear out refund requests for the archived event (keep only those matching active orders)
      if (data.refundRequests) {
        data.refundRequests = data.refundRequests.filter(req => 
          data.orders.some(o => o.id === req.orderId)
        );
      }
      
      // Remove from active events
      data.events.splice(evIndex, 1);

      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    // Scan Ticket
    if (action === 'scan') {
      const { orderId, eventName } = req.body;
      const orderIndex = data.orders.findIndex(o => o.id === orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Ticket non trovato' });
      }

      const order = data.orders[orderIndex];

      if (order.status === 'Rimborsato' || order.status === 'Rimborso in attesa') {
        return res.status(400).json({ error: 'Biglietto annullato o rimborsato. Ingresso non consentito.', order, rejected: true });
      }

      if (eventName && (order.event || '').toLowerCase() !== eventName.toLowerCase()) {
        return res.status(400).json({ error: `Biglietto non valido per questo evento. Valido per: ${order.event || 'Nessun Evento'}`, order, rejected: true });
      }

      if (order.used >= order.qty) {
        return res.status(400).json({ error: 'Biglietto già utilizzato.', order });
      }

      data.orders[orderIndex].used = (data.orders[orderIndex].used || 0) + 1;

      // If ticket was "pay at door", mark as paid now and add revenue
      const wasDaPagare = 
        data.orders[orderIndex].payment === 'Da Pagare' ||
        data.orders[orderIndex].payment === 'To Pay' ||
        data.orders[orderIndex].payment === 'To Be Paid' ||
        data.orders[orderIndex].status === 'Da Pagare' ||
        data.orders[orderIndex].status === 'To Pay' ||
        data.orders[orderIndex].status === 'To Be Paid';

      if (wasDaPagare) {
        data.orders[orderIndex].payment = 'Pagato';
        data.orders[orderIndex].status = 'Pagato';
        data.revenue = (data.revenue || 0) + (data.orders[orderIndex].total || 0);
        
        // Update round sold count (case-insensitive match)
        const roundName = data.orders[orderIndex].round;
        for (const key in data.rounds) {
          if (data.rounds[key].name.toLowerCase() === (roundName || '').toLowerCase()) {
            data.rounds[key].sold = (data.rounds[key].sold || 0) + (data.orders[orderIndex].qty || 1);
            break;
          }
        }
      }

      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, order: data.orders[orderIndex] });
    }

    // Manual ticket from admin panel
    if (action === 'manual') {
      data.orders.unshift(order);
      data.revenue += order.total;
      data.ticketsSold += order.qty;
      
      // Update round sold count (case-insensitive)
      for (const key in data.rounds) {
        if (data.rounds[key].name.toLowerCase() === (order.round || '').toLowerCase()) {
          data.rounds[key].sold += order.qty;
          break;
        }
      }
      
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }
    
    // Save settings from admin panel
    if (action === 'settings') {
      if (req.body.rounds) data.rounds = req.body.rounds;
      if (req.body.events) data.events = req.body.events;
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    // Normal customer booking
    if (action === 'book') {
      const existingOrder = data.orders.find(o => 
        o.email && 
        o.email.toLowerCase() === email.toLowerCase() &&
        (o.event || '-') === (order.event || '-')
      );
      if (existingOrder) {
        return res.status(400).json({ error: 'Hai già prenotato un biglietto per questo evento. Ogni persona può ottenere solo un biglietto per evento.' });
      }

      data.orders.unshift(order);
      data.ticketsSold += order.qty;
      
      // Update round sold count (case-insensitive)
      for (const key in data.rounds) {
        if (data.rounds[key].name.toLowerCase() === (order.round || '').toLowerCase()) {
          data.rounds[key].sold += order.qty;
          break;
        }
      }

      // Save subscriber (upsert by email)
      if (!data.subscribers) data.subscribers = [];
      if (!data.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase())) {
        data.subscribers.push({ name: order.name, email: email, phone: order.phone || '', date: order.date });
      }

      await redis.set('luccaAdminData', JSON.stringify(data));

      // Send Email with Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const refundUrl = `https://luccagroove.com/refund-ticket?orderId=${order.id}`;
          
          await resend.emails.send({
            from: 'Lucca Groove <noreply@luccagroove.com>',
            to: email,
            subject: `Il tuo biglietto per Lucca Groove – ${order.round}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:20px;border-radius:8px;">
                <h1 style="color:#FF6B00;text-align:center;letter-spacing:0.1em;font-size:2rem;margin-bottom:4px;">LUCCA GROOVE</h1>
                <p style="text-align:center;color:#888;font-size:0.8rem;letter-spacing:0.2em;margin-bottom:24px;">LUCCA, ITALIA</p>
                
                <div style="background:#111;padding:24px;border-radius:12px;border:1px solid #333;">
                  <h2 style="margin-top:0;color:#fff;font-size:1.2rem;">✅ Prenotazione Confermata</h2>
                  <p style="color:#eee;">Ciao <strong>${order.name}</strong>, il tuo biglietto è pronto!</p>
                  
                  <div style="margin:20px 0;padding:16px;border-left:4px solid #FF6B00;background:#1a1a1a;border-radius:0 8px 8px 0;">
                    <p style="margin:4px 0;color:#eee;font-size:0.95rem;"><strong>Evento:</strong> ${order.round}</p>
                    <p style="margin:4px 0;color:#eee;font-size:0.95rem;"><strong>ID Ordine:</strong> <span style="color:#FF6B00;font-family:monospace;">${order.id}</span></p>
                    <p style="margin:4px 0;color:#eee;font-size:0.95rem;"><strong>Intestatario:</strong> ${order.name}</p>
                    <p style="margin:4px 0;color:#eee;font-size:0.95rem;"><strong>Da pagare all'ingresso:</strong> <strong style="color:#FF6B00;">€${order.total}</strong></p>
                  </div>

                  <!-- TICKET LINK -->
                  <div style="text-align:center;margin:32px 0;">
                    <a href="https://luccagroove.com/ticket.html?id=${order.id}" style="display:inline-block;padding:14px 28px;background:#FF6B00;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:1.1rem;letter-spacing:1px;text-transform:uppercase;">🎫 Visualizza & Scarica PDF</a>
                    <p style="color:#888;font-size:0.85rem;margin-top:16px;">Clicca sul pulsante qui sopra per visualizzare il QR Code e scaricare il biglietto in formato PDF.</p>
                  </div>

                  <hr style="border-color:#333;margin:20px 0;" />
                  <p style="color:#aaa;font-size:0.8rem;line-height:1.6;">Hai ricevuto questo biglietto perché hai effettuato una prenotazione su luccagroove.com</p>
                  <p style="color:#777;font-size:0.8rem;margin-top:12px;">Non puoi venire? Richiedilo entro 48 ore:</p>
                  <a href="${refundUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#222;color:#fff;border-radius:6px;text-decoration:none;font-size:0.85rem;border:1px solid #444;">🔄 Richiedi Rimborso</a>
                </div>
                
                <p style="text-align:center;color:#555;font-size:0.75rem;margin-top:20px;">© 2025 Lucca Groove · <a href="https://www.instagram.com/lucca_groove/" style="color:#FF6B00;">@lucca_groove</a></p>
              </div>
            `
          });
        } catch (e) {
          console.error('Failed to send email:', e);
        }
      }

      return res.status(200).json({ success: true, data });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save data' });
  }
};
