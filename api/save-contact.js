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

    const { firstName, lastName, phone, role, message, mixLink } = req.body;

    if (!firstName || !lastName || !role || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanFirstName = String(firstName).replace(/<[^>]*>/g, '').trim().slice(0, 50);
    const cleanLastName = String(lastName).replace(/<[^>]*>/g, '').trim().slice(0, 50);
    const cleanPhone = String(phone || '').replace(/<[^>]*>/g, '').trim().slice(0, 30);
    const cleanRole = String(role).replace(/<[^>]*>/g, '').trim().slice(0, 50);
    const cleanMessage = String(message).replace(/<[^>]*>/g, '').trim().slice(0, 2000);
    let cleanMixLink = String(mixLink || '').trim().slice(0, 500);
    if (cleanMixLink && !/^https?:\/\//i.test(cleanMixLink)) {
      cleanMixLink = '';
    }

    if (!cleanFirstName || !cleanLastName || !cleanMessage) {
      return res.status(400).json({ error: 'I campi obbligatori non sono validi.' });
    }

    if (!data.contacts) {
      data.contacts = [];
    }

    const crypto = require('crypto');
    const newContact = {
      id: 'CNT-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      date: new Date().toLocaleDateString('it-IT'),
      firstName: cleanFirstName,
      lastName: cleanLastName,
      phone: cleanPhone,
      role: cleanRole,
      message: cleanMessage,
      mixLink: cleanMixLink
    };

    data.contacts.unshift(newContact);

    await redis.set('luccaAdminData', JSON.stringify(data));

    return res.status(200).json({ success: true, contact: newContact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save contact data' });
  }
};
