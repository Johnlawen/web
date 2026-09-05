const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });

    let data = await redis.get('luccaAdminData');
    if (!data) return res.status(404).json({ error: 'No data' });
    if (typeof data === 'string') data = JSON.parse(data);

    const subscribers = data.subscribers || [];
    if (subscribers.length === 0) return res.status(200).json({ success: true, sent: 0 });

    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'No email API key configured' });

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    let sent = 0;
    for (const sub of subscribers) {
      try {
        await resend.emails.send({
          from: 'Lucca Groove <noreply@luccagroove.com>',
          to: sub.email,
          subject: subject,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:20px;border-radius:8px;">
              <h1 style="color:#FF6B00;text-align:center;letter-spacing:0.1em;">LUCCA GROOVE</h1>
              <div style="background:#111;padding:24px;border-radius:8px;border:1px solid #333;margin-top:16px;">
                <p style="color:#eee;">Ciao <strong>${sub.name}</strong>,</p>
                <div style="color:#eee;line-height:1.7;white-space:pre-wrap;">${message}</div>
                <hr style="border-color:#333;margin:20px 0;"/>
                <p style="color:#aaa;font-size:0.85rem;">Lucca Groove Team &nbsp;|&nbsp; Lucca, Italia</p>
                <a href="https://www.instagram.com/lucca_groove/" style="color:#FF6B00;">@lucca_groove</a>
              </div>
            </div>
          `
        });
        sent++;
      } catch(e) { console.error('Failed to send to', sub.email, e); }
    }

    return res.status(200).json({ success: true, sent, total: subscribers.length });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
