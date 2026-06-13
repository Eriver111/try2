/**
 * 合盘付费遮罩层逻辑
 * 付费板块: 双方相合相克之处, 相处密码, 未来三年关键节点, 宜忌指南
 * 遮罩只盖内容区（drawer-body），标题栏可见。
 * 一次付费永久解锁，13.9 元。
 * 付费成功后提供 PDF 下载。
 */

var HEPAN_PAID_DRAWERS = ['hp-drawer-4', 'hp-drawer-5', 'hp-drawer-6', 'hp-drawer-7'];

var HEPAN_PAYWALL_KEY = 'hepan_paywall';
var HEPAN_API_BASE = '/api';
var HEPAN_POLL_INTERVAL = 3000;

var _hepanOrderId = null;
var _hepanHash = null;
var _hepanPollTimer = null;

// ---- 初始化 ----
function initHePanPaywall(p1, p2, relationType) {
  _hepanHash = hashHePanParams(p1, p2, relationType);

  var saved = readHePanSaved();
  if (saved && saved.hepanHash === _hepanHash) {
    verifyHePanAndUnlock(saved.token);
  } else {
    showHePanPaywall();
  }
}

// ---- hash 参数 ----
function hashHePanParams(p1, p2, relationType) {
  var key = [
    p1.dayGan, p1.dayZhi, p1.gender,
    p2.dayGan, p2.dayZhi, p2.gender,
    relationType
  ].join('|');
  // 简单 hash
  var h = 0;
  for (var i = 0; i < key.length; i++) {
    h = ((h << 5) - h) + key.charCodeAt(i);
    h = h | 0;
  }
  return String(Math.abs(h));
}

// ---- 显示遮罩 ----
function showHePanPaywall() {
  HEPAN_PAID_DRAWERS.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var body = el.querySelector('.drawer-body');
    if (!body) return;
    if (body.querySelector('.paywall-overlay')) return;

    el.classList.add('hp-drawer-open');

    var title = el.querySelector('h2');
    var titleText = title ? title.textContent : '付费内容';

    var overlay = document.createElement('div');
    overlay.className = 'paywall-overlay';
    overlay.innerHTML = ''
      + '<div class="paywall-card">'
      +   '<div class="paywall-card-title">' + titleText + '</div>'
      +   '<div class="paywall-card-sub">付费解锁 查看完整合盘报告</div>'
      +   '<div class="paywall-price" style="margin-top:18px;margin-bottom:14px">'
      +     '<span class="paywall-current">13.9 元</span>'
      +     '<span class="paywall-one-time" style="display:block;font-size:10px;color:var(--text-dim);margin-top:2px">一次付费，永久解锁，可下载完整合盘报告</span>'
      +   '</div>'
      +   '<button class="paywall-btn" onclick="startHePanPay()">解锁合盘报告</button>'
      +   '<button class="paywall-btn-check" id="hepanCheckBtnManual" onclick="checkHePanPaymentManually()" style="display:none;margin-top:14px">我已付过款，刷新状态</button>'
      +   '<div class="paywall-tip" id="hepanPaywallTip" style="display:none;margin-top:8px"></div>'
      + '</div>';
    body.classList.add('paywall-active');
    body.appendChild(overlay);
  });
}

// ---- 隐藏所有遮罩 ----
function hideHePanPaywall() {
  HEPAN_PAID_DRAWERS.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var overlays = el.querySelectorAll('.paywall-overlay');
    overlays.forEach(function(o) { o.remove(); });
    var bodies = el.querySelectorAll('.drawer-body');
    bodies.forEach(function(b) { b.classList.remove('paywall-active'); });
  });
}

// ---- 显示下载按钮 ----
function showHePanDownloadBtn() {
  var scoreEl = document.getElementById('scoreBanner');
  if (!scoreEl) return;
  if (scoreEl.querySelector('.hp-download-btn')) return;

  var btn = document.createElement('div');
  btn.className = 'hp-download-btn';
  btn.style.cssText = 'margin-top:16px';
  btn.innerHTML = '<button onclick="downloadHePanReport()" style="display:inline-block;padding:10px 28px;background:rgba(100,180,140,.12);border:1px solid rgba(100,180,140,.25);color:#7ec87e;font-size:14px;font-weight:600;border-radius:8px;cursor:pointer;letter-spacing:2px;font-family:inherit">📥 下载合盘报告 PDF</button>';
  scoreEl.appendChild(btn);
}

