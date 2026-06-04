/**
 * GET /api/check-order
 * 前端轮询此接口查询订单状态。
 *
 * 入参: ?orderId=xxx
 * 返回: { orderId, status, token }
 */
const store = require('../lib/store');
const pay = require('../lib/pay');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { orderId } = req.query || {};
    if (!orderId) return res.status(400).json({ error: '缺少 orderId' });

    // 先查本地
    const local = await store.getOrder(orderId);
    if (!local) return res.status(404).json({ error: '订单不存在' });

    // 已支付 → 返回令牌
    if (local.status === 'paid') {
      if (!local.token) {
        const token = store.createToken(orderId, local.baziHash);
        local.token = token;
      }
      return res.status(200).json({ orderId, status: 'paid', token: local.token });
    }

    // 未支付 → 查询支付平台
    if (local.status === 'pending') {
      const payResult = await pay.queryOrder(orderId);
      if (payResult.status === 'paid') {
        await store.markOrderPaid(orderId);
        const token = store.createToken(orderId, local.baziHash);
        return res.status(200).json({ orderId, status: 'paid', token });
      }
    }

    return res.status(200).json({ orderId, status: local.status });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
