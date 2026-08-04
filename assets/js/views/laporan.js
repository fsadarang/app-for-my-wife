/* =========================================================
   View: Laporan — ringkasan, grafik, analisa, ekspor
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI, C = global.Charts;
  global.Views = global.Views || {};

  const state = {
    preset: 'month',   // today | week | month | lastmonth | custom
    from: U.startOfMonth(U.today()),
    to: U.today()
  };

  function resolveRange() {
    const t = U.today();
    switch (state.preset) {
      case 'today': return { from: t, to: t, label: 'Hari Ini' };
      case 'week': return { from: U.addDays(t, -6), to: t, label: '7 Hari Terakhir' };
      case 'month': return { from: U.startOfMonth(t), to: t, label: 'Bulan ' + U.monthLabel(t) };
      case 'lastmonth': {
        const lastEnd = U.addDays(U.startOfMonth(t), -1);
        return { from: U.startOfMonth(lastEnd), to: lastEnd, label: 'Bulan ' + U.monthLabel(lastEnd) };
      }
      default: return { from: state.from, to: state.to, label: 'Periode Pilihan' };
    }
  }

  function render(root) {
    const range = resolveRange();
    const sum = S.summary(range.from, range.to);
    const days = Math.max(1, U.diffDays(range.from, range.to) + 1);

    // Periode pembanding dengan panjang yang sama, tepat sebelum periode ini
    const prevTo = U.addDays(range.from, -1);
    const prevFrom = U.addDays(prevTo, -(days - 1));
    const prev = S.summary(prevFrom, prevTo);

    const series = S.dailySeries(range.from, range.to);
    const profitSeries = series.map(d => ({ date: d.date, value: d.profit }));
    const expRows = S.expenseByCategory(range.from, range.to);
    const topRows = S.topProducts(range.from, range.to);
    const methods = S.incomeByMethod(range.from, range.to);
    const insights = buildInsights(sum, prev, series, expRows, topRows, days);

    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('chart', 22)} Laporan</h1>
          <p class="page-sub">Lihat perkembangan usahamu dan temukan hal yang bisa diperbaiki.</p>
        </div>
        <div class="page-head__actions">
          <button type="button" class="btn btn--soft" data-act="csv">${I.get('download', 18)} Ekspor CSV</button>
          <button type="button" class="btn btn--soft" data-act="print">${I.get('print', 18)} Cetak</button>
        </div>
      </section>

      <section class="filters">
        <div class="filters__row filters__row--chips">
          ${[['today', 'Hari Ini'], ['week', '7 Hari'], ['month', 'Bulan Ini'], ['lastmonth', 'Bulan Lalu'], ['custom', 'Pilih Tanggal']]
            .map(([v, label]) => `<button type="button" class="pill${state.preset === v ? ' is-active' : ''}" data-preset="${v}">${label}</button>`).join('')}
        </div>
        ${state.preset === 'custom' ? `
          <div class="filters__row filters__row--dates">
            <label class="field field--inline"><span class="field__label">Dari</span>
              <input type="date" data-from value="${state.from}"></label>
            <label class="field field--inline"><span class="field__label">Sampai</span>
              <input type="date" data-to value="${state.to}"></label>
          </div>` : ''}
      </section>

      <div id="reportPrint">
        <section class="report-head">
          <div>
            <h2 class="report-head__title">${U.escapeHtml(S.get().profile.businessName || 'Laporan Usaha')}</h2>
            <p class="report-head__range">${U.escapeHtml(range.label)} • ${U.formatDate(range.from, true)} – ${U.formatDate(range.to, true)} (${days} hari)</p>
          </div>
          <span class="report-head__stamp">Dicetak ${U.formatDate(U.today(), true)}</span>
        </section>

        <section class="report-cards">
          ${bigCard('Total Pemasukan', sum.income, prev.income, 'arrowUp', 'income',
            `${sum.orderCount} transaksi • rata-rata ${U.rupiah(sum.avgOrder)}/transaksi`)}
          ${bigCard('Total Pengeluaran', sum.expense, prev.expense, 'arrowDown', 'expense',
            `${sum.expenseCount} catatan • ${sum.income ? ((sum.expense / sum.income) * 100).toFixed(0) + '% dari pemasukan' : 'belum ada pemasukan'}`, true)}
          ${bigCard('Laba Bersih', sum.profit, prev.profit, 'trendUp', sum.profit >= 0 ? 'profit' : 'loss',
            `Margin ${sum.income ? sum.margin.toFixed(1) : '0'}% • rata-rata ${U.rupiah(sum.profit / days)}/hari`)}
        </section>

        ${insights.length ? `
          <section class="insights">
            ${insights.map(ins => `
              <article class="insight insight--${ins.tone}">
                <span class="insight__icon">${ins.emoji}</span>
                <div>
                  <h3 class="insight__title">${ins.title}</h3>
                  <p class="insight__text">${ins.text}</p>
                </div>
              </article>`).join('')}
          </section>` : ''}

        <section class="card">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('chart', 18)} Pemasukan &amp; Pengeluaran Harian</h2>
              <p class="card__sub">Batang hijau = uang masuk, merah = uang keluar</p>
            </div>
            <div class="legend">
              <span class="legend__item"><i class="dot dot--income"></i> Masuk</span>
              <span class="legend__item"><i class="dot dot--expense"></i> Keluar</span>
            </div>
          </div>
          <div class="chart-host" data-chart-bars></div>
        </section>

        <section class="card">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('trendUp', 18)} Tren Laba Harian</h2>
              <p class="card__sub">Naik-turunnya keuntungan tiap hari</p>
            </div>
          </div>
          <div class="chart-host" data-chart-line></div>
        </section>

        <div class="grid grid--1-1">
          <section class="card">
            <div class="card__head">
              <h2 class="card__title">${I.get('piggy', 18)} Ke Mana Uang Keluar?</h2>
            </div>
            <div class="chart-host" data-chart-donut></div>
          </section>

          <section class="card">
            <div class="card__head">
              <h2 class="card__title">${I.get('wallet', 18)} Cara Pembayaran</h2>
              <span class="card__sub">${methods.length} metode dipakai</span>
            </div>
            ${methods.length ? `
              <ul class="method-list">
                ${methods.map(m => {
                  const pct = sum.income ? (m.total / sum.income) * 100 : 0;
                  return `
                    <li class="method-row">
                      <span class="method-row__emoji">${m.emoji}</span>
                      <div class="method-row__body">
                        <div class="method-row__line">
                          <span>${U.escapeHtml(m.name)}</span>
                          <b>${U.rupiah(m.total)}</b>
                        </div>
                        <div class="method-row__bar"><i style="width:${Math.max(3, pct)}%"></i></div>
                        <span class="method-row__meta">${m.count} transaksi • ${pct.toFixed(0)}%</span>
                      </div>
                    </li>`;
                }).join('')}
              </ul>` : `<p class="chart-empty">Belum ada pemasukan pada periode ini.</p>`}
          </section>
        </div>

        <section class="card">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('star', 18)} Performa Menu</h2>
              <p class="card__sub">Diurutkan dari yang paling banyak terjual</p>
            </div>
          </div>
          ${topRows.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th class="ta-r">Terjual</th>
                    <th class="ta-r">Omzet</th>
                    <th class="ta-r">Modal (HPP)</th>
                    <th class="ta-r">Untung</th>
                    <th class="ta-r">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  ${topRows.map(r => {
                    const margin = r.revenue ? (r.profit / r.revenue) * 100 : 0;
                    const hasCost = r.cost > 0;
                    return `
                      <tr>
                        <td class="td-menu"><span>${r.emoji || '🍽️'}</span> ${U.escapeHtml(r.name)}</td>
                        <td class="ta-r">${U.number(r.qty)}</td>
                        <td class="ta-r">${U.rupiah(r.revenue)}</td>
                        <td class="ta-r">${hasCost ? U.rupiah(r.cost) : '–'}</td>
                        <td class="ta-r ${hasCost ? (r.profit >= 0 ? 'is-pos' : 'is-neg') : ''}">${hasCost ? U.rupiah(r.profit) : '–'}</td>
                        <td class="ta-r">${hasCost ? `<span class="badge badge--${margin >= 40 ? 'good' : margin >= 20 ? 'warn' : 'bad'}">${margin.toFixed(0)}%</span>` : '–'}</td>
                      </tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th class="ta-r">${U.number(U.sum(topRows, r => r.qty))}</th>
                    <th class="ta-r">${U.rupiah(U.sum(topRows, r => r.revenue))}</th>
                    <th class="ta-r">${U.rupiah(U.sum(topRows, r => r.cost))}</th>
                    <th class="ta-r">${U.rupiah(U.sum(topRows, r => r.profit))}</th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p class="note">${I.get('info', 15)} Kolom <b>Untung</b> dihitung dari HPP tiap menu, jadi hanya akurat kalau HPP sudah diisi. Angka di tabel ini terpisah dari Laba Bersih di atas: <b>Omzet</b> dihitung sebelum diskon, sedangkan Laba Bersih memakai nilai transaksi sesungguhnya dan seluruh pengeluaran nyata.</p>
          ` : UI.emptyState({ emoji: '🍽️', title: 'Belum ada menu terjual', text: 'Catat penjualan lewat halaman Kasir agar performa menu bisa dianalisa.' })}
        </section>

        <section class="card">
          <div class="card__head">
            <h2 class="card__title">${I.get('note', 18)} Rincian Pengeluaran</h2>
          </div>
          ${expRows.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Kategori</th><th class="ta-r">Catatan</th><th class="ta-r">Jumlah</th><th class="ta-r">Porsi</th></tr></thead>
                <tbody>
                  ${expRows.map(r => `
                    <tr>
                      <td class="td-menu"><span>${r.emoji}</span> ${U.escapeHtml(r.name)}</td>
                      <td class="ta-r">${r.count}</td>
                      <td class="ta-r">${U.rupiah(r.total)}</td>
                      <td class="ta-r">${sum.expense ? ((r.total / sum.expense) * 100).toFixed(0) : 0}%</td>
                    </tr>`).join('')}
                </tbody>
                <tfoot><tr><th>Total</th><th class="ta-r">${sum.expenseCount}</th><th class="ta-r">${U.rupiah(sum.expense)}</th><th class="ta-r">100%</th></tr></tfoot>
              </table>
            </div>` : `<p class="chart-empty">Belum ada pengeluaran pada periode ini.</p>`}
        </section>
      </div>`;

    C.bars(root.querySelector('[data-chart-bars]'), series, { height: 260 });
    C.line(root.querySelector('[data-chart-line]'), profitSeries, { height: 220, label: 'Laba' });
    C.donut(root.querySelector('[data-chart-donut]'), expRows, { centerLabel: 'Total keluar' });

    root.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      state.preset = b.dataset.preset;
      render(root);
    }));

    const fromEl = root.querySelector('[data-from]');
    const toEl = root.querySelector('[data-to]');
    if (fromEl) fromEl.addEventListener('change', () => {
      state.from = fromEl.value;
      if (state.from > state.to) state.to = state.from;
      render(root);
    });
    if (toEl) toEl.addEventListener('change', () => {
      state.to = toEl.value;
      if (state.to < state.from) state.from = state.to;
      render(root);
    });

    root.querySelector('[data-act=csv]').addEventListener('click', () => exportReport(range, sum, series, expRows, topRows));
    root.querySelector('[data-act=print]').addEventListener('click', () => {
      const target = root.querySelector('#reportPrint');
      document.body.classList.add('is-printing');
      target.classList.add('print-target');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('is-printing');
        target.classList.remove('print-target');
      }, 500);
    });
  }

  function bigCard(label, value, prevValue, icon, tone, hint, invert) {
    const change = U.pctChange(value, prevValue);
    const show = isFinite(change) && Math.abs(change) >= 1 && prevValue !== 0;
    const up = change > 0;
    const good = invert ? !up : up;
    return `
      <article class="report-card report-card--${tone}">
        <div class="report-card__top">
          <span class="report-card__icon">${I.get(icon, 22)}</span>
          <span class="report-card__label">${U.escapeHtml(label)}</span>
        </div>
        <strong class="report-card__value">${U.rupiah(value)}</strong>
        <div class="report-card__foot">
          ${show ? `<span class="delta ${good ? 'delta--good' : 'delta--bad'}">
            ${I.get(up ? 'trendUp' : 'trendDown', 14)} ${Math.abs(change).toFixed(0)}% vs periode sebelumnya</span>` :
            `<span class="delta delta--flat">Periode sebelumnya: ${U.rupiah(prevValue)}</span>`}
          <span class="report-card__hint">${hint}</span>
        </div>
      </article>`;
  }

  /* ---------- Insight otomatis ---------- */

  function buildInsights(sum, prev, series, expRows, topRows, days) {
    const out = [];
    if (!sum.transactions.length) {
      return [{
        tone: 'info', emoji: '📭', title: 'Belum ada data di periode ini',
        text: 'Coba pilih periode lain, atau mulai catat penjualan hari ini lewat halaman Kasir.'
      }];
    }

    const best = series.slice().sort((a, b) => b.income - a.income)[0];
    if (best && best.income > 0) {
      out.push({
        tone: 'good', emoji: '🏆', title: 'Hari paling ramai',
        text: `<b>${U.formatDateRelative(best.date)}</b> dengan pemasukan <b>${U.rupiah(best.income)}</b>. Cari tahu apa yang beda hari itu — bisa diulang.`
      });
    }

    const avg = sum.income / days;
    out.push({
      tone: 'info', emoji: '📊', title: 'Rata-rata harian',
      text: `Pemasukan rata-rata <b>${U.rupiah(avg)}</b> per hari selama ${days} hari, dengan laba rata-rata <b>${U.rupiah(sum.profit / days)}</b> per hari.`
    });

    if (expRows.length && sum.expense > 0) {
      const top = expRows[0];
      const pct = (top.total / sum.expense) * 100;
      out.push({
        tone: pct > 60 ? 'warn' : 'info', emoji: top.emoji || '💸', title: 'Pengeluaran terbesar',
        text: `<b>${U.escapeHtml(top.name)}</b> menyerap <b>${U.rupiah(top.total)}</b> (${pct.toFixed(0)}% dari seluruh pengeluaran).` +
          (pct > 60 ? ' Porsinya cukup dominan — bandingkan harga dari beberapa pemasok.' : '')
      });
    }

    if (sum.profit < 0) {
      out.push({
        tone: 'bad', emoji: '⚠️', title: 'Pengeluaran melebihi pemasukan',
        text: `Periode ini rugi <b>${U.rupiah(Math.abs(sum.profit))}</b>. Wajar bila kamu baru belanja stok besar. Kalau berulang, periksa harga jual dan porsi belanja.`
      });
    } else if (sum.income > 0 && sum.margin < 15) {
      out.push({
        tone: 'warn', emoji: '📉', title: 'Margin tipis',
        text: `Dari setiap ${U.rupiah(100000)} pemasukan, laba bersihnya hanya sekitar <b>${U.rupiah(sum.margin * 1000)}</b> (${sum.margin.toFixed(1)}%). Coba tinjau harga jual atau tekan biaya bahan.`
      });
    }

    const withCost = topRows.filter(r => r.cost > 0 && r.revenue > 0);
    if (withCost.length >= 2) {
      const byProfit = withCost.slice().sort((a, b) => b.profit - a.profit);
      const star = byProfit[0];
      const weakest = withCost.slice().sort((a, b) => (a.profit / a.revenue) - (b.profit / b.revenue))[0];
      out.push({
        tone: 'good', emoji: star.emoji || '⭐', title: 'Menu penyumbang untung terbesar',
        text: `<b>${U.escapeHtml(star.name)}</b> menghasilkan untung <b>${U.rupiah(star.profit)}</b> dari ${U.number(star.qty)} porsi. Pertimbangkan menonjolkannya saat menawarkan ke pembeli.`
      });
      const wm = weakest.revenue ? (weakest.profit / weakest.revenue) * 100 : 0;
      if (wm < 20) {
        out.push({
          tone: 'warn', emoji: '🔍', title: 'Menu dengan margin paling tipis',
          text: `<b>${U.escapeHtml(weakest.name)}</b> hanya menyisakan <b>${wm.toFixed(0)}%</b> dari harga jualnya. Cek lagi porsi bahan atau harga jualnya.`
        });
      }
    } else if (!withCost.length && topRows.length) {
      out.push({
        tone: 'info', emoji: '💡', title: 'Lengkapi HPP menumu',
        text: 'Isi modal bahan (HPP) tiap menu di halaman <b>Menu</b> supaya aplikasi bisa menunjukkan menu mana yang benar-benar menguntungkan.'
      });
    }

    const growth = U.pctChange(sum.income, prev.income);
    if (prev.income > 0 && Math.abs(growth) >= 10) {
      out.push({
        tone: growth > 0 ? 'good' : 'warn', emoji: growth > 0 ? '📈' : '📉',
        title: growth > 0 ? 'Pemasukan naik' : 'Pemasukan turun',
        text: `Dibanding periode sebelumnya (${U.formatDate(prev.from)} – ${U.formatDate(prev.to)}), pemasukan ${growth > 0 ? 'naik' : 'turun'} <b>${Math.abs(growth).toFixed(0)}%</b>.`
      });
    }

    return out;
  }

  /* ---------- Ekspor ---------- */

  function exportReport(range, sum, series, expRows, topRows) {
    const st = S.get();
    const rows = [];
    rows.push(['LAPORAN USAHA', st.profile.businessName || '']);
    rows.push(['Periode', `${range.from} s/d ${range.to}`]);
    rows.push([]);
    rows.push(['RINGKASAN']);
    rows.push(['Total Pemasukan', sum.income]);
    rows.push(['Total Pengeluaran', sum.expense]);
    rows.push(['Laba Bersih', sum.profit]);
    rows.push(['Margin (%)', sum.margin.toFixed(1)]);
    rows.push(['Jumlah Transaksi Penjualan', sum.orderCount]);
    rows.push(['Porsi Terjual', sum.itemsSold]);
    rows.push([]);
    rows.push(['RINCIAN HARIAN']);
    rows.push(['Tanggal', 'Pemasukan', 'Pengeluaran', 'Laba']);
    series.forEach(d => rows.push([d.date, d.income, d.expense, d.profit]));
    rows.push([]);
    rows.push(['PENGELUARAN PER KATEGORI']);
    rows.push(['Kategori', 'Jumlah Catatan', 'Total']);
    expRows.forEach(r => rows.push([r.name, r.count, r.total]));
    rows.push([]);
    rows.push(['PERFORMA MENU']);
    rows.push(['Menu', 'Terjual', 'Omzet', 'Modal (HPP)', 'Untung']);
    topRows.forEach(r => rows.push([r.name, r.qty, r.revenue, r.cost, r.profit]));

    U.download(`laporan-${range.from}-sd-${range.to}.csv`, '﻿' + U.toCSV(rows), 'text/csv');
    UI.toast('Laporan CSV diunduh', 'success');
  }

  global.Views.laporan = render;
})(window);
