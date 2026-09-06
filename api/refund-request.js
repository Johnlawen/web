const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { action, orderId, name, email, reason, requestId, status } = req.body;
    let data = await redis.get('luccaAdminData');
    if (!data) return res.status(404).json({ error: 'No data' });
    if (typeof data === 'string') data = JSON.parse(data);
    if (!data.refundRequests) data.refundRequests = [];

    // Customer submits a refund request
    if (action === 'submit') {
      // Check order exists
      const orderIdx = data.orders.findIndex(o => o.id === orderId);
      if (orderIdx === -1) return res.status(404).json({ error: 'Ordine non trovato. Controlla il tuo ID.' });
      
      const order = data.orders[orderIdx];
      
      // Check not already refunded
      const existing = data.refundRequests.find(r => r.orderId === orderId && r.status !== 'rejected');
      if (existing) return res.status(400).json({ error: 'Hai già inviato una richiesta di rimborso per questo ordine.' });

      const request = {
        id: 'REF-' + Math.floor(Math.random() * 90000 + 10000),
        orderId,
        name: order.name,
        email: order.email || email,
        reason,
        date: new Date().toLocaleDateString('it-IT'),
        status: 'pending'
      };
      data.refundRequests.unshift(request);
      
      // Update order status
      data.orders[orderIdx].status = 'Rimborso in attesa';
      
      await redis.set('luccaAdminData', JSON.stringify(data));
      return res.status(200).json({ success: true });
    }

    // Admin approves or rejects
    if (action === 'update') {
      const idx = data.refundRequests.findIndex(r => r.id === requestId);
      if (idx === -1) return res.status(404).json({ error: 'Request not found' });
      
      data.refundRequests[idx].status = status;
      
      // Sync with order
      const orderId = data.refundRequests[idx].orderId;
      const orderIdx = data.orders.findIndex(o => o.id === orderId);
      
      if (orderIdx !== -1) {
        if (status === 'approved') {
          data.orders[orderIdx].status = 'Rimborsato';
          // Deduct from stats
          data.revenue -= data.orders[orderIdx].total;
          data.ticketsSold -= data.orders[orderIdx].qty;
          const roundName = data.orders[orderIdx].round;
          for (const key in data.rounds) {
            if (data.rounds[key].name === roundName) {
              data.rounds[key].sold = Math.max(0, data.rounds[key].sold - data.orders[orderIdx].qty);
              break;
            }
          }
        } else if (status === 'rejected') {
          data.orders[orderIdx].status = 'Attivo';
        }
      }

      await redis.set('luccaAdminData', JSON.stringify(data));

      // Send email to customer
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const req2 = data.refundRequests[idx];
          const isApproved = status === 'approved';
          await resend.emails.send({
            from: 'Lucca Groove <noreply@luccagroove.com>',
            to: req2.email,
            subject: isApproved ? 'Rimborso Approvato – Lucca Groove' : 'Rimborso Non Approvato – Lucca Groove',
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:20px;border-radius:8px;">
                <h1 style="color:#FF6B00;text-align:center;">LUCCA GROOVE</h1>
                <div style="background:#111;padding:20px;border-radius:8px;border:1px solid #333;margin-top:20px;">
                  <h2 style="color:#fff;">${isApproved ? '✅ Rimborso Approvato' : '❌ Rimborso Non Approvato'}</h2>
                  <p style="color:#eee;">Ciao <strong>${req2.name}</strong>,</p>
                  ${isApproved
                    ? `<p style="color:#eee;">La tua richiesta di rimborso per l'ordine <strong>${req2.orderId}</strong> è stata <strong style="color:#4CAF50;">approvata</strong>. Verrai ricontattato per i dettagli del rimborso.</p>`
                    : `<p style="color:#eee;">La tua richiesta di rimborso per l'ordine <strong>${req2.orderId}</strong> è stata <strong style="color:#f44336;">respinta</strong>. Per maggiori informazioni contattaci su Instagram.</p>`
                  }
                  <p style="color:#aaa;margin-top:20px;">Lucca Groove Team</p>
                </div>
              </div>
            `
          });
        } catch(e) { console.error('Email error:', e); }
      }
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
