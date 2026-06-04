/**
 * 支付对接工具 - zpayz 易支付
 * API: POST form-data → https://zpayz.cn/mapi.php
 */

const crypto = require('crypto');

const API_URL = process.env.PAY_API_URL || 'https://zpayz.cn/mapi.php';
const PID = process.env.PAY_PID || '';
const KEY = process.env.PAY_KEY || '';

/**
 * 生成签名
 * 规则：所有参数按 key 排序，拼接为 key1=val1&key2=val2...&key=商户密钥
 * 然后 MD5
 */
function sign(params) {
  const sorted = Object.keys(params).sort();
  const str = sorted.map(k => k + '=' + params[k]).join('&');
  return crypto.createHash('md5').update(str + KEY).digest('hex');
}

/**
 * 创建支付订单 → 返回二维码/支付链接
 * @param {string} outTradeNo 商户订单号
 * @param {number} money 金额（元）
 * @param {string} name 商品名称
 * @param {string} notifyUrl 异步回调地址
 * @param {string} returnUrl 支付完成跳转地址
 */
async function createPayment(outTradeNo, money, name, notifyUrl, returnUrl) {
  const params = {
    pid: PID,
    type: 'alipay',        // 默认支付宝扫码；微信='wxpay'
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: name,
    money: String(money)
  };
  params.sign = sign(params);
  params.sign_type = 'MD5';

  // POST form-data
  const formBody = Object.keys(params).map(k =>
    encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
  ).join('&');

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('支付平台返回异常: ' + text.slice(0, 200));
  }

  if (data.code !== 1) {
    throw new Error(data.msg || '支付下单失败');
  }

  return {
    tradeNo: data.trade_no || outTradeNo,
    qrcode: data.qrcode || data.payurl || '',
    payUrl: data.payurl || data.qrcode || ''
  };
}

/**
 * 查询订单状态
 */
async function queryOrder(outTradeNo) {
  const params = {
    act: 'order',
    pid: PID,
    key: KEY,
    out_trade_no: outTradeNo
  };

  const formBody = Object.keys(params).map(k =>
    encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
  ).join('&');

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch (e) {
    return { status: 'unknown' };
  }

  // status: 0=未支付, 1=已支付
  return {
    status: data.status === 1 ? 'paid' : 'pending',
    tradeNo: data.trade_no || outTradeNo,
    money: data.money || '',
    raw: data
  };
}

/**
 * 验证异步回调签名
 */
function verifyNotify(params) {
  if (!params.sign) return false;
  const signVal = params.sign;
  const rest = { ...params };
  delete rest.sign;
  delete rest.sign_type;
  const expected = sign(rest);
  return expected === signVal;
}

module.exports = { createPayment, queryOrder, verifyNotify };
