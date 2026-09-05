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
      return res.status(200).json({ success: true, data });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save data' });
  }
};
