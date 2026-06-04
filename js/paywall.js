/**
 * 付费遮罩层逻辑
 *
 * 付费板块: 今年运势, 婚姻感情, 财运分析, 学业分析, 近五年流年运势
 * 免费板块: 四柱八字, 大运, 流年表, 专业解读, 日主性格, 父母关系
 *
 * 遮罩只盖内容区（drawer-body），标题栏可见，每个板块显示自己的标题。
 * 所有付费板块一次性解锁，9.9 元。
 */

const PAID_SECTIONS = [
  'thisYearSection',
  'marriageSection',
  'wealthSection',
  'studySection',
  'fortuneSection'
];

// 板块中文名
const SECTION_TITLES = {
  thisYearSection: '今年运势',
  marriageSection: '婚姻感情',
  wealthSection: '财运分析',
  studySection: '学业分析',
  fortuneSection: '近五年流年运势'
};

const PAYWALL_STATE_KEY = 'bazi_paywall';
const API_BASE = '/api';

// ---- 全局状态 ----
let _orderId = null;
let _baziHash = null;

// ---- 初始化 ----
function initPaywall(baziParams) {
  _baziHash = hashParams(baziParams);

  // 检查本地是否有有效token
  const saved = readSaved();
  if (saved && saved.baziHash === _baziHash) {
    verifyAndUnlock(saved.token);
  } else {
    showPaywall();
  }
}

// ---- 显示遮罩（每个板块独立标题，一次性买断全部） ----
function showPaywall() {
  PAID_SECTIONS.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;

    // 找到 drawer-body，只盖内容区
    var body = el.querySelector('.drawer-body');
    if (!body) return;

    // 已有遮罩就不重复添加
    if (body.querySelector('.paywall-overlay')) return;

    // 强制展开，露出标题
    el.classList.add('drawer-open');
    // 同时旋转箭头
    var arrow = el.querySelector('.drawer-arrow');
    if (arrow) arrow.style.transform = 'rotate(90deg)';

    var title = SECTION_TITLES[id] || '付费内容';

    var overlay = document.createElement('div');
    overlay.className = 'paywall-overlay';
    overlay.innerHTML = ''
      + '<div class="paywall-card">'
      +   '<div class="paywall-card-title">' + title + '</div>'
      +   '<div class="paywall-card-sub">以下内容需付费解锁后查看</div>'
      +   '<div class="paywall-price" style="margin-top:18px;margin-bottom:14px">'
      +     '<span class="paywall-current">9.9 元</span>'
      +     '<span class="paywall-one-time" style="display:block;font-size:10px;color:var(--text-dim);margin-top:2px">一次付费，全部板块永久解锁（7天内）</span>'
      +   '</div>'
      +   '<button class="paywall-btn" onclick="startPay()">解锁全部内容</button>'
      +   '<div class="paywall-tip" id="paywallTip" style="display:none;margin-top:8px"></div>'
      + '</div>';
    body.classList.add('paywall-active');   // 强制撑开
    body.appendChild(overlay);
  });
}

// ---- 隐藏所有遮罩 ----
function hidePaywall() {
  PAID_SECTIONS.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var body = el.querySelector('.drawer-body');
    if (!body) return;
    var ov = body.querySelector('.paywall-overlay');
    if (ov) ov.remove();
    body.classList.remove('paywall-active');
  });
}

// ---- 发起支付 ----
function startPay() {
  // 所有按钮一起变灰
  var allBtns = document.querySelectorAll('.paywall-btn');
  allBtns.forEach(function(b) { b.disabled = true; b.textContent = '创建订单中...'; });

  var tip = document.getElementById('paywallTip');
  var params = getBaziParamsFromURL();

  fetch(API_BASE + '/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: params.year,
      month: params.month,
      day: params.day,
      hour: params.hour,
      gender: params.gender,
      amount: 9.9
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    _orderId = data.orderId;
    allBtns.forEach(function(b) { b.textContent = '模拟支付中...'; });
    if (tip) { tip.style.display = 'block'; tip.textContent = '开发模式：自动模拟支付成功'; }

    setTimeout(function() { simulatePay(); }, 500);
  })
  .catch(function(e) {
    allBtns.forEach(function(b) { b.disabled = false; b.textContent = '网络错误，请重试'; });
    if (tip) { tip.style.display = 'block'; tip.textContent = '错误: ' + e.message; }
  });
}

// ---- 模拟支付 (上线后删除) ----
function simulatePay() {
  var tip = document.getElementById('paywallTip');
  if (tip) tip.textContent = '验证支付结果...';

  fetch(API_BASE + '/check-order?orderId=' + _orderId + '&action=pay')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status === 'paid' && data.token) {
        onPaymentSuccess(data.token);
      } else {
        if (tip) tip.textContent = '支付验证失败，请刷新重试';
      }
    })
    .catch(function(e) {
      if (tip) tip.textContent = '网络错误: ' + e.message;
    });
}

// ---- 支付成功 ----
function onPaymentSuccess(token) {
  saveToken(token, _baziHash);
  hidePaywall();
  if (typeof renderPaidContent === 'function') {
    renderPaidContent();
  }
}

// ---- token 验证 ----
function verifyAndUnlock(token) {
  fetch(API_BASE + '/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, baziHash: _baziHash })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.valid) {
      hidePaywall();
      if (typeof renderPaidContent === 'function') {
        renderPaidContent();
      }
    } else {
      clearSaved();
      showPaywall();
    }
  })
  .catch(function() {
    showPaywall();
  });
}

// ---- 本地存储 ----
function saveToken(token, hash) {
  var obj = { token: token, baziHash: hash, savedAt: Date.now() };
  try { localStorage.setItem(PAYWALL_STATE_KEY, JSON.stringify(obj)); } catch(e) {}
}

function readSaved() {
  try {
    var raw = localStorage.getItem(PAYWALL_STATE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.savedAt > 7 * 86400000) {
      localStorage.removeItem(PAYWALL_STATE_KEY);
      return null;
    }
    return obj;
  } catch(e) { return null; }
}

function clearSaved() {
  try { localStorage.removeItem(PAYWALL_STATE_KEY); } catch(e) {}
}

// ---- 工具 ----
function hashParams(p) {
  var s = [p.year, p.month, p.day, p.hour, p.gender].join('|');
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return 'bz_' + Math.abs(h).toString(36);
}

function getBaziParamsFromURL() {
  var q = new URLSearchParams(window.location.search);
  return {
    year: parseInt(q.get('year')),
    month: parseInt(q.get('month')),
    day: parseInt(q.get('day')),
    hour: parseInt(q.get('hour')),
    gender: q.get('gender')
  };
}
