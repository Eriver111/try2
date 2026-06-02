/**
 * 首页交互逻辑 - 滚轮滑动选择器（移动端优化版）
 */

// ===== 全局状态 =====
const _pickerMetaMap = new WeakMap(); // listEl → { itemH, onChange }
let _globalTouchActive = false;

// ===== 滚动轮通用逻辑 =====
function buildPicker(listEl, items, defaultVal, onChange) {
    const isMobile = window.innerWidth <= 600;
    const itemH = isMobile ? 38 : 42;
    const spacerH = isMobile ? 65 : 75;

    _pickerMetaMap.set(listEl, { itemH, onChange: onChange || null });

    // 构建 HTML：首尾各 3 个占位 spacer + 真实选项
    const spacer = '<div class="sp-spacer"></div>';
    const itemHTML = items.map(val =>
        `<div class="sp-item" data-val="${val}">${val}</div>`
    ).join('');
    listEl.innerHTML = spacer + spacer + spacer + itemHTML + spacer + spacer + spacer;

    // 设置默认值
    if (defaultVal !== undefined && defaultVal !== null) {
        const targetIdx = items.indexOf(String(defaultVal));
        if (targetIdx >= 0) {
            const st = targetIdx * itemH; // 目标 scrollTop（spacer 已撑出空间）
            requestAnimationFrame(() => {
                listEl.scrollTop = st;
                requestAnimationFrame(() => markSelected(listEl));
            });
        }
    }

    // 滚动停止检测（300ms 无滚动即判定停止）
    let scrollTimer = 0;
    listEl.addEventListener('scroll', () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => onScrollStop(listEl), 300);
    }, { passive: true });

    // 移动端：手指离开后快速轮询直到停止
    listEl.addEventListener('touchend', () => _pollUntilStop(listEl), { passive: true });
    listEl.addEventListener('pointerup', () => _pollUntilStop(listEl), { passive: true });
}

/** 滚动停止后的吸附 + 标记 + 回调 */
function onScrollStop(listEl) {
    snapNow(listEl);
    markSelected(listEl);
    const meta = _pickerMetaMap.get(listEl);
    if (meta && meta.onChange) meta.onChange();
}

/** 轮询直到滚动完全静止再吸附 */
function _pollUntilStop(listEl) {
    let lastST = listEl.scrollTop;
    let idleCount = 0;
    function check() {
        const st = listEl.scrollTop;
        if (Math.abs(st - lastST) < 0.5) {
            idleCount++;
            if (idleCount >= 4) {
                onScrollStop(listEl);
                return;
            }
        } else {
            idleCount = 0;
        }
        lastST = st;
        requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
}

/** 立即吸附到最近项 */
function snapNow(listEl) {
    const meta = _pickerMetaMap.get(listEl);
    const itemH = meta ? meta.itemH : 42;
    const st = listEl.scrollTop;
    const idx = Math.round(st / itemH);
    listEl.scrollTo({ top: idx * itemH, behavior: 'auto' });
}

/** 标记当前选中项（高亮） */
function markSelected(listEl) {
    const meta = _pickerMetaMap.get(listEl);
    const itemH = meta ? meta.itemH : 42;
    const st = listEl.scrollTop;
    const centerIdx = Math.round(st / itemH);
    const items = listEl.querySelectorAll('.sp-item');
    items.forEach((it, i) => it.classList.toggle('selected', i === centerIdx));
}

/** 获取当前选中值 */
function getPickerVal(listEl) {
    const meta = _pickerMetaMap.get(listEl);
    const itemH = meta ? meta.itemH : 42;
    const idx = Math.round(listEl.scrollTop / itemH);
    const items = listEl.querySelectorAll('.sp-item');
    if (idx >= 0 && idx < items.length) {
        return items[idx].getAttribute('data-val');
    }
    return '';
}

// ===== 闰年判断 =====
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }
function daysInMonth(y, m) {
    if (m === 2) return isLeap(y) ? 29 : 28;
    return [4,6,9,11].includes(m) ? 30 : 31;
}

