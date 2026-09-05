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
  orders: []
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

    const { email, order, action } = req.body;

    // Manual ticket from admin panel
    if (action === 'manual') {
      data.orders.unshift(order);
      data.revenue += order.total;
      data.ticketsSold += order.qty;
      
      // Update round sold count
      for (const key in data.rounds) {
        if (data.rounds[key].name === order.round) {
          data.rounds[key].sold += order.qty;
          break;
        }
      }
      
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }
    
    // Save settings from admin panel
    if (action === 'settings') {
      data.rounds = req.body.rounds;
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true, data });
    }

    // Normal customer booking
    if (action === 'book') {
      const existingOrder = data.orders.find(o => o.email && o.email.toLowerCase() === email.toLowerCase());
      if (existingOrder) {
        return res.status(400).json({ error: 'Hai già prenotato un biglietto con questa email. Ogni persona può ottenere solo un biglietto.' });
      }

      data.orders.unshift(order);
      data.ticketsSold += order.qty;
      
      // Update round sold count
      for (const key in data.rounds) {
        if (data.rounds[key].name === order.round) {
          data.rounds[key].sold += order.qty;
          break;
        }
      }

      await redis.set('luccaAdminData', JSON.stringify(data));

      // Send Email with Resend
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          await resend.emails.send({
            from: 'Lucca Groove <onboarding@resend.dev>',
            to: email,
            subject: `Il tuo biglietto per Lucca Groove - ${order.round}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 20px; border-radius: 8px;">
                <h1 style="color: #fff; text-align: center;">LUCCA GROOVE</h1>
                <div style="background: #111; padding: 20px; border-radius: 8px; border: 1px solid #333; margin-top: 20px;">
                  <h2 style="margin-top: 0; color: #fff;">Conferma Prenotazione</h2>
                  <p style="color: #eee;">Ciao <strong>${order.name}</strong>,</p>
                  <p style="color: #eee;">Il tuo biglietto per Lucca Groove è confermato!</p>
                  
                  <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #fff; background: #222;">
                    <p style="margin: 5px 0; color: #eee;"><strong>Tipologia:</strong> ${order.round}</p>
                    <p style="margin: 5px 0; color: #eee;"><strong>ID Ordine:</strong> ${order.id}</p>
                    <p style="margin: 5px 0; color: #eee;"><strong>Totale da pagare:</strong> €${order.total}</p>
                  </div>
                  
                  <p style="color: #aaa;">Mostra questa email o l'ID ordine all'ingresso per pagare ed entrare.</p>
                  <p style="color: #eee;">Ci vediamo a Lucca Groove!</p>
                </div>
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
