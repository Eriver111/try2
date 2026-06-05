const crypto = require('crypto');
const PAY_PID = process.env.PAY_PID || '';
const PAY_KEY = process.env.PAY_KEY || '';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'knowbazi';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { orderId } = req.query || {};
    if (!orderId) return res.status(400).json({ error: '缺少 orderId' });
    const q = 'https://zpayz.cn/api.php?act=order&pid=' + PAY_PID + '&key=' + PAY_KEY + '&out_trade_no=' + encodeURIComponent(orderId);
    const r = await fetch(q);
    const t = await r.text();
    let d = {};
    try { d = JSON.parse(t); } catch (e) {}
    if (d.status === 1) {
      const bh = orderId.includes('_') ? orderId.split('_').pop() : 'unknown';
      const p = Buffer.from(JSON.stringify({ oid: orderId, bh: bh, exp: Date.now() + 7 * 86400000 })).toString('base64url');
      const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(p).digest('hex').slice(0, 16);
      return res.status(200).json({ orderId, status: 'paid', token: 'tk_' + p + '.' + sig });
    }
    return res.status(200).json({ orderId, status: 'pending' });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
