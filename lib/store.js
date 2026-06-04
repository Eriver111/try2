/**
 * 数据存储层
 * 开发阶段用内存 Map，上线后切到 Supabase。
 * 接口保持一致，切数据库只改这个文件。
 */

// 订单记录: { id, amount, status, baziHash, createdAt, paidAt, token }
const orders = new Map();

// 访问令牌->订单映射
const tokens = new Map();

// -------------------------------------------------
// 订单
// -------------------------------------------------
function createOrder(order) {
  orders.set(order.id, order);
  // 1小时后自动过期
  setTimeout(() => {
    const o = orders.get(order.id);
    if (o && o.status === 'pending') {
      o.status = 'expired';
    }
  }, 3600_000);
  return order;
}

function getOrder(id) {
  return orders.get(id) || null;
}

function markOrderPaid(id) {
  const o = orders.get(id);
  if (!o) return null;
  o.status = 'paid';
  o.paidAt = new Date().toISOString();
  return o;
}

// -------------------------------------------------
// 令牌
// -------------------------------------------------
function createToken(orderId, baziHash) {
  const token = 'tk_' + randomHex(32);
  tokens.set(token, {
    orderId: orderId,
    baziHash: baziHash,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 86400_000 // 7天
  });
  return token;
}

function verifyToken(token, baziHash) {
  const t = tokens.get(token);
  if (!t) return { valid: false, reason: 'invalid' };
  if (Date.now() > t.expiresAt) {
    tokens.delete(token);
    return { valid: false, reason: 'expired' };
  }
  // baziHash 可选校验
  if (baziHash && t.baziHash !== baziHash) {
    return { valid: false, reason: 'mismatch' };
  }
  return { valid: true, orderId: t.orderId };
}

// -------------------------------------------------
// 工具
// -------------------------------------------------
function randomHex(len) {
  const chars = 'abcdef0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function baziHash(params) {
  // 八字参数生成唯一 hash
  const str = [params.year, params.month, params.day, params.hour, params.gender].join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'bz_' + Math.abs(hash).toString(36);
}

module.exports = {
  createOrder,
  getOrder,
  markOrderPaid,
  createToken,
  verifyToken,
  baziHash
};
