/**
 * 数据存储层
 *
 * 开发模式(USE_DB=false)：内存 Map，重启即清空
 * 生产模式(USE_DB=true) ：Supabase PostgreSQL
 *
 * 切换方式：在 Vercel 环境变量中设置 USE_DB=true
 *          并填入 SUPABASE_URL + SUPABASE_KEY
 */

// ---- 本地内存实现（开发用） ----
const orders = new Map();
const tokens = new Map();

// ---- Supabase 客户端（懒加载） ----
let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    return supabase;
  } catch (e) {
    console.error('Supabase init failed, falling back to memory:', e.message);
    return null;
  }
}

// 判断用哪个后端
function useDb() {
  return process.env.USE_DB === 'true' && getSupabase();
}

// ============================================
// 订单
// ============================================
function createOrder(order) {
  if (useDb()) {
    // 异步写入 Supabase，同时返回数据给调用方
    getSupabase().from('orders').insert({
      id: order.id,
      amount: order.amount,
      bazi_hash: order.baziHash,
      status: 'pending',
      params: JSON.stringify(order.params || {}),
      created_at: new Date().toISOString()
    }).then(r => {
      if (r.error) console.error('Supabase insert error:', r.error.message);
    });
  } else {
    orders.set(order.id, order);
    setTimeout(() => {
      const o = orders.get(order.id);
      if (o && o.status === 'pending') o.status = 'expired';
    }, 3600_000);
  }
  return order;
}

async function getOrder(id) {
  if (useDb()) {
    const { data } = await getSupabase().from('orders').select('*').eq('id', id).single();
    if (!data) return null;
    return {
      id: data.id,
      amount: data.amount,
      baziHash: data.bazi_hash,
      status: data.status,
      token: data.token,
      params: JSON.parse(data.params || '{}'),
      createdAt: data.created_at,
      paidAt: data.paid_at
    };
  }
  return orders.get(id) || null;
}

async function markOrderPaid(id) {
  if (useDb()) {
    const { data } = await getSupabase()
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (!data) return null;
    return {
      id: data.id,
      amount: data.amount,
      baziHash: data.bazi_hash,
      status: 'paid',
      params: JSON.parse(data.params || '{}'),
      createdAt: data.created_at,
      paidAt: data.paid_at
    };
  }
  const o = orders.get(id);
  if (!o) return null;
  o.status = 'paid';
  o.paidAt = new Date().toISOString();
  return o;
}

// ============================================
// 令牌
// ============================================
function createToken(orderId, baziHash) {
  const token = 'tk_' + randomHex(32);

  if (useDb()) {
    getSupabase().from('tokens').insert({
      token: token,
      order_id: orderId,
      bazi_hash: baziHash,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
    }).then(r => {
      if (r.error) console.error('Token insert error:', r.error.message);
    });
  } else {
    tokens.set(token, {
      orderId, baziHash,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 86400000
    });
  }
  return token;
}

async function verifyToken(token, baziHash) {
  if (useDb()) {
    const { data } = await getSupabase().from('tokens').select('*').eq('token', token).single();
    if (!data) return { valid: false, reason: 'invalid' };
    if (new Date(data.expires_at) < new Date()) return { valid: false, reason: 'expired' };
    if (baziHash && data.bazi_hash !== baziHash) return { valid: false, reason: 'mismatch' };
    return { valid: true, orderId: data.order_id };
  }

  const t = tokens.get(token);
  if (!t) return { valid: false, reason: 'invalid' };
  if (Date.now() > t.expiresAt) { tokens.delete(token); return { valid: false, reason: 'expired' }; }
  if (baziHash && t.baziHash !== baziHash) return { valid: false, reason: 'mismatch' };
  return { valid: true, orderId: t.orderId };
}

// ============================================
// 工具
// ============================================
function randomHex(len) {
  const chars = 'abcdef0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function baziHash(params) {
  const str = [params.year, params.month, params.day, params.hour, params.gender].join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return 'bz_' + Math.abs(hash).toString(36);
}

module.exports = { createOrder, getOrder, markOrderPaid, createToken, verifyToken, baziHash };
