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
  try {
    let data = await redis.get('luccaAdminData');
    if (!data) {
      data = defaultData;
      await redis.set('luccaAdminData', JSON.stringify(data));
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    // --- AUTO-CLEANUP ORPHANED ORDERS ---
    // If an order belongs to an event that was archived, move it to pastOrders.
    let changed = false;
    if (data.archivedEvents && data.orders && data.orders.length > 0) {
      const activeEventNames = (data.events || []).map(e => e.name.toLowerCase());
      
      const orphanedOrders = data.orders.filter(o => 
        !activeEventNames.includes((o.event || '').toLowerCase()) && 
        data.archivedEvents.some(ae => ae.name.toLowerCase() === (o.event || '').toLowerCase())
      );
      
      if (orphanedOrders.length > 0) {
        if (!data.pastOrders) data.pastOrders = [];
        data.pastOrders.push(...orphanedOrders);
        data.orders = data.orders.filter(o => !orphanedOrders.includes(o));
        
        orphanedOrders.forEach(o => {
          // Deduct from live dashboard stats
          data.revenue = Math.max(0, data.revenue - (o.total || 0));
          data.ticketsSold = Math.max(0, data.ticketsSold - (o.qty || 0));
          
          // Add to the archived event's stats
          const archEv = data.archivedEvents.find(ae => ae.name.toLowerCase() === (o.event || '').toLowerCase());
          if (archEv) {
            archEv.ticketsSold = (archEv.ticketsSold || 0) + (o.qty || 0);
            archEv.revenue = (archEv.revenue || 0) + (o.total || 0);
            archEv.orderCount = (archEv.orderCount || 0) + 1;
          }
        });
        
        changed = true;
      }
    }
    
    if (changed) {
      await redis.set('luccaAdminData', JSON.stringify(data));
    }
    // -------------------------------------

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
