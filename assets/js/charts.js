/* =========================================================
   Charts — grafik SVG ringan tanpa library eksternal
   Semua fungsi menerima elemen kontainer & menggambar ulang saat layar berubah.
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;

  const registry = new Map(); // element -> fungsi gambar ulang

  function register(container, draw) {
    registry.set(container, draw);
    draw();
  }

  const redrawAll = U.debounce(() => {
    registry.forEach((draw, node) => {
      if (!document.body.contains(node)) { registry.delete(node); return; }
      try { draw(); } catch (e) { console.error(e); }
    });
  }, 150);

  window.addEventListener('resize', redrawAll);

  function width(container, fallback) {
    return Math.max(240, container.clientWidth || fallback || 320);
  }

  function svgEl(w, h, extraClass) {
    return `<svg class="chart-svg ${extraClass || ''}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">`;
  }

  /* ---------- Tooltip bersama ---------- */

  let tipNode = null;

  function tooltip() {
    if (!tipNode) {
      tipNode = document.createElement('div');
      tipNode.className = 'chart-tip';
      document.body.appendChild(tipNode);
    }
    return tipNode;
  }

  function showTip(html, x, y) {
    const t = tooltip();
    t.innerHTML = html;
    t.classList.add('is-visible');
    const rect = t.getBoundingClientRect();
    let left = x - rect.width / 2;
    left = U.clamp(left, 8, window.innerWidth - rect.width - 8);
    let top = y - rect.height - 12;
    if (top < 8) top = y + 16;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }

  function hideTip() {
    if (tipNode) tipNode.classList.remove('is-visible');
  }

  document.addEventListener('scroll', hideTip, true);

  /* ---------- Grafik batang: pemasukan vs pengeluaran ---------- */

  /**
   * bars(container, series, opts)
   * series: [{ date, income, expense, profit }]
   */
  function bars(container, series, opts) {
    const o = opts || {};
    const draw = () => {
      const w = width(container);
      const h = o.height || 240;
      const padL = 46, padR = 10, padT = 14, padB = 28;
      const innerW = w - padL - padR;
      const innerH = h - padT - padB;
      const data = series || [];

      if (!data.length) { container.innerHTML = '<p class="chart-empty">Belum ada data.</p>'; return; }

      const maxVal = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
      const niceMax = niceCeil(maxVal);
      const y = v => padT + innerH - (v / niceMax) * innerH;

      const slot = innerW / data.length;
      const gap = Math.min(8, slot * 0.22);
      // Dibatasi agar rentang pendek (mis. 3 hari) tidak menghasilkan batang raksasa.
      const barW = U.clamp((slot - gap) / 2 - 1, 3, 44);
      const pairW = barW * 2 + 2;

      let s = svgEl(w, h);

      // Garis bantu horizontal
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const val = (niceMax / ticks) * i;
        const yy = y(val);
        s += `<line class="chart-grid" x1="${padL}" y1="${yy.toFixed(1)}" x2="${w - padR}" y2="${yy.toFixed(1)}"/>`;
        s += `<text class="chart-axis" x="${padL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${U.rupiahShort(val)}</text>`;
      }

      // Batang
      data.forEach((d, i) => {
        const x0 = padL + i * slot + (slot - pairW) / 2;
        const yI = y(d.income), yE = y(d.expense);
        const hI = Math.max(d.income > 0 ? 2 : 0, padT + innerH - yI);
        const hE = Math.max(d.expense > 0 ? 2 : 0, padT + innerH - yE);
        const r = Math.min(3, barW / 2);
        s += `<g class="chart-bar-group" data-i="${i}">`;
        s += `<rect class="chart-hit" x="${(padL + i * slot).toFixed(1)}" y="${padT}" width="${slot.toFixed(1)}" height="${innerH}"/>`;
        if (hI > 0) s += `<rect class="chart-bar chart-bar--income" x="${x0.toFixed(1)}" y="${(padT + innerH - hI).toFixed(1)}" width="${barW.toFixed(1)}" height="${hI.toFixed(1)}" rx="${r}"/>`;
        if (hE > 0) s += `<rect class="chart-bar chart-bar--expense" x="${(x0 + barW + 2).toFixed(1)}" y="${(padT + innerH - hE).toFixed(1)}" width="${barW.toFixed(1)}" height="${hE.toFixed(1)}" rx="${r}"/>`;
        s += `</g>`;
      });

      // Sumbu X (label dipilih agar tidak bertumpuk)
      const every = Math.ceil(data.length / Math.max(3, Math.floor(innerW / 56)));
      data.forEach((d, i) => {
        if (i % every !== 0 && i !== data.length - 1) return;
        const cx = padL + i * slot + slot / 2;
        const dt = U.fromISODate(d.date);
        const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
        s += `<text class="chart-axis" x="${cx.toFixed(1)}" y="${h - 8}" text-anchor="middle">${label}</text>`;
      });

      // Garis dasar
      s += `<line class="chart-axis-line" x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}"/>`;
      s += '</svg>';
      container.innerHTML = s;

      // Interaksi
      const svg = container.querySelector('svg');
      const groups = Array.from(svg.querySelectorAll('.chart-bar-group'));
      groups.forEach(g => {
        const i = Number(g.dataset.i);
        const d = data[i];
        const show = ev => {
          groups.forEach(x => x.classList.remove('is-active'));
          g.classList.add('is-active');
          const r = g.getBoundingClientRect();
          showTip(`
            <div class="chart-tip__title">${U.formatDateRelative(d.date)}</div>
            <div class="chart-tip__row"><span class="dot dot--income"></span>Masuk<b>${U.rupiah(d.income)}</b></div>
            <div class="chart-tip__row"><span class="dot dot--expense"></span>Keluar<b>${U.rupiah(d.expense)}</b></div>
            <div class="chart-tip__row chart-tip__row--total">Laba<b class="${d.profit < 0 ? 'is-neg' : 'is-pos'}">${U.rupiah(d.profit)}</b></div>
          `, r.left + r.width / 2, r.top + 20);
        };
        g.addEventListener('mouseenter', show);
        g.addEventListener('touchstart', show, { passive: true });
        g.addEventListener('mouseleave', () => { g.classList.remove('is-active'); hideTip(); });
      });
      svg.addEventListener('mouseleave', hideTip);
    };

    register(container, draw);
  }

  /* ---------- Grafik garis (tren laba) ---------- */

  function line(container, series, opts) {
    const o = opts || {};
    const draw = () => {
      const w = width(container);
      const h = o.height || 200;
      const padL = 46, padR = 12, padT = 14, padB = 26;
      const innerW = w - padL - padR, innerH = h - padT - padB;
      const data = series || [];
      if (data.length < 2) { container.innerHTML = '<p class="chart-empty">Butuh minimal 2 hari data.</p>'; return; }

      const vals = data.map(d => d.value);
      const rawMax = Math.max(...vals, 0);
      const rawMin = Math.min(...vals, 0);
      const max = niceCeil(rawMax || 1);
      const min = rawMin < 0 ? -niceCeil(Math.abs(rawMin)) : 0;
      const span = (max - min) || 1;
      const x = i => padL + (i / (data.length - 1)) * innerW;
      const y = v => padT + innerH - ((v - min) / span) * innerH;

      let s = svgEl(w, h);
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const val = min + (span / ticks) * i;
        const yy = y(val);
        s += `<line class="chart-grid" x1="${padL}" y1="${yy.toFixed(1)}" x2="${w - padR}" y2="${yy.toFixed(1)}"/>`;
        s += `<text class="chart-axis" x="${padL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${U.rupiahShort(val)}</text>`;
      }
      if (min < 0) {
        s += `<line class="chart-zero" x1="${padL}" y1="${y(0).toFixed(1)}" x2="${w - padR}" y2="${y(0).toFixed(1)}"/>`;
      }

      const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
      const areaPath = `M ${x(0).toFixed(1)},${y(min).toFixed(1)} L ` +
        data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' L ') +
        ` L ${x(data.length - 1).toFixed(1)},${y(min).toFixed(1)} Z`;

      s += `<defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="chart-grad-a"/><stop offset="100%" class="chart-grad-b"/>
            </linearGradient></defs>`;
      s += `<path class="chart-area" d="${areaPath}" fill="url(#lineGrad)"/>`;
      s += `<polyline class="chart-line" points="${points}"/>`;

      data.forEach((d, i) => {
        s += `<g class="chart-point" data-i="${i}">
                <circle class="chart-point__hit" cx="${x(i).toFixed(1)}" cy="${y(d.value).toFixed(1)}" r="14"/>
                <circle class="chart-point__dot" cx="${x(i).toFixed(1)}" cy="${y(d.value).toFixed(1)}" r="3.2"/>
              </g>`;
      });

      const every = Math.ceil(data.length / Math.max(3, Math.floor(innerW / 60)));
      data.forEach((d, i) => {
        if (i % every !== 0 && i !== data.length - 1) return;
        const dt = U.fromISODate(d.date);
        s += `<text class="chart-axis" x="${x(i).toFixed(1)}" y="${h - 6}" text-anchor="middle">${dt.getDate()}/${dt.getMonth() + 1}</text>`;
      });

      s += '</svg>';
      container.innerHTML = s;

      const svg = container.querySelector('svg');
      Array.from(svg.querySelectorAll('.chart-point')).forEach(g => {
        const d = data[Number(g.dataset.i)];
        const show = () => {
          const r = g.getBoundingClientRect();
          showTip(`<div class="chart-tip__title">${U.formatDateRelative(d.date)}</div>
                   <div class="chart-tip__row chart-tip__row--total">${o.label || 'Laba'}<b class="${d.value < 0 ? 'is-neg' : 'is-pos'}">${U.rupiah(d.value)}</b></div>`,
            r.left + r.width / 2, r.top);
        };
        g.addEventListener('mouseenter', show);
        g.addEventListener('touchstart', show, { passive: true });
        g.addEventListener('mouseleave', hideTip);
      });
      svg.addEventListener('mouseleave', hideTip);
    };
    register(container, draw);
  }

  /* ---------- Donat: rincian pengeluaran ---------- */

  /** rows: [{ name, total, color, emoji }] */
  function donut(container, rows, opts) {
    const o = opts || {};
    const draw = () => {
      const data = (rows || []).filter(r => r.total > 0);
      if (!data.length) { container.innerHTML = '<p class="chart-empty">Belum ada pengeluaran pada periode ini.</p>'; return; }

      const size = Math.min(200, Math.max(150, width(container) * 0.5));
      const stroke = size * 0.17;
      const r = (size - stroke) / 2;
      const c = size / 2;
      const circumference = 2 * Math.PI * r;
      const total = U.sum(data, d => d.total) || 1;

      let offset = 0;
      let ring = '';
      data.forEach((d, i) => {
        const frac = d.total / total;
        const len = frac * circumference;
        ring += `<circle class="donut__seg" data-i="${i}" cx="${c}" cy="${c}" r="${r.toFixed(2)}"
                   fill="none" stroke="${d.color || '#94a3b8'}" stroke-width="${stroke.toFixed(1)}"
                   stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${(circumference - len + 1.5).toFixed(2)}"
                   stroke-dashoffset="${(-offset).toFixed(2)}" stroke-linecap="butt"/>`;
        offset += len;
      });

      const html = `
        <div class="donut">
          <div class="donut__chart">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut__svg" role="img">
              <g transform="rotate(-90 ${c} ${c})">
                <circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" class="donut__track" stroke-width="${stroke.toFixed(1)}"/>
                ${ring}
              </g>
            </svg>
            <div class="donut__center">
              <span class="donut__label">${U.escapeHtml(o.centerLabel || 'Total')}</span>
              <strong class="donut__value">${U.rupiahShort(total)}</strong>
            </div>
          </div>
          <ul class="donut__legend">
            ${data.map((d, i) => `
              <li class="donut__legend-item" data-i="${i}">
                <span class="donut__swatch" style="background:${d.color || '#94a3b8'}"></span>
                <span class="donut__name">${d.emoji ? d.emoji + ' ' : ''}${U.escapeHtml(d.name)}</span>
                <span class="donut__pct">${((d.total / total) * 100).toFixed(0)}%</span>
                <span class="donut__amount">${U.rupiah(d.total)}</span>
              </li>`).join('')}
          </ul>
        </div>`;
      container.innerHTML = html;

      const segs = Array.from(container.querySelectorAll('.donut__seg'));
      const items = Array.from(container.querySelectorAll('.donut__legend-item'));
      const link = (i, active) => {
        segs.forEach(s => s.classList.toggle('is-dim', active && Number(s.dataset.i) !== i));
        items.forEach(it => it.classList.toggle('is-active', active && Number(it.dataset.i) === i));
      };
      segs.concat(items).forEach(node => {
        const i = Number(node.dataset.i);
        node.addEventListener('mouseenter', () => link(i, true));
        node.addEventListener('mouseleave', () => link(i, false));
      });
    };
    register(container, draw);
  }

  /* ---------- Cincin progres target harian ---------- */

  function progressRing(value, target, size) {
    const s = size || 92;
    const stroke = 9;
    const r = (s - stroke) / 2;
    const c = s / 2;
    const circ = 2 * Math.PI * r;
    const pct = target > 0 ? U.clamp(value / target, 0, 1) : 0;
    const reached = target > 0 && value >= target;
    return `
      <div class="ring ${reached ? 'is-done' : ''}">
        <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="Progres target">
          <g transform="rotate(-90 ${c} ${c})">
            <circle class="ring__track" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${stroke}"/>
            <circle class="ring__value" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${stroke}"
              stroke-linecap="round" stroke-dasharray="${(pct * circ).toFixed(2)} ${circ.toFixed(2)}"/>
          </g>
        </svg>
        <span class="ring__text">${target > 0 ? Math.round(pct * 100) + '%' : '–'}</span>
      </div>`;
  }

  /* ---------- Sparkline mini ---------- */

  function sparkline(values, opts) {
    const o = opts || {};
    const w = o.width || 80, h = o.height || 26;
    const data = values || [];
    if (data.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
    const max = Math.max(...data), min = Math.min(...data);
    const span = (max - min) || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="sparkline ${o.tone ? 'sparkline--' + o.tone : ''}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  /* ---------- Bantu ---------- */

  function niceCeil(v) {
    if (v <= 0) return 1;
    const exp = Math.floor(Math.log10(v));
    const base = Math.pow(10, exp);
    const n = v / base;
    let mult;
    if (n <= 1) mult = 1;
    else if (n <= 2) mult = 2;
    else if (n <= 2.5) mult = 2.5;
    else if (n <= 5) mult = 5;
    else mult = 10;
    return mult * base;
  }

  global.Charts = { bars, line, donut, progressRing, sparkline, redrawAll, hideTip };
})(window);
