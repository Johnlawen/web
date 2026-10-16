const { Redis } = require('@upstash/redis');

let redis;
try {
  redis = Redis.fromEnv();
} catch (e) {
  console.error('Redis init error in track-visit:', e);
}

module.exports = async function handler(req, res) {
  // Allow only POST or GET (e.g. for beacon or fallback)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!redis) {
    return res.status(200).json({ ok: false, warning: 'Redis not initialized' });
  }

  try {
    let isQR = false;
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      isQR = Boolean(body.isQR);
    } else if (req.query) {
      isQR = req.query.isQR === 'true' || req.query.isQR === '1';
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ops = [
      redis.incr('analytics:visits:total'),
      redis.incr(`analytics:daily:${today}:total`)
    ];

    if (isQR) {
      ops.push(
        redis.incr('analytics:visits:qr'),
        redis.incr(`analytics:daily:${today}:qr`)
      );
    }

    await Promise.all(ops);

    return res.status(200).json({ success: true, isQR });
  } catch (error) {
    console.error('Track visit error:', error);
    // Don't fail the user page load
    return res.status(200).json({ ok: false, error: 'Tracking failed silently' });
  }
};
