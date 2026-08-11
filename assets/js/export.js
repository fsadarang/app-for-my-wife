/* =========================================================
   Export — pembuat berkas Excel (.xlsx) tanpa library eksternal
   dan penyusun data untuk diekspor.

   Kenapa .xlsx, bukan CSV: pada CSV, Excel di HP sering menaruh
   seluruh baris di kolom A karena tebakan pemisahnya (koma vs titik
   koma) meleset. Berkas .xlsx menyimpan kolom secara eksplisit,
   jadi tidak ada lagi tebak-tebakan.
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;

  /* ---------- CRC32 (dibutuhkan format ZIP) ---------- */

  let crcTable = null;
  function makeCrcTable() {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  }

  function crc32(bytes) {
    if (!crcTable) crcTable = makeCrcTable();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const encoder = new TextEncoder();
  function utf8(str) { return encoder.encode(str); }

  /* ---------- Penulis ZIP (metode "store", tanpa kompresi) ---------- */

  function zip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;

    // Waktu berkas dalam format DOS
    const now = new Date();
    const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) |
      ((Math.floor(now.getSeconds() / 2)) & 0x1f);
    const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) |
      (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

    files.forEach(file => {
      const nameBytes = utf8(file.name);
      const dataBytes = typeof file.data === 'string' ? utf8(file.data) : file.data;
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);   // tanda header lokal
      lv.setUint16(4, 20, true);           // versi minimum
      lv.setUint16(6, 0x0800, true);       // bendera: nama berkas UTF-8
      lv.setUint16(8, 0, true);            // metode: store
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);        // ukuran terkompresi
      lv.setUint32(22, size, true);        // ukuran asli
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);           // panjang extra
      local.set(nameBytes, 30);

      chunks.push(local, dataBytes);
      central.push({ nameBytes, crc, size, offset });
      offset += local.length + size;
    });

    const cdChunks = [];
    let cdSize = 0;
    central.forEach(e => {
      const h = new Uint8Array(46 + e.nameBytes.length);
      const hv = new DataView(h.buffer);
      hv.setUint32(0, 0x02014b50, true);   // tanda direktori pusat
      hv.setUint16(4, 20, true);           // versi pembuat
      hv.setUint16(6, 20, true);           // versi minimum
      hv.setUint16(8, 0x0800, true);
      hv.setUint16(10, 0, true);
      hv.setUint16(12, dosTime, true);
      hv.setUint16(14, dosDate, true);
      hv.setUint32(16, e.crc, true);
      hv.setUint32(20, e.size, true);
      hv.setUint32(24, e.size, true);
      hv.setUint16(28, e.nameBytes.length, true);
      hv.setUint16(30, 0, true);           // extra
      hv.setUint16(32, 0, true);           // komentar
      hv.setUint16(34, 0, true);           // nomor disk
      hv.setUint16(36, 0, true);           // atribut internal
      hv.setUint32(38, 0, true);           // atribut eksternal
      hv.setUint32(42, e.offset, true);
      h.set(e.nameBytes, 46);
      cdChunks.push(h);
      cdSize += h.length;
    });

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const all = chunks.concat(cdChunks, [end]);
    const total = all.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    all.forEach(c => { out.set(c, p); p += c.length; });
    return out;
  }

  /* ---------- Penyusun XLSX ---------- */

  function xmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      // Buang karakter kendali yang membuat Excel menolak berkas
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  /** 0 -> A, 25 -> Z, 26 -> AA */
  function colName(i) {
    let s = '';
    let n = i;
    while (n >= 0) {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  }

  /**
   * Nama sheet Excel: maksimal 31 karakter, tanpa : \ / ? * [ ]
   * dan tidak boleh diawali/diakhiri tanda kutip tunggal.
   */
  function safeSheetName(name, index, used) {
    let s = String(name || ('Sheet' + (index + 1))).replace(/[:\\\/\?\*\[\]]/g, ' ').trim();
    if (!s) s = 'Sheet' + (index + 1);
    s = s.slice(0, 31).replace(/^'+|'+$/g, '');
    if (!s) s = 'Sheet' + (index + 1);
    let candidate = s, n = 2;
    while (used.has(candidate.toLowerCase())) {
      const suffix = ' (' + n + ')';
      candidate = s.slice(0, 31 - suffix.length) + suffix;
      n++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  function isNumeric(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function sheetXml(sheet) {
    const rows = sheet.rows || [];
    const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);

    // Lebar kolom: perkirakan dari isi terpanjang agar tidak terpotong
    let cols = '';
    if (colCount) {
      cols = '<cols>';
      for (let c = 0; c < colCount; c++) {
        let width = 10;
        rows.forEach(r => {
          const v = r[c];
          if (v == null) return;
          const len = isNumeric(v) ? U.number(v).length + 2 : String(v).length;
          if (len + 2 > width) width = len + 2;
        });
        cols += `<col min="${c + 1}" max="${c + 1}" width="${Math.min(46, width).toFixed(1)}" customWidth="1"/>`;
      }
      cols += '</cols>';
    }

    let body = '';
    rows.forEach((row, r) => {
      const cells = [];
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (v === null || v === undefined || v === '') continue;
        const ref = colName(c) + (r + 1);
        const styleAttr = sheet.headerRows && r < sheet.headerRows ? ' s="1"'
          : (isNumeric(v) ? ' s="2"' : '');
        if (isNumeric(v)) {
          cells.push(`<c r="${ref}"${styleAttr}><v>${v}</v></c>`);
        } else {
          cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`);
        }
      }
      body += `<row r="${r + 1}">${cells.join('')}</row>`;
    });

    const freeze = sheet.headerRows
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.headerRows}" topLeftCell="A${sheet.headerRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${body}</sheetData></worksheet>`;
  }

  const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE05D2C"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  /**
   * Buat berkas .xlsx.
   * sheets: [{ name, rows: [[...]], headerRows: 1 }]
   * Nilai berupa number ditulis sebagai angka, sisanya sebagai teks.
   */
  function buildXlsx(sheets) {
    const used = new Set();
    const list = sheets.map((s, i) => Object.assign({}, s, { name: safeSheetName(s.name, i, used) }));

    const files = [];

    files.push({
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${list.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`
    });

    files.push({
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    });

    files.push({
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${list.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`
    });

    files.push({
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    });

    files.push({ name: 'xl/styles.xml', data: STYLES_XML });

    list.forEach((s, i) => {
      files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) });
    });

    return zip(files);
  }

  /* ---------- Penyusun data ---------- */

  const S = () => global.Store;

  function methodName(id) {
    const m = S().PAYMENT_METHODS.find(x => x.id === id);
    return m ? m.name : (id || '-');
  }

  /** Sheet "Rincian Item": satu baris untuk tiap item yang terjual */
  function itemRows(list) {
    const rows = [[
      'Tanggal', 'Jam', 'Nama Pelanggan', 'Item', 'Jumlah',
      'Harga Satuan', 'Subtotal', 'Catatan Item', 'Metode Bayar'
    ]];
    list.filter(t => t.type === 'income').forEach(t => {
      const items = t.items || [];
      if (!items.length) {
        rows.push([t.date, t.time || '', t.customerName || '', '(tanpa rincian menu)', 1,
          t.total, t.total, t.note || '', methodName(t.method)]);
        return;
      }
      items.forEach(it => {
        rows.push([
          t.date, t.time || '', t.customerName || '', it.name,
          it.qty, it.price, it.qty * it.price, it.note || '', methodName(t.method)
        ]);
      });
    });
    return rows;
  }

  /** Sheet "Transaksi": satu baris untuk tiap pesanan/pelanggan */
  function orderRows(list) {
    const rows = [[
      'Tanggal', 'Jam', 'Nama Pelanggan', 'Jumlah Item', 'Rincian Pesanan',
      'Subtotal', 'Diskon', 'Total Bayar', 'Metode Bayar',
      'Uang Diberikan', 'Kembalian', 'Catatan'
    ]];
    list.filter(t => t.type === 'income').forEach(t => {
      const items = t.items || [];
      rows.push([
        t.date, t.time || '', t.customerName || '',
        U.sum(items, it => it.qty) || 1,
        items.map(it => `${it.name} x${it.qty}`).join(', '),
        t.subtotal || t.total, t.discount || 0, t.total, methodName(t.method),
        t.cashGiven || 0, t.change || 0, t.note || ''
      ]);
    });
    return rows;
  }

  function expenseRows(list) {
    const rows = [['Tanggal', 'Jam', 'Kategori', 'Jumlah', 'Metode Bayar', 'Catatan']];
    list.filter(t => t.type === 'expense').forEach(t => {
      rows.push([
        t.date, t.time || '', S().getCategory(t.categoryId).name,
        t.total, methodName(t.method), t.note || ''
      ]);
    });
    return rows;
  }

  /** Sheet "Rekap Harian": berapa pelanggan tiap hari dan berapa uangnya */
  function dailyRows(list) {
    const rows = [['Tanggal', 'Jumlah Pelanggan', 'Porsi Terjual', 'Pemasukan', 'Pengeluaran', 'Selisih']];
    const byDate = U.groupBy(list, t => t.date);
    Array.from(byDate.keys()).sort().forEach(date => {
      const day = byDate.get(date);
      const incomes = day.filter(t => t.type === 'income');
      const income = U.sum(incomes, t => t.total);
      const expense = U.sum(day.filter(t => t.type === 'expense'), t => t.total);
      rows.push([
        date, incomes.length,
        U.sum(incomes, t => U.sum(t.items || [], it => it.qty)),
        income, expense, income - expense
      ]);
    });
    return rows;
  }

  /** Sheet Pre-Order: pesanan yang belum selesai beserta tenggatnya */
  function preorderRows() {
    const rows = [['Tenggat', 'Jam', 'Nama Pemesan', 'No. HP', 'Item', 'Jumlah',
                   'Harga Satuan', 'Subtotal', 'Status', 'Catatan']];
    (S().get().preorders || [])
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .forEach(po => {
        (po.items || []).forEach(it => {
          rows.push([po.dueDate, po.dueTime || '', po.customerName || '', po.phone || '',
            it.name, it.qty, it.price, it.qty * it.price, po.status, po.note || '']);
        });
      });
    return rows;
  }

  function summaryRows(list, title, rangeLabel) {
    const incomes = list.filter(t => t.type === 'income');
    const expenses = list.filter(t => t.type === 'expense');
    const income = U.sum(incomes, t => t.total);
    const expense = U.sum(expenses, t => t.total);
    return [
      ['LAPORAN USAHA', title || ''],
      ['Periode', rangeLabel || ''],
      ['Dibuat', U.formatDateFull(U.today())],
      [],
      ['RINGKASAN', ''],
      ['Total Pemasukan', income],
      ['Total Pengeluaran', expense],
      ['Laba Bersih', income - expense],
      ['Jumlah Pelanggan', incomes.length],
      ['Porsi Terjual', U.sum(incomes, t => U.sum(t.items || [], it => it.qty))],
      ['Rata-rata per Pelanggan', incomes.length ? Math.round(income / incomes.length) : 0],
      ['Jumlah Catatan Pengeluaran', expenses.length]
    ];
  }

  /** Peringkat menu, supaya terlihat item mana yang paling laku */
  function menuRows(from, to) {
    const rows = [['Menu', 'Jumlah Terjual', 'Omzet', 'Modal (HPP)', 'Untung']];
    S().topProducts(from, to).forEach(r => {
      rows.push([r.name, r.qty, r.revenue, r.cost, r.profit]);
    });
    return rows;
  }

  /**
   * Bangun seluruh workbook untuk sebuah rentang tanggal.
   * Dipakai halaman Transaksi, Laporan, dan Pengaturan.
   */
  function buildWorkbook(list, opts) {
    const o = opts || {};
    const sheets = [
      { name: 'Ringkasan', rows: summaryRows(list, o.title, o.rangeLabel), headerRows: 0 },
      { name: 'Rekap Harian', rows: dailyRows(list), headerRows: 1 },
      { name: 'Transaksi', rows: orderRows(list), headerRows: 1 },
      { name: 'Rincian Item', rows: itemRows(list), headerRows: 1 },
      { name: 'Pengeluaran', rows: expenseRows(list), headerRows: 1 }
    ];
    const po = preorderRows();
    if (po.length > 1) sheets.push({ name: 'Pre-Order', rows: po, headerRows: 1 });
    if (o.from && o.to) {
      sheets.push({ name: 'Peringkat Menu', rows: menuRows(o.from, o.to), headerRows: 1 });
    }
    return buildXlsx(sheets);
  }

  /** CSV cadangan — memakai koma, pemisah baku yang dikenali Excel & Sheets */
  function buildCSV(list) {
    return U.toCSV(itemRows(list));
  }

  /**
   * Bangun dan simpan berkas Excel. Kalau jenis berkas .xlsx ditolak
   * (bisa terjadi saat aplikasi dibuka lewat halaman Artifact), otomatis
   * turun ke CSV supaya datanya tetap bisa diambil.
   */
  function saveWorkbook(list, opts) {
    const o = opts || {};
    const UI = global.UI;
    if (!list || !list.length) {
      UI.toast('Tidak ada data untuk diekspor pada periode ini', 'warn');
      return Promise.resolve({ ok: false });
    }

    const base = o.filename || ('laporan-' + U.today());
    let bytes;
    try {
      bytes = buildWorkbook(list, o);
    } catch (err) {
      console.error('Gagal menyusun berkas Excel:', err);
      bytes = null;
    }

    const fallbackCSV = () => U.download(base + '.csv', '﻿' + buildCSV(list), 'text/csv')
      .then(res => {
        if (res.ok) UI.toast('Diunduh sebagai CSV (rincian per item)', 'success', 5000);
        else if (res.reason !== 'declined') UI.toast('Unduhan tidak bisa dijalankan di tampilan ini', 'error', 6000);
        return res;
      });

    if (!bytes) return fallbackCSV();

    return U.download(base + '.xlsx', bytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .then(res => {
        if (res.ok) {
          UI.toast('Berkas Excel diunduh — buka sheet "Rincian Item" untuk lihat per item', 'success', 6000);
          return res;
        }
        if (res.reason === 'declined') return res;
        return fallbackCSV();
      });
  }

  global.Exporter = {
    buildXlsx, buildWorkbook, buildCSV, saveWorkbook, zip, crc32,
    itemRows, orderRows, expenseRows, dailyRows, summaryRows, preorderRows, colName, safeSheetName
  };
})(window);
