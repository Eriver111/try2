/**
 * 首页交互逻辑
 */

// 初始化表单选项
function initFormOptions() {
    const yearSelect = document.getElementById('birthYear');
    for (let year = 2024; year >= 1900; year--) {
        const o = document.createElement('option');
        o.value = year; o.textContent = year + '年';
        yearSelect.appendChild(o);
    }
    const monthSelect = document.getElementById('birthMonth');
    for (let m = 1; m <= 12; m++) {
        const o = document.createElement('option');
        o.value = m; o.textContent = m + '月';
        monthSelect.appendChild(o);
    }
    updateDayOptions(31);
}

function updateDayOptions(maxDays) {
    const s = document.getElementById('birthDay');
    const cur = s.value;
    s.innerHTML = '<option value="">-- 选择日期 --</option>';
    for (let d = 1; d <= maxDays; d++) {
        const o = document.createElement('option');
        o.value = d; o.textContent = d + '日';
        s.appendChild(o);
    }
    if (cur && cur <= maxDays) s.value = cur;
}

function getMaxDays(y, m) {
    if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0) ? 29 : 28;
    return [4,6,9,11].includes(m) ? 30 : 31;
}

document.getElementById('birthYear').addEventListener('change', function() {
    const y = parseInt(this.value);
    const m = parseInt(document.getElementById('birthMonth').value);
    if (y && m) updateDayOptions(getMaxDays(y, m));
});
document.getElementById('birthMonth').addEventListener('change', function() {
    const y = parseInt(document.getElementById('birthYear').value);
    const m = parseInt(this.value);
    if (y && m) updateDayOptions(getMaxDays(y, m));
});

// 表单提交
document.getElementById('birthForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const year = parseInt(document.getElementById('birthYear').value);
    const month = parseInt(document.getElementById('birthMonth').value);
    const day = parseInt(document.getElementById('birthDay').value);
    const hour = parseInt(document.getElementById('birthHour').value);
    const gender = document.getElementById('gender').value;

    if (!year || !month || !day || isNaN(hour) || !gender) {
        alert('请完整填写所有信息');
        return;
    }

    const btn = document.querySelector('.submit-btn');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="btn-text">正在分析...</span>';

    const params = new URLSearchParams({ year, month, day, hour, gender });
    const hourSelect = document.getElementById('birthHour');
    if (hourSelect.selectedOptions && hourSelect.selectedOptions[0]) {
        var clock = hourSelect.selectedOptions[0].getAttribute('data-clock');
        if (clock) params.set('clock', clock);
    }
    const minute = document.getElementById('birthMinute').value;
    if (minute !== '' && !isNaN(parseInt(minute))) params.set('minute', minute);
    const prov = document.getElementById('birthProvince').value;
    const city = document.getElementById('birthCity').value;
    const dist = document.getElementById('birthDistrict').value;
    if (prov) params.set('prov', prov);
    if (city) params.set('city', city);
    if (dist) params.set('dist', dist);

    setTimeout(() => { window.location.href = 'result.html?' + params.toString(); }, 600);
});

// 省市区三级联动
document.addEventListener('DOMContentLoaded', function() {
    const provS = document.getElementById('birthProvince');
    const cityS = document.getElementById('birthCity');
    const distS = document.getElementById('birthDistrict');
    if (!provS || !cityS || !distS || typeof REGION_DATA === 'undefined') return;

    Object.keys(REGION_DATA).forEach(p => {
        const o = document.createElement('option');
        o.value = p; o.textContent = p;
        provS.appendChild(o);
    });

    provS.addEventListener('change', function() {
        const p = this.value;
        cityS.innerHTML = '<option value="">-- 选择城市 --</option>';
        distS.innerHTML = '<option value="">-- 选择区县 --</option>';
        cityS.disabled = true; distS.disabled = true;
        if (!p || !REGION_DATA[p]) return;
        Object.keys(REGION_DATA[p]).forEach(c => {
            const o = document.createElement('option');
            o.value = c; o.textContent = c;
            cityS.appendChild(o);
        });
        cityS.disabled = false;
    });

    cityS.addEventListener('change', function() {
        const p = provS.value, c = this.value;
        distS.innerHTML = '<option value="">-- 选择区县 --</option>';
        distS.disabled = true;
        if (!p || !c || !REGION_DATA[p] || !REGION_DATA[p][c]) return;
        REGION_DATA[p][c].forEach(d => {
            const o = document.createElement('option');
            o.value = d; o.textContent = d;
            distS.appendChild(o);
        });
        distS.disabled = false;
    });
});

document.addEventListener('DOMContentLoaded', initFormOptions);
