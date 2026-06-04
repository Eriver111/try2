/**
 * POST /api/verify-token
 * 验证访问令牌是否有效。
 *
 * 入参: { token, baziHash }
 * 返回: { valid, orderId }
 */
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, baziHash } = req.body || {};
    if (!token) return res.status(400).json({ error: '缺少 token' });

    const result = store.verifyToken(token, baziHash);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
