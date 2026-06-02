/**
 * 结果页面 v3 - 大运流年联动四柱表格
 */

const SHI_CHEN_NAMES = [
    '子时','丑时','寅时','卯时','辰时','巳时',
    '午时','未时','申时','酉时','戌时','亥时'
];
const SHI_CHEN_TIMES = [
    '23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00',
    '07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00',
    '15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'
];
const POS_NAMES = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };

const WX_COLORS = {
    '金':'#FFD700','木':'#4CAF50','水':'#2196F3',
    '火':'#F44336','土':'#CD853F'
};

function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        year: parseInt(p.get('year')),
        month: parseInt(p.get('month')),
        day: parseInt(p.get('day')),
        hour: parseInt(p.get('hour')),
        gender: p.get('gender')
    };
}

// ==================== 全局状态 ====================
let _daYunData = null;
let _dayGan = null;
let _bazi = null;
let _currentDaYunIndex = -1;
let _currentLiuNianIndex = -1;
let _nativeShenSha = [];  // 四柱神煞
let _dayunShenSha = [];   // 大运柱神煞
let _liunianShenSha = []; // 流年柱神煞
let _params = null;       // URL参数（供后续函数使用）

// ==================== 主渲染 ====================
function render(data) {
    const bazi = data.bazi;
    const dayGan = bazi.day.gan;
    const currentYear = new Date().getFullYear();

    // 顶部信息
    document.getElementById('genderLabel').textContent = bazi.gender === 'male' ? '乾造' : '坤造';
    document.getElementById('birthDateText').textContent =
        `${bazi.birthDate.year}年${bazi.birthDate.month}月${bazi.birthDate.day}日`;
    document.getElementById('birthHourText').textContent =
        `${SHI_CHEN_NAMES[bazi.birthDate.hour]}（${SHI_CHEN_TIMES[bazi.birthDate.hour]}）`;
    document.getElementById('nayinText').textContent = bazi.naYin;

    // 大运
    renderDaYun(data.daYun, dayGan, currentYear);

    // 流年（默认显示当前大运的流年）
    const currentDaYun = data.daYun.list.find(dy =>
        currentYear >= dy.startYear && currentYear <= dy.endYear
    ) || data.daYun.list[0];
    const currentDaYunIdx = data.daYun.list.indexOf(currentDaYun);
    _currentDaYunIndex = currentDaYunIdx;

    // 当前年份在流年中的索引
    const liuNianList = window.BaZiCalculator.calculateLiuNian(currentDaYun, dayGan);
    const currentLnIdx = liuNianList.findIndex(ln => ln.year === currentYear);
    _currentLiuNianIndex = currentLnIdx >= 0 ? currentLnIdx : 0;

    renderLiuNian(currentDaYun, dayGan, currentYear);

    // 四柱排盘（固定四柱）
    renderSiZhu(bazi, dayGan);

    // 更新表格中的大运/流年列
    updateDayunColumn(currentDaYunIdx);
    updateLiuNianColumn(currentDaYun, _currentLiuNianIndex);

    // 神煞
    _nativeShenSha = data.shenSha;
    _dayunShenSha = [];
    _liunianShenSha = [];
    renderShenSha();
    // 有神煞时自动展开抽屉
    if (data.shenSha.length > 0) {
        document.getElementById('shenshaDetailSection').classList.add('drawer-open');
    }

    // 五行
    renderWuXing(bazi.wuXingCount);
    document.getElementById('wuxingSection').classList.add('drawer-open');

    // 袁天罡称骨
    renderChengGu(bazi, _params.month, _params.day);
    document.getElementById('chengguSection').classList.add('drawer-open');

    // 真太阳时
    renderSolarTime(_params.year, _params.month, _params.day, _params.hour);

    // 日主解析 · 滴天髓
    renderRiZhuJieXi(bazi.day.gan);
    document.getElementById('rizhuSection').classList.add('drawer-open');

    // 夫妻宫
    renderFuQi(bazi);
    document.getElementById('fuqiSection').classList.add('drawer-open');

    // 配偶年龄
    renderSpouseAge(bazi, _params.gender);
    document.getElementById('spouseAgeSection').classList.add('drawer-open');

    // 父母关系
    renderParents(bazi, _params.gender);
    document.getElementById('parentsSection').classList.add('drawer-open');

    // 日主性格
    renderCharacter(bazi);
    document.getElementById('characterSection').classList.add('drawer-open');

    // 财运分析
    renderWealth(bazi, _params.gender);
    document.getElementById('wealthSection').classList.add('drawer-open');

    // 流年运势
    renderFortune(bazi, _params.gender);
    document.getElementById('fortuneSection').classList.add('drawer-open');

    // 学业分析
    renderStudy(bazi);
    document.getElementById('studySection').classList.add('drawer-open');
}

