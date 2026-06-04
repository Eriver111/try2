/**
 * /api/create-order
 * 创建支付订单，调用 zpayz 获取二维码，返回 qrcode 给前端。
 * 独立文件，零外部依赖。
 */
const crypto = require('crypto');

// ---- 配置 ----
const PAY_URL = process.env.PAY_API_URL || 'https://zpayz.cn/mapi.php';
const PAY_PID = process.env.PAY_PID || '';
const PAY_KEY = process.env.PAY_KEY || '';
const SITE = process.env.SITE_URL || 'https://www.knowbazi.online';

// ---- 内存存储 (Vercel Serverless 实例内有效) ----
const orders = new Map();
const tokens = new Map();

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { year, month, day, hour, gender, amount } = req.body || {};
    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '缺少八字参数' });
    }

    const payAmount = amount || 9.9;
    const bzHash = makeHash({ year, month, day, hour, gender });
    const orderId = 'bazi_' + Date.now().toString(36) + '_' + bzHash.slice(0, 6);

    // 存订单
    orders.set(orderId, {
      id: orderId, amount: payAmount, baziHash: bzHash,
      status: 'pending', createdAt: new Date().toISOString()
    });
    // 30 分钟过期
    setTimeout(() => { const o = orders.get(orderId); if (o && o.status === 'pending') o.status = 'expired'; }, 1800000);

    // 调用 zpayz 创建支付
    const notifyUrl = SITE + '/api/callback';
    const returnUrl = SITE + '/result.html?year=' + year + '&month=' + month + '&day=' + day + '&hour=' + hour + '&gender=' + gender;

    const payParams = {
      pid: PAY_PID, type: 'alipay',
      out_trade_no: orderId, notify_url: notifyUrl,
      return_url: returnUrl, name: '八字命盘完整解读', money: String(payAmount)
    };
    payParams.sign = md5Sign(payParams);
    payParams.sign_type = 'MD5';

    const formBody = Object.keys(payParams).map(k =>
      encodeURIComponent(k) + '=' + encodeURIComponent(payParams[k])
    ).join('&');

    let qrcode = '', payUrl = '';
    try {
      const payResp = await fetch(PAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody
      });
      const text = await payResp.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {
        return res.status(502).json({ error: '支付平台返回异常: ' + text.slice(0, 100) });
      }
      if (data.code !== 1) {
        return res.status(502).json({ error: data.msg || '支付下单失败' });
      }
      qrcode = data.qrcode || data.payurl || '';
      payUrl = data.payurl || data.qrcode || '';
    } catch (e) {
      return res.status(502).json({ error: '支付平台请求失败: ' + e.message });
    }

    return res.status(200).json({ orderId, amount: payAmount, qrcode, payUrl, status: 'pending' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ---- 内联工具 ----
function md5Sign(params) {
  const sorted = Object.keys(params).sort();
  const str = sorted.map(k => k + '=' + params[k]).join('&');
  return crypto.createHash('md5').update(str + PAY_KEY).digest('hex');
}

function makeHash(p) {
  const s = [p.year, p.month, p.day, p.hour, p.gender].join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return 'bz_' + Math.abs(h).toString(36);
}
