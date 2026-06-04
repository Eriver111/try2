/**
 * POST /api/create-order
 * 创建支付订单。调用 zpayz 获取二维码。
 *
 * 入参: { year, month, day, hour, gender, amount }
 * 返回: { orderId, qrcode, payUrl, amount, status }
 */
const store = require('../lib/store');
const pay = require('../lib/pay');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { year, month, day, hour, gender, amount } = body;
    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '缺少八字参数' });
    }

    const payAmount = amount || 9.9;
    const hash = store.baziHash({ year, month, day, hour, gender });
    const orderId = 'bazi_' + Date.now().toString(36) + '_' + hash.slice(0, 6);

    // 存入订单
    store.createOrder({
      id: orderId,
      amount: payAmount,
      baziHash: hash,
      status: 'pending',
      params: { year, month, day, hour, gender },
      createdAt: new Date().toISOString()
    });

    const SITE = process.env.SITE_URL || 'https://www.knowbazi.online';
    const notifyUrl = SITE + '/api/pay-callback';
    const returnUrl = SITE + '/result.html?year=' + year + '&month=' + month + '&day=' + day + '&hour=' + hour + '&gender=' + gender;

    // 调用真实支付
    const result = await pay.createPayment(
      orderId,
      payAmount,
      '八字命盘完整解读',
      notifyUrl,
      returnUrl
    );

    return res.status(200).json({
      orderId: orderId,
      amount: payAmount,
      qrcode: result.qrcode,
      payUrl: result.payUrl,
      status: 'pending'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