// ---- 开始支付 ----
function startHePanPay() {
  if (_hepanOrderId) return;

  var allBtns = document.querySelectorAll('.paywall-btn');
  allBtns.forEach(function(b) { b.disabled = true; b.textContent = '创建订单中...'; });

  fetch(HEPAN_API_BASE + '/create-order.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 13.9,
      description: '知时合盘报告解锁',
      hash: _hepanHash
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data && data.orderId) {
      _hepanOrderId = data.orderId;
      var qrSrc = data.qrcode || data.payUrl || '';
      var tip = document.getElementById('hepanPaywallTip');
      if (tip && qrSrc) {
        tip.style.display = 'block';
        tip.innerHTML = ''
          + '<div class="payqr-box" style="margin-top:16px;text-align:center">'
          + '<img src="' + qrSrc + '" id="hepanQRCode" style="width:180px;height:180px;border-radius:12px;border:1px solid rgba(255,255,255,.08)" alt="扫码支付">'
          + '<div class="payqr-tip" style="margin-top:10px;font-size:12px;color:rgba(180,170,150,.5)">支付完成后将自动解锁全部内容</div>'
          + '</div>';
      } else if (tip) {
        tip.style.display = 'block';
        tip.textContent = '订单已创建，请刷新页面查看' + (data.payUrl ? '：' + data.payUrl : '');
      }
      var checkBtn = document.getElementById('hepanCheckBtnManual');
      if (checkBtn) checkBtn.style.display = 'block';

      // 更新所有按钮文字
      var allBtns = document.querySelectorAll('.paywall-btn');
      allBtns.forEach(function(b) { b.textContent = '请支付 13.9 元'; });
      startHePanPolling();
    } else {
      failHePanPay(data && data.error ? data.error : '创建订单失败，请稍后重试');
    }
  })
  .catch(function(e) {
    console.error('[hepan-pay] create-order failed', e);
    failHePanPay('网络错误，请稍后重试');
  });
}

function failHePanPay(msg) {
  var allBtns = document.querySelectorAll('.paywall-btn');
  allBtns.forEach(function(b) { b.disabled = false; b.textContent = '解锁合盘报告'; });
  var tip = document.getElementById('hepanPaywallTip');
  if (tip) { tip.style.display = 'block'; tip.textContent = msg; }
}

// ---- 轮询支付状态 ----
function startHePanPolling() {
  stopHePanPolling();
  _hepanPollTimer = setInterval(function() {
    if (!_hepanOrderId) return;
    fetch(HEPAN_API_BASE + '/check-order.js?orderId=' + _hepanOrderId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.paid) {
          stopHePanPolling();
          var token = data.token || data.transactionId || _hepanOrderId;
          saveHePanState({ token: token, hepanHash: _hepanHash });
          hideHePanPaywall();
          showHePanDownloadBtn();
        }
      })
      .catch(function() { /* 忽略轮询错误 */ });
  }, HEPAN_POLL_INTERVAL);
}

function stopHePanPolling() {
  if (_hepanPollTimer) { clearInterval(_hepanPollTimer); _hepanPollTimer = null; }
}

// ---- 手动检查支付 ----
function checkHePanPaymentManually() {
  if (!_hepanOrderId) { return; }
  var tip = document.getElementById('hepanPaywallTip');
  fetch(HEPAN_API_BASE + '/check-order.js?orderId=' + _hepanOrderId)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.paid) {
        stopHePanPolling();
        var token = data.token || data.transactionId || _hepanOrderId;
        saveHePanState({ token: token, hepanHash: _hepanHash });
        hideHePanPaywall();
        showHePanDownloadBtn();
        if (tip) { tip.style.display = 'block'; tip.textContent = '✓ 支付成功！已解锁合盘报告'; }
      } else {
        if (tip) { tip.style.display = 'block'; tip.textContent = '尚未收到支付，请确认微信已支付成功'; }
      }
    })
    .catch(function() {
      if (tip) { tip.style.display = 'block'; tip.textContent = '网络错误，请稍后重试'; }
    });
}

// ---- 验证 Token 并解锁 ----
function verifyHePanAndUnlock(token) {
  fetch(HEPAN_API_BASE + '/verify-token.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, baziHash: _hepanHash })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data && data.valid) {
      hideHePanPaywall();
      showHePanDownloadBtn();
    } else {
      clearHePanSaved();
      showHePanPaywall();
    }
  })
  .catch(function() {
    // 网络不可用时，使用本地状态
    hideHePanPaywall();
    showHePanDownloadBtn();
  });
}

// ---- Storage ----
function readHePanSaved() {
  try {
    var raw = localStorage.getItem(HEPAN_PAYWALL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function saveHePanState(obj) {
  try {
    localStorage.setItem(HEPAN_PAYWALL_KEY, JSON.stringify(obj));
  } catch(e) {}
}

function clearHePanSaved() {
  try {
    localStorage.removeItem(HEPAN_PAYWALL_KEY);
  } catch(e) {}
}