// ==================== 大运渲染 ====================
function renderDaYun(daYunData, dayGan, currentYear) {
    const table = document.getElementById('dayunTable');
    const dirLabel = daYunData.isForward ? '顺行' : '逆行';
    document.getElementById('dayunDirection').textContent =
        `${dirLabel} · ${daYunData.qiYunAge}岁起运`;

    let html = '';
    daYunData.list.forEach((dy, i) => {
        const isCurrent = currentYear >= dy.startYear && currentYear <= dy.endYear;
        const isPast = currentYear > dy.endYear;
        const cls = isCurrent ? 'current' : (isPast ? 'past' : '');
        const ss = window.BaZiCalculator.getShiShen(dayGan, dy.gan);

        html += `
        <div class="dayun-col ${cls}" data-index="${i}"
             onclick="showLiuNian(${i})">
            <div class="dayun-age">${dy.displayAge}岁</div>
            <div class="dayun-gz">${dy.gan}${dy.zhi}</div>
            <div class="dayun-ss">${ss}</div>
        </div>`;
    });
    table.innerHTML = html;

    // 高亮当前大运
    setTimeout(() => {
        const currentCol = table.querySelector('.current');
        if (currentCol) {
            currentCol.classList.add('active');
            currentCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 300);
}

// ==================== 流年渲染 ====================
function showLiuNian(daYunIndex) {
    if (!_daYunData || !_dayGan) return;
    const dy = _daYunData.list[daYunIndex];
    const currentYear = new Date().getFullYear();

    // 高亮选中的大运
    document.querySelectorAll('.dayun-col').forEach((col, i) => {
        col.classList.toggle('active', i === daYunIndex);
    });

    _currentDaYunIndex = daYunIndex;
    _currentLiuNianIndex = -1; // 重置流年选中

    renderLiuNian(dy, _dayGan, currentYear);

    // 更新表格中的大运列
    updateDayunColumn(daYunIndex);

    // 清空流年列（等待用户点击流年）
    clearLiuNianColumn();
}

function renderLiuNian(daYunItem, dayGan, currentYear) {
    const table = document.getElementById('liunianTable');
    document.getElementById('liunianRange').textContent =
        `${daYunItem.startYear}-${daYunItem.endYear}年（${daYunItem.displayAge}岁）`;

    const liuNianList = window.BaZiCalculator.calculateLiuNian(daYunItem, dayGan);

    let html = '';
    liuNianList.forEach((ln, i) => {
        const isCurrent = ln.year === currentYear;
        const isPast = ln.year < currentYear;
        const cls = isCurrent ? 'current-year' : (isPast ? 'past-year' : '');

        html += `
        <div class="liunian-col ${cls}" data-index="${i}"
             onclick="selectLiuNian(${i})">
            <div class="liunian-year-label">${ln.year}年</div>
            <div class="liunian-gz">${ln.gan}${ln.zhi}</div>
            <div class="liunian-ss">${ln.shiShen}</div>
        </div>`;
    });
    table.innerHTML = html;

    // 滚动到当前年份
    setTimeout(() => {
        const cur = table.querySelector('.current-year');
        if (cur) {
            cur.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            // 自动选中当前年份
            const idx = parseInt(cur.getAttribute('data-index'));
            selectLiuNian(idx);
        }
    }, 200);
}

// 点击流年 - 更新表格中的流年列
function selectLiuNian(liuNianIndex) {
    if (!_daYunData || !_dayGan) return;
    const daYunItem = _daYunData.list[_currentDaYunIndex];
    if (!daYunItem) return;

    _currentLiuNianIndex = liuNianIndex;

    // 高亮选中的流年
    document.querySelectorAll('.liunian-col').forEach((col, i) => {
        col.classList.toggle('active-ln', i === liuNianIndex);
    });

    // 更新表格中的流年列
    updateLiuNianColumn(daYunItem, liuNianIndex);
}

// ==================== 四柱排盘渲染（固定四柱部分） ====================
function renderSiZhu(bazi, dayGan) {
    const positions = ['year', 'month', 'day', 'hour'];

    positions.forEach(pos => {
        const pillar = bazi[pos];

        // 天干
        const ganEl = document.getElementById(`gan-${pos}`);
        ganEl.textContent = pillar.gan;
        ganEl.style.color = WX_COLORS[pillar.wuXing.gan];

        // 地支
        const zhiEl = document.getElementById(`zhi-${pos}`);
        zhiEl.textContent = pillar.zhi;
        zhiEl.style.color = WX_COLORS[pillar.wuXing.zhi];

        // 十神 - 天干
        if (pos !== 'day') {
            document.getElementById(`ss-${pos}-gan`).textContent = pillar.shiShen.gan;
        }

        // 十神 - 地支
        if (pos !== 'day') {
            document.getElementById(`ss-${pos}-zhi`).textContent = pillar.shiShen.zhi;
        }

        // 藏干（含十神）：列内竖排 "甲\n食神"  "丙\n比肩"  "戊\n偏财"
        const cangEl = document.getElementById(`cang-${pos}`);
        const cangItems = pillar.cangGan.map(gan => {
            const wx = window.BaZiCalculator.WU_XING[gan];
            const ss = (pos === 'day' && gan === dayGan) ? '日主' : window.BaZiCalculator.getShiShen(dayGan, gan);
            return `<div class="cang-entry"><span class="cang-gan-char" style="color:${WX_COLORS[wx]}">${gan}</span><span class="cang-ss-text">${ss}</span></div>`;
        });
        cangEl.innerHTML = cangItems.join('');
    });
}

// ==================== 表格大运列更新 ====================
function updateDayunColumn(daYunIndex) {
    if (!_daYunData || !_dayGan) return;
    const dy = _daYunData.list[daYunIndex];
    if (!dy) return;

    // 获取所有大运列元素
    const dayunCols = document.querySelectorAll('.pp-dayun-col');

    // 添加/移除高亮
    dayunCols.forEach(col => {
        col.classList.add('active-dayun');
    });

    // 天干
    const ganEl = document.getElementById('gan-dayun');
    ganEl.textContent = dy.gan;
    const dyWxGan = window.BaZiCalculator.WU_XING[dy.gan];
    ganEl.style.color = WX_COLORS[dyWxGan];

    // 地支
    const zhiEl = document.getElementById('zhi-dayun');
    zhiEl.textContent = dy.zhi;
    const dyWxZhi = window.BaZiCalculator.DI_ZHI_WU_XING[dy.zhi];
    zhiEl.style.color = WX_COLORS[dyWxZhi];

    // 十神（天干）
    const ssGanEl = document.getElementById('ss-dayun-gan');
    ssGanEl.innerHTML = `<span class="pp-ss-text">${window.BaZiCalculator.getShiShen(_dayGan, dy.gan)}</span>`;

    // 十神（地支）- 用藏干本气
    const cangGan = window.BaZiCalculator.getCangGan(dy.zhi);
    const ssZhiEl = document.getElementById('ss-dayun-zhi');
    ssZhiEl.innerHTML = `<span class="pp-ss-text">${window.BaZiCalculator.getShiShen(_dayGan, cangGan[0])}</span>`;

    // 藏干（含十神）
    const cangEl = document.getElementById('cang-dayun');
    const cangItems = cangGan.map(gan => {
        const wx = window.BaZiCalculator.WU_XING[gan];
        const ss = window.BaZiCalculator.getShiShen(_dayGan, gan);
        return `<div class="cang-entry"><span class="cang-gan-char" style="color:${WX_COLORS[wx]}">${gan}</span><span class="cang-ss-text">${ss}</span></div>`;
    });
    cangEl.innerHTML = cangItems.join('');

    // 神煞 - 计算大运柱的神煞
    updateColumnShenSha('dayun', dy);
}

// ==================== 表格流年列更新 ====================
function updateLiuNianColumn(daYunItem, liuNianIndex) {
    if (!_daYunData || !_dayGan) return;

    const liuNianList = window.BaZiCalculator.calculateLiuNian(daYunItem, _dayGan);
    const ln = liuNianList[liuNianIndex];
    if (!ln) return;

    // 高亮流年列
    const liunianCols = document.querySelectorAll('.pp-liunian-col');
    liunianCols.forEach(col => {
        col.classList.add('active-liunian');
    });

    // 天干
    const ganEl = document.getElementById('gan-liunian');
    ganEl.textContent = ln.gan;
    const lnWxGan = window.BaZiCalculator.WU_XING[ln.gan];
    ganEl.style.color = WX_COLORS[lnWxGan];

    // 地支
    const zhiEl = document.getElementById('zhi-liunian');
    zhiEl.textContent = ln.zhi;
    const lnWxZhi = window.BaZiCalculator.DI_ZHI_WU_XING[ln.zhi];
    zhiEl.style.color = WX_COLORS[lnWxZhi];

    // 十神（天干）
    const ssGanEl = document.getElementById('ss-liunian-gan');
    ssGanEl.innerHTML = `<span class="pp-ss-text">${ln.shiShen}</span>`;

    // 十神（地支）- 用藏干本气
    const cangGan = window.BaZiCalculator.getCangGan(ln.zhi);
    const ssZhiEl = document.getElementById('ss-liunian-zhi');
    ssZhiEl.innerHTML = `<span class="pp-ss-text">${window.BaZiCalculator.getShiShen(_dayGan, cangGan[0])}</span>`;

    // 藏干（含十神）
    const cangEl = document.getElementById('cang-liunian');
    const cangItems = cangGan.map(gan => {
        const wx = window.BaZiCalculator.WU_XING[gan];
        const ss = window.BaZiCalculator.getShiShen(_dayGan, gan);
        return `<div class="cang-entry"><span class="cang-gan-char" style="color:${WX_COLORS[wx]}">${gan}</span><span class="cang-ss-text">${ss}</span></div>`;
    });
    cangEl.innerHTML = cangItems.join('');

    // 神煞 - 计算流年柱的神煞
    updateColumnShenSha('liunian', ln);
}

// 清空流年列
function clearLiuNianColumn() {
    const liunianCols = document.querySelectorAll('.pp-liunian-col');
    liunianCols.forEach(col => col.classList.remove('active-liunian'));

    document.getElementById('gan-liunian').textContent = '—';
    document.getElementById('gan-liunian').style.color = 'var(--text-dim)';
    document.getElementById('zhi-liunian').textContent = '—';
    document.getElementById('zhi-liunian').style.color = 'var(--text-dim)';
    document.getElementById('ss-liunian-gan').innerHTML = '<span style="color:var(--text-dim)">—</span>';
    document.getElementById('ss-liunian-zhi').innerHTML = '<span style="color:var(--text-dim)">—</span>';
    document.getElementById('cang-liunian').innerHTML = '<span style="color:var(--text-dim)">—</span>';
    document.getElementById('shensha-liunian').innerHTML = '<span style="color:var(--text-dim)">—</span>';

    // 清空流年神煞并刷新
    _liunianShenSha = [];
    refreshShenShaDetail();
}

// ==================== 列神煞计算 ====================
function updateColumnShenSha(colType, pillarData) {
    const el = document.getElementById(`shensha-${colType}`);
    if (!el || !_bazi) return;

    const PI = pillarData;
    const pGanIdx = PI.ganIndex !== undefined ? PI.ganIndex : window.BaZiCalculator.TIAN_GAN.indexOf(PI.gan);
    const pZhiIdx = PI.zhiIndex !== undefined ? PI.zhiIndex : window.BaZiCalculator.DI_ZHI.indexOf(PI.zhi);
    const pPillar = { gan: PI.gan, zhi: PI.zhi, ganIndex: pGanIdx, zhiIndex: pZhiIdx };

    // 方法1：虚拟bazi，大运/流年放hour位置 → 查年/月/日支相关的神煞
    const virtualBazi = {
        year: _bazi.year, month: _bazi.month, day: _bazi.day,
        hour: pPillar, gender: _bazi.gender
    };
    const all1 = window.BaZiCalculator.calculateShenSha(virtualBazi);
    const dayunShenSha1 = all1.filter(ss => ss.positions.includes('hour'));

    // 方法2：虚拟bazi，大运/流年放day位置 → 查空亡等日柱相关神煞
    const virtualBazi2 = {
        year: _bazi.year, month: _bazi.month,
        day: pPillar,
        hour: _bazi.hour,
        gender: _bazi.gender
    };
    // 只取空亡（它用日柱计算旬空）
    const all2 = window.BaZiCalculator.calculateShenSha(virtualBazi2);
    const dayunShenSha2 = all2.filter(ss => ss.name === '空亡' && ss.positions.includes('day'));

    // 合并去重（按name去重）
    const merged = [...dayunShenSha1];
    dayunShenSha2.forEach(ss => {
        if (!merged.find(m => m.name === ss.name)) {
            merged.push(ss);
        }
    });

    // 重命名position
    const posNameMap = { dayun: '大运', liunian: '流年' };
    const renamed = merged.map(ss => ({
        ...ss,
        positions: [colType],
        posText: `见于${posNameMap[colType]}`
    }));

    // 存储
    if (colType === 'dayun') { _dayunShenSha = renamed; }
    else { _liunianShenSha = renamed; }

    // 填充表格单元格
    if (merged.length === 0) {
        el.innerHTML = '<span style="color:var(--text-dim)">—</span>';
    } else {
        el.innerHTML = merged.map(ss =>
            `<span class="shensha-tag ${ss.type}">${ss.name}</span>`
        ).join('');
    }

    // 刷新神煞详解
    refreshShenShaDetail();
}

// ==================== 神煞渲染 ====================
function renderShenSha() {
    // 1. 在四柱表格中显示神煞标签（仅用原生四柱神煞）
    const posMap = { year: [], month: [], day: [], hour: [] };
    _nativeShenSha.forEach(ss => {
        ss.positions.forEach(pos => {
            posMap[pos].push({ name: ss.name, type: ss.type });
        });
    });

    ['year', 'month', 'day', 'hour'].forEach(pos => {
        const el = document.getElementById(`shensha-${pos}`);
        if (posMap[pos].length === 0) {
            el.innerHTML = '<span style="color:var(--text-dim)">—</span>';
        } else {
            el.innerHTML = posMap[pos].map(ss =>
                `<span class="shensha-tag ${ss.type}">${ss.name}</span>`
            ).join('');
        }
    });

    // 2. 刷新折叠面板
    refreshShenShaDetail();
}

// 合并所有神煞（四柱+大运+流年）并更新accordion
function refreshShenShaDetail() {
    const section = document.getElementById('shenshaDetailSection');
    const accordion = document.getElementById('shenshaAccordion');
    const countEl = document.getElementById('shenshaCount');

    // 合并所有神煞：四柱 + 大运 + 流年
    const allList = [..._nativeShenSha, ..._dayunShenSha, ..._liunianShenSha];

    if (allList.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    section.classList.add('drawer-open');
    countEl.textContent = `（共${allList.length}个）`;

    // 按类型排序：吉神 > 中性 > 凶煞
    const typeOrder = { 'ji-shen': 0, 'zhong': 1, 'ji': 2 };
    const sorted = [...allList].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    const typeLabels = { 'ji-shen': '吉神', 'zhong': '中性', 'ji': '凶煞' };
    const groupNames = { 'ji-shen': '吉神', 'zhong': '中性', 'ji': '凶煞' };

    let html = '';
    let lastType = '';

    sorted.forEach((ss, index) => {
        if (ss.type !== lastType) {
            html += `<div class="ss-group-header">${groupNames[ss.type]}</div>`;
            lastType = ss.type;
        }

        html += `
        <div class="ss-accordion-item" data-index="${index}">
            <div class="ss-accordion-header" onclick="toggleAccordion(this)">
                <span class="ss-accordion-arrow">▶</span>
                <span class="ss-accordion-type-badge ${ss.type}">${typeLabels[ss.type]}</span>
                <span class="ss-accordion-name">${ss.name}</span>
                <span class="ss-accordion-pos">${ss.posText}</span>
            </div>
            <div class="ss-accordion-body">
                <div class="ss-accordion-content">${ss.desc}</div>
            </div>
        </div>`;
    });

    accordion.innerHTML = html;
}

// 折叠面板切换
function toggleAccordion(header) {
    const item = header.parentElement;
    const isOpen = item.classList.contains('open');

    // 关闭所有
    document.querySelectorAll('.ss-accordion-item.open').forEach(el => {
        el.classList.remove('open');
    });

    // 如果之前没打开，则打开当前
    if (!isOpen) {
        item.classList.add('open');
    }
}

// ==================== 五行渲染 ====================
function renderWuXing(wuXingCount) {
    const wxMap = { '金':'jin','木':'mu','水':'shui','火':'huo','土':'tu' };
    const maxCount = Math.max(...Object.values(wuXingCount), 1);

    Object.entries(wuXingCount).forEach(([wx, count]) => {
        const item = document.getElementById(`wx-${wxMap[wx]}`);
        item.setAttribute('data-wx', wx);
        item.querySelector('.wx-fill').style.width = `${(count / maxCount) * 100}%`;
        item.querySelector('.wx-num').textContent = count;
    });

    const sorted = Object.entries(wuXingCount).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const missing = sorted.filter(([_, c]) => c === 0);

    let text = `八字五行中【${strongest[0]}】最旺（${strongest[1]}个）`;
    if (missing.length > 0) {
        text += `，【${missing.map(([n]) => n).join('、')}】缺失`;
    } else {
        const weakest = sorted[sorted.length - 1];
        text += `，【${weakest[0]}】最弱（${weakest[1]}个）`;
    }
    document.getElementById('wuxingSummary').textContent = text;
}

// ==================== 袁天罡称骨 ====================
function renderChengGu(bazi, birthMonth, birthDay) {
    const cg = window.BaZiCalculator.calculateChengGu(bazi, birthMonth, birthDay);
    const el = document.getElementById('chengguContent');
    if (!el) return;

    const items = [
        { label: '年重', val: cg.breakdown.year },
        { label: '月重', val: cg.breakdown.month },
        { label: '日重', val: cg.breakdown.day },
        { label: '时重', val: cg.breakdown.hour }
    ];

    const weightHtml = items.map(it =>
        `<div class="cg-row"><span class="cg-label">${it.label}</span><span class="cg-value">${it.val}</span></div>`
    ).join('');

    const totalDisplay = cg.totalLiang + '.' + cg.totalQian;

    el.innerHTML = `
        <div class="cg-breakdown">${weightHtml}</div>
        <div class="cg-total">
            <span class="cg-total-weight">骨重 <strong>${cg.weightStr}</strong></span>
            <span class="cg-rate">
                ${totalDisplay < 3 ? '⚠ 骨轻' : totalDisplay < 5 ? '◆ 中等' : totalDisplay < 7 ? '★ 偏重' : '👑 极重'}
            </span>
        </div>
        <div class="cg-geyao">
            <div class="cg-geyao-header">
                <span class="cg-geyao-ming">${cg.geyao.ming}</span>
                <span class="cg-geyao-geju">— ${cg.geyao.geju}</span>
            </div>
            <div class="cg-geyao-duan">${cg.geyao.duan}</div>
        </div>
    `;
}

// ==================== 日主解析 · 滴天髓 ====================
function renderRiZhuJieXi(dayGan) {
    const dt = window.BaZiCalculator.DITIANSUI[dayGan];
    const el = document.getElementById('rizhuContent');
    if (!el || !dt) return;

    const wuXingNames = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
    const wx = wuXingNames[dayGan] || '';
    const wxColor = { '木': '#4CAF50', '火': '#F44336', '土': '#CD853F', '金': '#FFD700', '水': '#2196F3' };

    const jiexiItems = dt.jiexi.map(j => `
        <div class="dt-line">
            <span class="dt-ju">${j.ju}</span>
            <span class="dt-yi">${j.yi}</span>
        </div>
    `).join('');

    el.innerHTML = `
        <div class="dt-header">
            <span class="dt-badge" style="background:${wxColor[wx]}22;border-color:${wxColor[wx]};color:${wxColor[wx]}">
                ${dayGan}${wx} · 日主
            </span>
        </div>
        <div class="dt-shi">${dt.shi}</div>
        <div class="dt-divider">
            <span class="dt-divider-label">逐句解析</span>
        </div>
        <div class="dt-jiexi">${jiexiItems}</div>
        <div class="dt-yuanzhu">
            <div class="dt-yz-label">【原注】</div>
            <div class="dt-yz-text">${dt.yuanzhu}</div>
        </div>
    `;
}

// ==================== 夫妻宫渲染 ====================
function renderFuQi(bazi) {
    const pei = window.BaZiCalculator.analyzePei(bazi);
    const el = document.getElementById('fuqiContent');
    if (!el) return;

    const cangInfo = pei.cangGan.map((g) => {
        const wx = window.BaZiCalculator.WU_XING[g];
        return `<span class="fq-cang-gan" style="color:${WX_COLORS[wx] || '#b8a878'}">${g}</span>`;
    }).join('<span class="fq-cang-sep">·</span>');

    const posClass = { '正官':'fq-ji','七杀':'fq-ji','正印':'fq-ji','偏印':'fq-ji','食神':'fq-shang','伤官':'fq-shang','正财':'fq-cai','偏财':'fq-cai','比肩':'fq-bi','劫财':'fq-bi' };
    const cls = posClass[pei.mainSS] || 'fq-bi';

    el.innerHTML = `
        <div class="fq-header">
            <span class="fq-pillar-name">日柱</span>
            <span class="fq-pillar-gz">${bazi.day.gan}${bazi.day.zhi}</span>
        </div>
        <div class="fq-zhi-info">
            <span class="fq-label">地支藏干</span>
            <span class="fq-cang">${cangInfo}</span>
        </div>
        <div class="fq-ss-badge">
            夫妻宫十神：<strong class="fq-ss-tag ${cls}">${pei.mainSS}</strong>
        </div>
        <div class="fq-trait">
            <div class="fq-trait-icon">🏹</div>
            <div class="fq-trait-text">${pei.trait}</div>
        </div>
        <div class="fq-trait fq-looks">
            <div class="fq-trait-icon">👤</div>
            <div class="fq-trait-text">${pei.looks}</div>
        </div>
    `;
}

// ==================== 配偶年龄渲染 ====================
function renderSpouseAge(bazi, gender) {
    const pei = window.BaZiCalculator.analyzePei(bazi);
    const ageInfo = window.BaZiCalculator.calculateSpouseAge(bazi, pei.mainSS);
    const el = document.getElementById('spouseAgeContent');
    if (!el) return;

    const maxCount = Math.max(ageInfo.bigCount, ageInfo.smallCount, ageInfo.sameCount);
    const barW = (v) => maxCount > 0 ? Math.round(v / maxCount * 100) : 0;

    el.innerHTML = `
        <div class="sa-result">
            <span class="sa-badge">${ageInfo.result}</span>
            <span class="sa-desc">${ageInfo.desc}</span>
        </div>
        <div class="sa-bars">
            <div class="sa-bar-item">
                <span class="sa-bar-label">大十神<span class="sa-bar-sub">官杀·印星</span></span>
                <div class="sa-bar-track"><div class="sa-bar-fill sa-big" style="width:${barW(ageInfo.bigCount)}%"></div></div>
                <span class="sa-bar-num">${ageInfo.bigCount}</span>
            </div>
            <div class="sa-bar-item">
                <span class="sa-bar-label">小十神<span class="sa-bar-sub">食伤·财星</span></span>
                <div class="sa-bar-track"><div class="sa-bar-fill sa-small" style="width:${barW(ageInfo.smallCount)}%"></div></div>
                <span class="sa-bar-num">${ageInfo.smallCount}</span>
            </div>
            <div class="sa-bar-item">
                <span class="sa-bar-label">比劫<span class="sa-bar-sub">同龄倾向</span></span>
                <div class="sa-bar-track"><div class="sa-bar-fill sa-same" style="width:${barW(ageInfo.sameCount)}%"></div></div>
                <span class="sa-bar-num">${ageInfo.sameCount}</span>
            </div>
        </div>
        <div class="sa-detail">${ageInfo.detail}</div>
        <div class="sa-loc-row">
            <div class="sa-loc-card">
                <span class="sa-loc-icon">📍</span>
                <div class="sa-loc-body">
                    <div class="sa-loc-title">配偶远近 <span class="sa-loc-tag">${ageInfo.distanceLabel}</span></div>
                    <div class="sa-loc-text">${ageInfo.distanceText}</div>
                </div>
            </div>
            <div class="sa-loc-card">
                <span class="sa-loc-icon">💞</span>
                <div class="sa-loc-body">
                    <div class="sa-loc-title">认识方式 <span class="sa-loc-tag">${ageInfo.meetingLabel}</span></div>
                    <div class="sa-loc-text">${ageInfo.meetingText}</div>
                </div>
            </div>
        </div>
    `;
}

// ==================== 父母关系渲染 ====================
function renderParents(bazi, gender) {
    const parents = window.BaZiCalculator.analyzeParents(bazi, gender);
    const el = document.getElementById('parentsContent');
    if (!el) return;

    el.innerHTML = `
        <div class="pr-card pr-father">
            <div class="pr-card-icon">👨</div>
            <div class="pr-card-body">
                <div class="pr-card-title">父亲 <span class="pr-star-tag">${parents.fatherStar}</span></div>
                <div class="pr-card-text">${parents.fatherText}</div>
            </div>
        </div>
        <div class="pr-card pr-mother">
            <div class="pr-card-icon">👩</div>
            <div class="pr-card-body">
                <div class="pr-card-title">母亲 <span class="pr-star-tag">${parents.motherStar}</span></div>
                <div class="pr-card-text">${parents.motherText}</div>
            </div>
        </div>
        <div class="pr-summary">
            <div class="pr-summary-label">综合</div>
            <div class="pr-summary-text">${parents.summaryText}</div>
        </div>
    `;
}

// ==================== 日主性格渲染 ====================
function renderCharacter(bazi) {
    const ch = window.BaZiCalculator.analyzeCharacter(bazi);
    const el = document.getElementById('characterContent');
    if (!el) return;

    const wxColor = { '木':'#4CAF50','火':'#F44336','土':'#CD853F','金':'#FFD700','水':'#2196F3' };
    const wxEmoji = { '木':'🌳','火':'🔥','土':'⛰️','金':'⚔️','水':'💧' };

    // 优点 / 缺点
    const strengths = ch.strengths.split('、').slice(0, 3);
    const weaknesses = ch.weaknesses.split('、').slice(0, 3);

    const ssTags = ch.topSSDetail.map(t => `
        <span class="ch-ss-tag">${t.name}×${t.count}</span>
    `).join('');

    el.innerHTML = `
        <div class="ch-header">
            <span class="ch-gan-badge" style="background:${wxColor[ch.wuXing]}22;border-color:${wxColor[ch.wuXing]};color:${wxColor[ch.wuXing]}">
                ${wxEmoji[ch.wuXing]} ${ch.dayGan}${ch.wuXing}日主
            </span>
            <div class="ch-ss-row">${ssTags}</div>
        </div>
        <div class="ch-dual">
            <div class="ch-card ch-strength">
                <div class="ch-card-icon">✅</div>
                <div class="ch-card-body">
                    <div class="ch-card-title">优势面</div>
                    <div class="ch-card-text">${ch.nature.positive}</div>
                </div>
            </div>
            <div class="ch-card ch-weakness">
                <div class="ch-card-icon">⚠️</div>
                <div class="ch-card-body">
                    <div class="ch-card-title">注意面</div>
                    <div class="ch-card-text">${ch.nature.negative}</div>
                </div>
            </div>
        </div>
        <div class="ch-composite">
            <div class="ch-comp-label">综合画像</div>
            <div class="ch-comp-text">${ch.nature.xingxiang}</div>
        </div>
        <div class="ch-comp-text" style="margin-top:12px;">${ch.composite}</div>
    `;
}

// ==================== 财运分析渲染 ====================
function renderWealth(bazi, gender) {
    const wl = window.BaZiCalculator.analyzeWealth(bazi, gender);
    const el = document.getElementById('wealthContent');
    if (!el) return;

    const wxColors = { '木':'#4CAF50','火':'#F44336','土':'#CD853F','金':'#FFD700','水':'#2196F3' };
    const pct = Math.min(100, Math.max(10, Math.round(wl.wangScore / 6 * 100)));

    const posHtml = wl.caiPositions.length > 0
        ? wl.caiPositions.map(p => `<span class="wl-pos-tag">${p}</span>`).join('')
        : '<span class="wl-pos-tag" style="opacity:0.6">财星不显</span>';

    const wangLabels = { '身强':'💪 身强','中和偏强':'🙂 中和偏强','中和偏弱':'😐 中和偏弱','身弱':'😔 身弱' };

    el.innerHTML = `
        <div class="wl-top">
            <div class="wl-top-item">
                <span class="wl-top-icon">💰</span>
                <div>
                    <span class="wl-top-label">财星五行</span>
                    <span class="wl-top-val" style="color:${wxColors[wl.caiWX] || '#b8a878'}">${wl.caiWX}</span>
                </div>
            </div>
            <div class="wl-top-item">
                <span class="wl-top-icon">📊</span>
                <div>
                    <span class="wl-top-label">财星出现</span>
                    <span class="wl-top-val">${wl.caiCount}次</span>
                </div>
            </div>
            <div class="wl-top-item">
                <span class="wl-top-icon">⚖️</span>
                <div>
                    <span class="wl-top-label">日主状态</span>
                    <span class="wl-top-val">${wangLabels[wl.wangStatus] || wl.wangStatus}</span>
                </div>
            </div>
        </div>
        <div class="wl-wang-bar">
            <span class="wl-wang-label">日主旺度</span>
            <div class="wl-wang-track">
                <div class="wl-wang-fill" style="width:${pct}%;background:${pct > 60 ? '#4CAF50' : pct > 30 ? '#ff9f43' : '#F44336'}"></div>
            </div>
            <span class="wl-wang-num">${wl.wangScore.toFixed(1)}</span>
        </div>
        <div class="wl-pos-row">
            <span class="wl-pos-label">财星位置</span>
            <div class="wl-pos-tags">${posHtml}</div>
        </div>
        <div class="wl-analysis">
            <div class="wl-ana-item">
                <div class="wl-ana-label">财运概况</div>
                <div class="wl-ana-text">${wl.caiText}</div>
            </div>
            <div class="wl-ana-item">
                <div class="wl-ana-label">担财能力</div>
                <div class="wl-ana-text">${wl.caiWanxi}</div>
            </div>
            <div class="wl-ana-item">
                <div class="wl-ana-label">建议</div>
                <div class="wl-ana-text">${wl.caiAdvice}</div>
            </div>
        </div>
    `;
}

// ==================== 流年运势渲染 ====================
function renderFortune(bazi, gender) {
    const ft = window.BaZiCalculator.analyzeFortune(bazi, gender);
    const el = document.getElementById('fortuneContent');
    if (!el) return;

    const yearCards = ft.years.map(yr => `
        <div class="ft-card">
            <div class="ft-year-row">
                <span class="ft-year-num">${yr.year}</span>
                <span class="ft-year-gz">${yr.gan}${yr.zhi}</span>
                <span class="ft-tag" style="background:${yr.overallColor}22;border-color:${yr.overallColor};color:${yr.overallColor}">${yr.overallLabel}</span>
                <span class="ft-ss-badge">${yr.shiShen}</span>
            </div>
            <div class="ft-body">
                <div class="ft-desc">${yr.ssNote}</div>
                ${yr.riskText ? '<div class="ft-risk">' + yr.riskText + '</div>' : ''}
                ${yr.oppText ? '<div class="ft-opp">' + yr.oppText + '</div>' : ''}
            </div>
        </div>
    `).join('');

    el.innerHTML = `
        <div class="ft-dy-info">${ft.dyInfo}</div>
        <div class="ft-legend">
            <span class="ft-legend-item"><span class="ft-dot" style="background:#81C784"></span>利好</span>
            <span class="ft-legend-item"><span class="ft-dot" style="background:#feca57"></span>较好</span>
            <span class="ft-legend-item"><span class="ft-dot" style="background:#a29bfe"></span>平稳</span>
            <span class="ft-legend-item"><span class="ft-dot" style="background:#F44336"></span>注意</span>
        </div>
        <div class="ft-cards">${yearCards}</div>
        <div class="ft-disclaimer">※ 流年运势为命理学的概率性参考，请结合自身实际情况理性看待，勿盲信。</div>
    `;
}

// ==================== 学业分析渲染 ====================
function renderStudy(bazi) {
    const st = window.BaZiCalculator.analyzeStudy(bazi);
    const el = document.getElementById('studyContent');
    if (!el) return;

    const wxColors = { '木':'#4CAF50','火':'#F44336','土':'#CD853F','金':'#FFD700','水':'#2196F3' };
    const yinPct = Math.min(100, Math.max(5, Math.round(st.yinScore / 6 * 100)));

    el.innerHTML = `
        <div class="st-level">
            <span class="st-level-badge" style="background:${wxColors[st.wuXing]}22;border-color:${wxColors[st.wuXing]};color:${wxColors[st.wuXing]}">
                ${st.levelLabel}
            </span>
        </div>
        <div class="st-metrics">
            <div class="st-metric">
                <span class="st-metric-icon">📖</span>
                <span class="st-metric-label">印星</span>
                <div class="st-metric-bar"><div class="st-metric-fill" style="width:${yinPct}%;background:${wxColors[st.wuXing]}"></div></div>
                <span class="st-metric-num">${st.yinScore.toFixed(1)}</span>
            </div>
            <div class="st-metric">
                <span class="st-metric-icon">💡</span>
                <span class="st-metric-label">食伤</span>
                <div class="st-metric-bar"><div class="st-metric-fill" style="width:${Math.min(100,Math.round(st.shiShangScore/6*100))}%;background:#ff9f43"></div></div>
                <span class="st-metric-num">${st.shiShangScore.toFixed(1)}</span>
            </div>
            <div class="st-metric">
                <span class="st-metric-icon">🎯</span>
                <span class="st-metric-label">官星</span>
                <div class="st-metric-bar"><div class="st-metric-fill" style="width:${Math.min(100,Math.round(st.guanScore/4*100))}%;background:#4dadff"></div></div>
                <span class="st-metric-num">${st.guanScore.toFixed(1)}</span>
            </div>
        </div>
        <div class="st-desc">${st.levelText}</div>
        <div class="st-yin-pos">
            <div class="st-section-label">印星分布</div>
            <div class="st-yin-text">${st.yinPosText.replace(/·/g, '<br/>·')}</div>
        </div>
        <div class="st-advice">
            <div class="st-section-label">学习建议</div>
            <div class="st-advice-text">${st.adviceText}</div>
        </div>
    `;
}

// ==================== 真太阳时 ====================
function renderSolarTime(year, month, day, birthHour) {
    const el = document.getElementById('solarTimeText');
    if (!el) return;

    // 计算日期在一年中的天数
    const monthDays = [0,31,59,90,120,151,181,212,243,273,304,334];
    const dayOfYear = monthDays[Math.max(0, month - 1)] + day;

    // 均时差 (Equation of Time) - Spencer公式（精度约3分钟）
    const B = (dayOfYear - 1) * (360 / 365) * (Math.PI / 180);
    const eot = 229.18 * (
        0.000075 +
        0.001868 * Math.cos(B) -
        0.032077 * Math.sin(B) -
        0.014615 * Math.cos(2 * B) -
        0.040849 * Math.sin(2 * B)
    ); // 单位：分钟

    // 经度修正：默认按东八区标准120°E（北京）
    const lng = 120; // 默认北京经度
    const lngOffset = (lng - 120) * 4;

    // 北京时间 → 平太阳时 → 真太阳时
    const bjMinutes = birthHour * 60; // 简化：以时辰中点为例，子时=0点，丑时=2点
    // 使用时辰对应的整点
    const hourMap = [0,2,4,6,8,10,12,14,16,18,20,22];
    const clockHour = hourMap[birthHour] || birthHour;
    const totalMinutes = clockHour * 60 + eot + lngOffset;

    const solarHour = Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60);
    const solarMin = Math.round(((totalMinutes % 1440) + 1440) % 1440 % 60);
    const solarStr = String(solarHour).padStart(2,'0') + ':' + String(solarMin).padStart(2,'0');

    const sign = Math.abs(eot) < 0.5 ? '≈' : (eot > 0 ? '+' : '');
    el.innerHTML = `${solarStr} <span style="font-size:11px;color:var(--text-dim)">（均时差${sign}${eot.toFixed(0)}分）</span>`;
}

// ==================== 抽屉式开关 ====================
function toggleDrawer(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.classList.toggle('drawer-open');
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    _params = getUrlParams();

    if (!_params.year || !_params.month || !_params.day || isNaN(_params.hour) || !_params.gender) {
        alert('参数错误，请重新输入');
        window.location.href = 'index.html';
        return;
    }

    const bazi = window.BaZiCalculator.calculate(
        _params.year, _params.month, _params.day, _params.hour, _params.gender
    );

    const daYun = window.BaZiCalculator.calculateDaYun(
        bazi.month, bazi.year, _params.gender,
        _params.year, _params.month, _params.day
    );

    const shenSha = window.BaZiCalculator.calculateShenSha(bazi);

    // 存储供流年点击使用
    _daYunData = daYun;
    _dayGan = bazi.day.gan;
    _bazi = bazi;

    render({ bazi, daYun, shenSha });
});
