/**
 * GET/POST /api/pay-callback
 * zpayz 异步回调：支付成功后通知我们。
 * 验证签名 → 标记订单已付 → 生成令牌 → 返回 success
 */
const store = require('./_lib/store');
const pay = require('./_lib/pay');

module.exports = async function handler(req, res) {
  try {
    const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});

    // 验证签名
    if (!pay.verifyNotify(params)) {
      return res.status(200).send('sign error');
    }

    const orderId = params.out_trade_no;
    if (!orderId) return res.status(200).send('no order');

    const order = await store.getOrder(orderId);
    if (!order) return res.status(200).send('no order');

    if (order.status === 'paid') return res.status(200).send('success');

    // 标记已付
    await store.markOrderPaid(orderId);
    store.createToken(orderId, order.baziHash);

    return res.status(200).send('success');
  } catch (e) {
    console.error('Pay callback error:', e.message);
    return res.status(200).send('error');
  }
};
