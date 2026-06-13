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
  if (_hepanOrderId) {
    // 已有订单，弹窗提示
    showHePanQrModal(null, 13.9, true);
    return;
  }

  var allBtns = document.querySelectorAll('.paywall-btn');
  allBtns.forEach(function(b) { b.disabled = true; b.textContent = '创建订单中...'; });

  console.log('[hepan-pay] 开始创建订单, hash=' + _hepanHash);

  fetch(HEPAN_API_BASE + '/create-order.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 13.9,
      description: '知时合盘报告解锁',
      hash: _hepanHash
    })
  })
  .then(function(r) {
    console.log('[hepan-pay] API response status:', r.status);
    return r.json();
  })
  .then(function(data) {
    console.log('[hepan-pay] API data:', JSON.stringify(data));
    if (data && data.orderId) {
      _hepanOrderId = data.orderId;
      var qrSrc = data.qrcode || data.payUrl || '';

      if (qrSrc) {
        showHePanQrModal(qrSrc, 13.9, false);
      } else {
        showHePanQrModal(null, 13.9, false);
      }

      var allBtns = document.querySelectorAll('.paywall-btn');
      allBtns.forEach(function(b) { b.disabled = false; b.textContent = '已下单，扫码支付'; });
      startHePanPolling();
    } else {
      var errMsg = (data && data.error) ? data.error : '创建订单失败，请刷新页面重试';
      failHePanPay(errMsg);
    }
  })
  .catch(function(e) {
    console.error('[hepan-pay] create-order 异常:', e.message || e);
    failHePanPay('网络异常，请检查网络连接后重试');
  });
}

function failHePanPay(msg) {
  alert('支付提示：' + msg);
  var allBtns = document.querySelectorAll('.paywall-btn');
  allBtns.forEach(function(b) { b.disabled = false; b.textContent = '解锁合盘报告'; });
}

// ---- 二维码弹窗 ----
function showHePanQrModal(qrUrl, amount, isReopen) {
  hideHePanQrModal();

  var qrImgSrc = qrUrl;
  if (!qrUrl) {
    // 没拿到二维码 URL：用 qrserver API 把 payurl 转成二维码
    // 或者显示文字提示
    qrImgSrc = '';
  }
  // 如果已经是图片 URL，用 quickchart 生成标准二维码
  if (qrUrl && qrUrl.indexOf('http') === 0) {
    qrImgSrc = 'https://api.quickchart.io/qr?size=220&text=' + encodeURIComponent(qrUrl);
  }

  var modal = document.createElement('div');
  modal.id = 'hepanQrModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = ''
    + '<div style="position:absolute;inset:0;background:rgba(0,0,0,.7)" onclick="closeHePanQrModal()"></div>'
    + '<div style="position:relative;background:linear-gradient(180deg,#1a1a2e,#0f0f18);border:1px solid rgba(201,168,76,.18);border-radius:18px;padding:32px 28px 24px;width:90%;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
    +   '<div style="position:absolute;top:14px;right:18px;font-size:22px;color:rgba(255,255,255,.25);cursor:pointer;line-height:1" onclick="closeHePanQrModal()">✕</div>'
    +   '<div style="font-family:\'STKaiti\',\'KaiTi\',serif;font-size:20px;color:#e0c860;letter-spacing:4px;margin-bottom:6px">扫码支付</div>'
    +   '<div style="font-size:28px;color:#e0c860;font-weight:900;letter-spacing:2px;margin-bottom:16px">￥' + amount + '</div>'
    +   (qrImgSrc ? '<img src="' + qrImgSrc + '" style="width:200px;height:200px;border-radius:12px;border:1px solid rgba(255,255,255,.08);margin-bottom:14px" alt="支付二维码" onerror="this.outerHTML=\'<div style=\\\'width:200px;height:200px;margin:0 auto 14px;line-height:200px;color:rgba(200,180,120,.3);font-size:13px\\\'>二维码生成中，请稍后重试</div>\'">' : '<div style="width:200px;height:200px;margin:0 auto 14px;line-height:200px;color:rgba(200,180,120,.3);font-size:13px;border:1px dashed rgba(255,255,255,.06);border-radius:12px">二维码加载中…</div>')
    +   '<div style="font-size:12px;color:rgba(180,170,150,.5);margin-bottom:12px">支付完成后将自动解锁全部合盘内容</div>'
    +   '<button onclick="closeHePanQrModal(); checkHePanPaymentManually()" style="display:inline-block;padding:8px 24px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);color:#c9a84c;font-size:13px;border-radius:8px;cursor:pointer;letter-spacing:2px">我已付过款，刷新状态</button>'
    + '</div>';
  document.body.appendChild(modal);
}

function closeHePanQrModal() {
  var modal = document.getElementById('hepanQrModal');
  if (modal) modal.remove();
}

function hideHePanQrModal() {
  closeHePanQrModal();
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
          closeHePanQrModal();
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
  console.log('[hepan-pay] 手动检查订单:', _hepanOrderId);
  fetch(HEPAN_API_BASE + '/check-order.js?orderId=' + _hepanOrderId)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      console.log('[hepan-pay] 检查结果:', JSON.stringify(data));
      if (data && data.paid) {
        stopHePanPolling();
        var token = data.token || data.transactionId || _hepanOrderId;
        saveHePanState({ token: token, hepanHash: _hepanHash });
        hideHePanPaywall();
        showHePanDownloadBtn();
        closeHePanQrModal();
      } else {
        alert('尚未收到支付确认，请确认已完成扫码付款后再试。');
      }
    })
    .catch(function() {
      alert('网络错误，请稍后重试');
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
