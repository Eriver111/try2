/**
 * 付费遮罩层逻辑
 * 付费板块: 今年运势, 婚姻感情, 财运分析, 学业分析, 近五年流年运势
 * 遮罩只盖内容区（drawer-body），标题栏可见。
 * 所有付费板块一次性解锁，9.9 元。
 */
const PAID_SECTIONS=['thisYearSection','marriageSection','wealthSection','studySection','fortuneSection'];
const SECTION_TITLES={thisYearSection:'今年运势',marriageSection:'婚姻感情',wealthSection:'财运分析',studySection:'学业分析',fortuneSection:'近五年流年运势'};
const PAYWALL_STATE_KEY='bazi_paywall';
const API_BASE='/api';
const POLL_INTERVAL=3000;
let _orderId=null,_baziHash=null,_pollTimer=null;

function initPaywall(baziParams){_baziHash=hashParams(baziParams);var saved=readSaved();if(saved&&saved.baziHash===_baziHash)verifyAndUnlock(saved.token);else showPaywall();}

function showPaywall(){PAID_SECTIONS.forEach(function(id){var el=document.getElementById(id);if(!el)return;var body=el.querySelector('.drawer-body');if(!body)return;if(body.querySelector('.paywall-overlay'))return;el.classList.add('drawer-open');var arrow=el.querySelector('.drawer-arrow');if(arrow)arrow.style.transform='rotate(90deg)';var title=SECTION_TITLES[id]||'付费内容';var overlay=document.createElement('div');overlay.className='paywall-overlay';overlay.innerHTML='<div class="paywall-card"><div class="paywall-card-title">'+title+'</div><div class="paywall-card-sub">以下内容需付费解锁后查看</div><div class="paywall-price" style="margin-top:18px;margin-bottom:14px"><span class="paywall-current">9.9 元</span><span class="paywall-one-time" style="display:block;font-size:10px;color:var(--text-dim);margin-top:2px">一次付费，全部板块永久解锁（7天内）</span></div><button class="paywall-btn" onclick="startPay()">解锁全部内容</button><div class="paywall-tip" id="paywallTip" style="display:none;margin-top:8px"></div></div>';body.classList.add('paywall-active');body.appendChild(overlay);});}

function hidePaywall(){hideQrModal();PAID_SECTIONS.forEach(function(id){var el=document.getElementById(id);if(!el)return;var body=el.querySelector('.drawer-body');if(!body)return;var ov=body.querySelector('.paywall-overlay');if(ov)ov.remove();body.classList.remove('paywall-active');});}

function startPay(){var allBtns=document.querySelectorAll('.paywall-btn');allBtns.forEach(function(b){b.disabled=true;b.textContent='创建订单中...';});var params=getBaziParamsFromURL();fetch(API_BASE+'/create-order.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year:params.year,month:params.month,day:params.day,hour:params.hour,gender:params.gender,amount:9.9})}).then(function(r){return r.json();}).then(function(data){if(data.error){allBtns.forEach(function(b){b.disabled=false;b.textContent='创建失败，请重试';});showTip('创建订单失败: '+data.error);return;}_orderId=data.orderId;allBtns.forEach(function(b){b.textContent='等待支付...';});showQrModal(data.qrcode||data.payUrl,data.amount);startPolling();}).catch(function(e){allBtns.forEach(function(b){b.disabled=false;b.textContent='网络错误，请重试';});showTip('网络错误，请刷新重试');});}

function startPolling(){stopPolling();_pollTimer=setInterval(function(){fetch(API_BASE+'/check-order.js?orderId='+_orderId).then(function(r){return r.json();}).then(function(data){if(data.status==='paid'&&data.token){stopPolling();onPaymentSuccess(data.token);}}).catch(function(){});},POLL_INTERVAL);}
function stopPolling(){if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}}
function onPaymentSuccess(token){saveToken(token,_baziHash);hidePaywall();if(typeof renderPaidContent==='function')renderPaidContent();}

function showQrModal(qrUrl,amount){hideQrModal();var qrImgSrc='https://api.quickchart.io/qr?size=200&text='+encodeURIComponent(qrUrl);var modal=document.createElement('div');modal.id='payQrModal';modal.innerHTML='<div class="payqr-backdrop" onclick="closeQrModal()"></div><div class="payqr-dialog"><div class="payqr-close" onclick="closeQrModal()">✕</div><div class="payqr-title">扫码支付 '+amount+' 元</div><div class="payqr-sub">微信 / 支付宝 均可扫码</div><img class="payqr-img" src="'+qrImgSrc+'" alt="支付二维码" /><div class="payqr-tip">支付完成后将自动解锁全部内容</div></div>';document.body.appendChild(modal);}
function hideQrModal(){var old=document.getElementById('payQrModal');if(old)old.remove();}
function closeQrModal(){hideQrModal();stopPolling();var allBtns=document.querySelectorAll('.paywall-btn');allBtns.forEach(function(b){b.disabled=false;b.textContent='解锁全部内容';});}

function verifyAndUnlock(token){fetch(API_BASE+'/verify-token.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token,baziHash:_baziHash})}).then(function(r){return r.json();}).then(function(data){if(data.valid){hidePaywall();if(typeof renderPaidContent==='function')renderPaidContent();}else{clearSaved();showPaywall();}}).catch(function(){showPaywall();});}
function showTip(msg){var tip=document.getElementById('paywallTip');if(tip){tip.style.display='block';tip.textContent=msg;}}

function saveToken(token,hash){var obj={token:token,baziHash:hash,savedAt:Date.now()};try{localStorage.setItem(PAYWALL_STATE_KEY,JSON.stringify(obj));}catch(e){}}
function readSaved(){try{var raw=localStorage.getItem(PAYWALL_STATE_KEY);if(!raw)return null;var obj=JSON.parse(raw);if(Date.now()-obj.savedAt>7*86400000){localStorage.removeItem(PAYWALL_STATE_KEY);return null;}return obj;}catch(e){return null;}}
function clearSaved(){try{localStorage.removeItem(PAYWALL_STATE_KEY);}catch(e){}}

function hashParams(p){var s=[p.year,p.month,p.day,p.hour,p.gender].join('|');var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return'bz_'+Math.abs(h).toString(36);}
function getBaziParamsFromURL(){var q=new URLSearchParams(window.location.search);return{year:parseInt(q.get('year')),month:parseInt(q.get('month')),day:parseInt(q.get('day')),hour:parseInt(q.get('hour')),gender:q.get('gender')};}
