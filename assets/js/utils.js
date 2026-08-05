/* =========================================================
   Utils — helper umum (format uang, tanggal, id, dll)
   ========================================================= */
(function (global) {
  'use strict';

  const NBSP = ' ';

  /* ---------- Angka & Uang ---------- */

  const nfID = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

  /** 25000 -> "25.000" */
  function number(n) {
    const v = Number(n) || 0;
    return nfID.format(Math.round(v));
  }

  /** 25000 -> "Rp 25.000" ; -25000 -> "-Rp 25.000" */
  function rupiah(n, opts) {
    const o = opts || {};
    const v = Math.round(Number(n) || 0);
    const sign = v < 0 ? '-' : (o.plus && v > 0 ? '+' : '');
    return sign + 'Rp' + NBSP + nfID.format(Math.abs(v));
  }

  /** Versi ringkas untuk label grafik: 25rb, 1,2jt, 3,4M */
  function rupiahShort(n) {
    const v = Math.round(Number(n) || 0);
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (a >= 1e9) return sign + trimZero((a / 1e9).toFixed(1)) + 'M';
    if (a >= 1e6) return sign + trimZero((a / 1e6).toFixed(1)) + 'jt';
    if (a >= 1e3) return sign + trimZero((a / 1e3).toFixed(a >= 1e5 ? 0 : 1)) + 'rb';
    return sign + String(a);
  }

  function trimZero(s) {
    return String(s).replace(/\.0$/, '').replace('.', ',');
  }

  /** Ambil angka murni dari input bertitik: "25.000" -> 25000 */
  function parseNumber(str) {
    if (typeof str === 'number') return isFinite(str) ? str : 0;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^\d,-]/g, '').replace(/,/g, '.');
    const v = parseFloat(cleaned);
    return isFinite(v) ? Math.round(v) : 0;
  }

  /** Pasang auto-format ribuan pada <input type="text" inputmode="numeric"> */
  function attachThousand(input) {
    if (!input || input.dataset.thousandBound === '1') return;
    input.dataset.thousandBound = '1';
    const reformat = () => {
      const raw = parseNumber(input.value);
      const atEnd = input.selectionStart === input.value.length;
      input.value = raw ? number(raw) : '';
      if (atEnd) {
        const len = input.value.length;
        try { input.setSelectionRange(len, len); } catch (e) { /* noop */ }
      }
    };
    input.addEventListener('input', reformat);
    input.addEventListener('blur', reformat);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /** Persentase perubahan, aman dari pembagian nol */
  function pctChange(now, before) {
    if (!before) return now ? 100 : 0;
    return ((now - before) / Math.abs(before)) * 100;
  }

  /* ---------- Tanggal ---------- */

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /** Date -> "YYYY-MM-DD" berdasarkan waktu lokal (bukan UTC) */
  function toISODate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** "YYYY-MM-DD" -> Date lokal jam 00:00 */
  function fromISODate(s) {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function today() { return toISODate(new Date()); }

  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function addDays(iso, n) {
    const d = fromISODate(iso);
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  /** Selisih hari (b - a) */
  function diffDays(a, b) {
    return Math.round((fromISODate(b) - fromISODate(a)) / 86400000);
  }

  /** "2026-08-04" -> "4 Agu 2026" ; long: "4 Agustus 2026" */
  function formatDate(iso, long) {
    if (!iso) return '-';
    const d = fromISODate(iso);
    const bulan = long ? BULAN[d.getMonth()] : BULAN_PENDEK[d.getMonth()];
    return `${d.getDate()} ${bulan} ${d.getFullYear()}`;
  }

  /** "Senin, 4 Agustus 2026" */
  function formatDateFull(iso) {
    const d = fromISODate(iso);
    return `${HARI[d.getDay()]}, ${formatDate(iso, true)}`;
  }

  /** Label relatif: Hari ini / Kemarin / Sen, 4 Agu */
  function formatDateRelative(iso) {
    const t = today();
    if (iso === t) return 'Hari ini';
    if (iso === addDays(t, -1)) return 'Kemarin';
    if (iso === addDays(t, 1)) return 'Besok';
    const d = fromISODate(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return `${HARI_PENDEK[d.getDay()]}, ${d.getDate()} ${BULAN_PENDEK[d.getMonth()]}` +
      (sameYear ? '' : ' ' + d.getFullYear());
  }

  function startOfMonth(iso) {
    const d = fromISODate(iso);
    return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function endOfMonth(iso) {
    const d = fromISODate(iso);
    return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }

  /** Senin sebagai awal minggu */
  function startOfWeek(iso) {
    const d = fromISODate(iso);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return toISODate(d);
  }

  function monthLabel(iso) {
    const d = fromISODate(iso);
    return `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function monthKey(iso) { return String(iso).slice(0, 7); }

  /** Daftar tanggal dari a s/d b (inklusif) */
  function dateRangeList(a, b) {
    const out = [];
    let cur = a;
    let guard = 0;
    while (cur <= b && guard < 4000) { out.push(cur); cur = addDays(cur, 1); guard++; }
    return out;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  /* ---------- Umum ---------- */

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait || 200);
    };
  }

  function sum(arr, pick) {
    return arr.reduce((a, x) => a + (pick ? Number(pick(x)) || 0 : Number(x) || 0), 0);
  }

  function groupBy(arr, keyFn) {
    const map = new Map();
    arr.forEach(item => {
      const k = keyFn(item);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item);
    });
    return map;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** Pencarian sederhana tanpa peduli huruf besar/kecil */
  function matches(haystack, needle) {
    if (!needle) return true;
    return String(haystack || '').toLowerCase().includes(String(needle).toLowerCase());
  }

  /** Unduhan biasa lewat tautan sementara */
  function blobDownload(filename, content, mime) {
    const isText = typeof content === 'string';
    const type = mime || (isText ? 'text/plain' : 'application/octet-stream');
    const blob = new Blob([content], { type: isText ? type + ';charset=utf-8' : type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, via: 'blob' };
  }

  /**
   * Unduh berkas. Saat aplikasi dibuka lewat halaman Artifact, unduhan
   * biasa bisa diblokir, jadi jembatan bawaan dipakai lebih dulu bila ada.
   * Mengembalikan Promise<{ok, via, reason}>.
   */
  function download(filename, content, mime) {
    const host = global.claude && global.claude.downloads;
    if (host && typeof host.save === 'function') {
      return host.save({ filename: filename, data: content })
        .then(() => ({ ok: true, via: 'host' }))
        .catch(err => {
          const code = err && err.code;
          if (code === 'declined') return { ok: false, reason: 'declined' };
          if (code === 'too_large') return { ok: false, reason: 'too_large' };
          // Jenis berkas tidak diizinkan / jembatan tidak tersedia:
          // coba cara unduhan biasa.
          try { return blobDownload(filename, content, mime); }
          catch (e) { return { ok: false, reason: code || 'unavailable' }; }
        });
    }
    try { return Promise.resolve(blobDownload(filename, content, mime)); }
    catch (e) { return Promise.resolve({ ok: false, reason: 'unavailable' }); }
  }

  /** Escape 1 sel CSV */
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /**
   * Koma dipakai sebagai pemisah — pemisah baku yang dikenali Excel
   * maupun Google Sheets. Titik koma sempat membuat seluruh baris
   * menumpuk di satu kolom.
   */
  function toCSV(rows) {
    return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  global.Utils = {
    NBSP, number, rupiah, rupiahShort, parseNumber, attachThousand, clamp, pctChange,
    HARI, HARI_PENDEK, BULAN, BULAN_PENDEK,
    toISODate, fromISODate, today, nowTime, addDays, diffDays,
    formatDate, formatDateFull, formatDateRelative,
    startOfMonth, endOfMonth, startOfWeek, monthLabel, monthKey, dateRangeList, greeting,
    uid, escapeHtml, debounce, sum, groupBy, deepClone, matches,
    download, blobDownload, toCSV
  };
})(window);
