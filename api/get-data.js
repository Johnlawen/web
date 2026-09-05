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
  try {
    let data = await redis.get('luccaAdminData');
    if (!data) {
      data = defaultData;
      await redis.set('luccaAdminData', JSON.stringify(data));
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
