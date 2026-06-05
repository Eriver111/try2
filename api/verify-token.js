const crypto = require('crypto');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'knowbazi';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { token, baziHash } = req.query || {};
    if (!token) return res.status(200).json({ valid: false, reason: 'no_token' });
    if (!token.startsWith('tk_')) return res.status(200).json({ valid: false, reason: 'invalid' });
    const raw = token.slice(3);
    const dotIdx = raw.lastIndexOf('.');
    if (dotIdx < 0) return res.status(200).json({ valid: false, reason: 'invalid' });
    const ps = raw.slice(0, dotIdx), sig = raw.slice(dotIdx + 1);
    const exp = crypto.createHmac('sha256', TOKEN_SECRET).update(ps).digest('hex').slice(0, 16);
    if (sig !== exp) return res.status(200).json({ valid: false, reason: 'invalid' });
    let p;
    try { p = JSON.parse(Buffer.from(ps, 'base64url').toString()); }
    catch (e) { return res.status(200).json({ valid: false, reason: 'invalid' }); }
    if (Date.now() > p.exp) return res.status(200).json({ valid: false, reason: 'expired' });
    if (baziHash && p.bh !== baziHash) return res.status(200).json({ valid: false, reason: 'mismatch' });
    return res.status(200).json({ valid: true, orderId: p.oid });
  } catch (e) { return res.status(200).json({ valid: false }); }
};
