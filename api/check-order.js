/**
 * GET /api/check-order
 * 前端轮询此接口，判断是否已支付。
 *
 * 入参: ?orderId=xxx  [&action=pay 模拟支付]
 * 返回: { orderId, status, token }
 */
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { orderId, action } = req.query || {};

    if (!orderId) {
      return res.status(400).json({ error: '缺少 orderId' });
    }

    // 开发阶段：?action=pay 模拟支付成功
    if (action === 'pay') {
      const order = store.markOrderPaid(orderId);
      if (!order) return res.status(404).json({ error: '订单不存在' });

      const token = store.createToken(order.id, order.baziHash);
      order.token = token;

      return res.status(200).json({
        orderId: order.id,
        status: 'paid',
        token: token,
        note: '开发模式：模拟支付成功'
      });
    }

    const order = store.getOrder(orderId);
    if (!order) return res.status(404).json({ error: '订单不存在' });

    // 已支付 → 返回令牌
    if (order.status === 'paid' && order.token) {
      return res.status(200).json({
        orderId: order.id,
        status: 'paid',
        token: order.token
      });
    }

    // 未支付
    return res.status(200).json({
      orderId: order.id,
      status: order.status
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
