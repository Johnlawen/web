const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let data = await redis.get('luccaAdminData');
    if (!data) {
      data = {};
    } else if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    const { firstName, lastName, role, message } = req.body;

    if (!firstName || !lastName || !role || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!data.contacts) {
      data.contacts = [];
    }

    const newContact = {
      id: 'CNT-' + Math.floor(Math.random() * 90000 + 10000),
      date: new Date().toLocaleDateString('it-IT'),
      firstName,
      lastName,
      role,
      message
    };

    data.contacts.unshift(newContact);

    await redis.set('luccaAdminData', JSON.stringify(data));

    return res.status(200).json({ success: true, contact: newContact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save contact data' });
  }
};
