/**
 * POST /api/create-order
 * 创建付费订单。返回订单号和支付相关信息。
 *
 * 入参: { year, month, day, hour, gender, amount }
 * 返回: { orderId, amount, qrcode, status }
 */
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { year, month, day, hour, gender, amount } = req.body || {};
    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '缺少八字参数' });
    }

    const payAmount = amount || 9.9;
    const hash = store.baziHash({ year, month, day, hour, gender });
    const orderId = 'bazi_' + Date.now().toString(36) + '_' + store.baziHash({ year, month, day, hour, gender }).slice(0, 6);

    const order = store.createOrder({
      id: orderId,
      amount: payAmount,
      baziHash: hash,
      status: 'pending',
      params: { year, month, day, hour, gender },
      createdAt: new Date().toISOString()
    });

    // ---- 支付对接占位符 ----
    // 上线后替换为：调用易支付 API 获取真实支付链接
    const qrcodeUrl = null; // 易支付返回: pay_url
    const payNote = '支付功能即将上线。开发测试阶段可调用 /api/check-order?orderId=' + orderId + '&action=pay 模拟支付。';

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      status: 'pending',
      qrcode: qrcodeUrl,
      note: payNote
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
