/**
 * /api/create-order
 * 创建支付订单 → 调用 zpayz → 返回二维码
 * 自包含架构：Token 编码订单信息，无需共享数据库
 */
const crypto = require('crypto');

const PAY_URL = process.env.PAY_API_URL || 'https://zpayz.cn/mapi.php';
const PAY_PID = process.env.PAY_PID || '';
const PAY_KEY = process.env.PAY_KEY || '';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'knowbazi';
const SITE = process.env.SITE_URL || 'https://www.knowbazi.online';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { year, month, day, hour, gender, amount, hash, description } = req.body || {};

    // 兼容两种调用模式：个人排盘（year/month/day/hour/gender）和合盘（amount + hash）
    const isHePan = !year && !!hash;
    const payAmount = amount || (isHePan ? 13.9 : 9.9);
    const payName = description || (isHePan ? '知时 · 合盘报告' : '知时 · 完整分析报告');

    if (isHePan) {
      // 合盘模式：用 hash 做订单 ID
      const orderId = 'hepan_' + Date.now().toString(36) + '_' + hash.slice(0, 6);
      const notifyUrl = SITE + '/api/callback.js';
      var ref = (req.headers.referer || '').split('?')[1] || '';
        var hprUrl = SITE + '/hepan-result.html?' + ref;

      const payParams = {
        pid: PAY_PID, type: 'alipay',
        out_trade_no: orderId, notify_url: notifyUrl,
        return_url: hprUrl, name: payName, money: String(payAmount)
      };
      payParams.sign = md5Sign(payParams, PAY_KEY);
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
    }

    // 个人排盘模式（原有逻辑）
    if (!year || !month || !day || hour === undefined || !gender) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const payAmountLegacy = amount || 9.9;
    const bzHash = makeHash({ year, month, day, hour, gender });
    const orderId = 'bazi_' + Date.now().toString(36) + '_' + bzHash.slice(0, 6);

    const notifyUrl = SITE + '/api/callback.js';
    const returnUrl = SITE + '/result.html?year=' + year + '&month=' + month + '&day=' + day + '&hour=' + hour + '&gender=' + gender;

    const payParams = {
      pid: PAY_PID, type: 'alipay',
      out_trade_no: orderId, notify_url: notifyUrl,
      return_url: returnUrl, name: payName, money: String(payAmountLegacy)
    };
    payParams.sign = md5Sign(payParams, PAY_KEY);
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

function md5Sign(params, key) {
  const sorted = Object.keys(params).sort();
  const str = sorted.map(k => k + '=' + params[k]).join('&');
  return crypto.createHash('md5').update(str + key).digest('hex');
}

function makeHash(p) {
  const s = [p.year, p.month, p.day, p.hour, p.gender].join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return 'bz_' + Math.abs(h).toString(36);
}