// ===== 初始化日期滚轮 =====
function initDatePickers() {
    const yearList = document.getElementById('yearList');
    const monthList = document.getElementById('monthList');
    const dayList = document.getElementById('dayList');
    if (!yearList || !monthList || !dayList) return;

    const years = []; for (let y = 2024; y >= 1900; y--) years.push(String(y));
    const months = []; for (let m = 1; m <= 12; m++) months.push(String(m));
    const days31 = []; for (let d = 1; d <= 31; d++) days31.push(String(d));

    // 构建三级联动
    let updatingDays = false;
    function updateDayList() {
        if (updatingDays) return;
        const y = parseInt(getPickerVal(yearList));
        const m = parseInt(getPickerVal(monthList));
        if (!y || !m) return;
        const maxD = daysInMonth(y, m);
        const curD = parseInt(getPickerVal(dayList));
        const newDays = [];
        for (let d = 1; d <= maxD; d++) newDays.push(String(d));
        updatingDays = true;
        buildPicker(dayList, newDays, curD > maxD ? maxD : curD);
        updatingDays = false;
    }

    buildPicker(yearList, years, 2000, updateDayList);
    buildPicker(monthList, months, 1, updateDayList);
    buildPicker(dayList, days31, 1);
}

// ===== 初始化出生地滚轮 =====
function initLocPickers() {
    const provList = document.getElementById('provList');
    const cityList = document.getElementById('cityList');
    const distList = document.getElementById('distList');
    if (!provList || !cityList || !distList) return;
    if (typeof REGION_DATA === 'undefined') {
        buildPicker(provList, ['暂无数据'], 0);
        return;
    }

    let updatingCity = false, updatingDist = false;

    function updateCityPicker() {
        if (updatingCity) return;
        const prov = getPickerVal(provList);
        if (!prov || !REGION_DATA[prov]) {
            updatingCity = true;
            buildPicker(cityList, ['--'], 0);
            buildPicker(distList, ['--'], 0);
            updatingCity = false;
            return;
        }
        const cities = Object.keys(REGION_DATA[prov]);
        updatingCity = true;
        buildPicker(cityList, cities, 0, updateDistPicker);
        updatingCity = false;
        updateDistPicker();
    }

    function updateDistPicker() {
        if (updatingDist) return;
        const prov = getPickerVal(provList);
        const city = getPickerVal(cityList);
        if (!prov || !city || !REGION_DATA[prov] || !REGION_DATA[prov][city]) {
            updatingDist = true;
            buildPicker(distList, ['--'], 0);
            updatingDist = false;
            return;
        }
        const districts = REGION_DATA[prov][city];
        updatingDist = true;
        buildPicker(distList, districts, 0);
        updatingDist = false;
    }

    const provinces = Object.keys(REGION_DATA);
    buildPicker(provList, provinces, 0, updateCityPicker);
    buildPicker(cityList, ['--'], 0);
    buildPicker(distList, ['--'], 0);
    updateCityPicker();
}

// ===== 表单提交 =====
document.getElementById('birthForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const y = getPickerVal(document.getElementById('yearList'));
    const m = getPickerVal(document.getElementById('monthList'));
    const d = getPickerVal(document.getElementById('dayList'));
    const hour = parseInt(document.getElementById('birthHour').value);
    const gender = document.getElementById('gender').value;

    if (!y || !m || !d || isNaN(hour) || !gender) {
        alert('请完整选择生辰与性别');
        return;
    }

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<span class="btn-text">正在排盘...</span>';

    const params = new URLSearchParams({
        year: parseInt(y), month: parseInt(m), day: parseInt(d),
        hour: hour, gender: gender
    });

    const prov = getPickerVal(document.getElementById('provList'));
    const city = getPickerVal(document.getElementById('cityList'));
    const dist = getPickerVal(document.getElementById('distList'));
    if (prov && prov !== '--') params.set('prov', prov);
    if (city && city !== '--') params.set('city', city);
    if (dist && dist !== '--') params.set('dist', dist);

    setTimeout(() => { window.location.href = `result.html?${params.toString()}`; }, 600);
});

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => {
    initDatePickers();
    initLocPickers();
});

// 点击任一选项直接跳转到该项
document.addEventListener('click', function(e) {
    const item = e.target.closest('.sp-item');
    if (!item) return;
    const listEl = item.parentElement;
    const idx = Array.from(listEl.querySelectorAll('.sp-item')).indexOf(item);
    const meta = _pickerMetaMap.get(listEl);
    const itemH = meta ? meta.itemH : 42;
    listEl.scrollTo({ top: idx * itemH, behavior: 'smooth' });
    setTimeout(() => {
        markSelected(listEl);
        const m = _pickerMetaMap.get(listEl);
        if (m && m.onChange) m.onChange();
    }, 400);
});
