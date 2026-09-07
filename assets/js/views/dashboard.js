/* =========================================================
   View: Beranda (Dashboard)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI, C = global.Charts;
  global.Views = global.Views || {};

  let chartRange = 7; // 7 | 14 | 30

  function kpiCard(opts) {
    const change = opts.change;
    const hasChange = typeof change === 'number' && isFinite(change);
    const up = hasChange && change > 0;
    const down = hasChange && change < 0;
    const goodUp = opts.invert ? down : up;
    const goodDown = opts.invert ? up : down;

    return `
      <article class="kpi kpi--${opts.tone}">
        <div class="kpi__top">
          <span class="kpi__icon">${I.get(opts.icon, 20)}</span>
          <span class="kpi__label">${U.escapeHtml(opts.label)}</span>
        </div>
        <strong class="kpi__value">${opts.value}</strong>
        <div class="kpi__foot">
          ${hasChange && Math.abs(change) > 0.5 ? `
            <span class="delta ${goodUp ? 'delta--good' : goodDown ? 'delta--bad' : 'delta--flat'}">
              ${I.get(up ? 'trendUp' : 'trendDown', 14)} ${Math.abs(change).toFixed(0)}%
            </span>` : ''}
          <span class="kpi__hint">${U.escapeHtml(opts.hint || '')}</span>
        </div>
      </article>`;
  }

  function render(root) {
    const st = S.get();
    const t = U.today();
    const yesterday = U.addDays(t, -1);
    const todaySum = S.summary(t, t);
    const ydaySum = S.summary(yesterday, yesterday);
    const monthSum = S.summary(U.startOfMonth(t), t);
    const target = Number(st.profile.dailyTarget) || 0;
    const balance = S.cashBalance();
    const hasAnyData = st.transactions.length > 0;

    const from = U.addDays(t, -(chartRange - 1));
    const series = S.dailySeries(from, t);
    const topRows = S.topProducts(from, t, 5);
    const expRows = S.expenseByCategory(from, t);
    const recent = S.sortedDesc(st.transactions).slice(0, 6);

    root.innerHTML = `
      <section class="hero">
        <div class="hero__text">
          <p class="hero__greeting">${U.escapeHtml(U.greeting())}${st.profile.ownerName ? ', ' + U.escapeHtml(st.profile.ownerName) : ''} 👋</p>
          <h1 class="hero__title">${U.escapeHtml(st.profile.businessName || 'Catatan Usaha Makanan')}</h1>
          <p class="hero__date">${I.get('calendar', 15)} ${U.formatDateFull(t)}</p>
        </div>
        <div class="hero__actions">
          <button type="button" class="btn btn--income btn--lg" data-act="sale">
            ${I.get('cart', 20)} Catat Penjualan
          </button>
          <button type="button" class="btn btn--expense btn--lg" data-act="expense">
            ${I.get('wallet', 20)} Catat Pengeluaran
          </button>
        </div>
      </section>

      ${!hasAnyData ? `
        <div class="callout callout--start">
          <span class="callout__emoji">🚀</span>
          <div>
            <h3>Ayo mulai catat hari ini!</h3>
            <p>Setiap penjualan dan pengeluaran yang kamu catat akan langsung muncul jadi grafik dan laporan di sini.</p>
          </div>
          <button type="button" class="btn btn--primary" data-act="sale">Catat Penjualan Pertama ${I.get('arrowRight', 16)}</button>
        </div>` : ''}

      <section class="section">
        <div class="section__head">
          <h2 class="section__title">${I.get('sparkle', 18)} Ringkasan Hari Ini</h2>
          <a class="link" href="#/laporan">Lihat laporan ${I.get('chevronRight', 14)}</a>
        </div>
        <div class="kpi-grid">
          ${kpiCard({
            label: 'Pemasukan', icon: 'arrowUp', tone: 'income',
            value: U.rupiah(todaySum.income),
            change: U.pctChange(todaySum.income, ydaySum.income),
            hint: `${todaySum.customerCount} pelanggan • ${U.number(todaySum.itemsSold)} porsi`
          })}
          ${kpiCard({
            label: 'Pengeluaran', icon: 'arrowDown', tone: 'expense',
            value: U.rupiah(todaySum.expense),
            change: U.pctChange(todaySum.expense, ydaySum.expense), invert: true,
            hint: `${todaySum.expenseCount} catatan`
          })}
          ${kpiCard({
            label: 'Laba Hari Ini', icon: 'trendUp', tone: todaySum.profit >= 0 ? 'profit' : 'loss',
            value: U.rupiah(todaySum.profit),
            change: U.pctChange(todaySum.profit, ydaySum.profit),
            hint: todaySum.income ? `Margin ${todaySum.margin.toFixed(0)}%` : 'Belum ada penjualan'
          })}
          ${kpiCard({
            label: 'Saldo Kas', icon: 'wallet', tone: 'cash',
            value: U.rupiah(balance),
            hint: 'Modal awal + masuk − keluar'
          })}
        </div>
      </section>

      ${(() => {
        const po = S.preorderSummary();
        if (!po.pendingCount) return '';
        const soon = po.late.concat(po.today, po.tomorrow).slice(0, 4);
        return `
        <section class="card card--po">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('calendar', 18)} Pre-Order Menunggu</h2>
              <p class="card__sub">${po.pendingCount} pesanan • ${U.number(po.pendingItems)} porsi • ${U.rupiah(po.pendingValue)}</p>
            </div>
            <a class="link" href="#/preorder">Buka semua ${I.get('chevronRight', 14)}</a>
          </div>
          ${po.lateCount ? `<p class="po-warn">${I.get('alert', 15)} <b>${po.lateCount}</b> pesanan sudah lewat tenggat</p>` : ''}
          ${soon.length ? `<ul class="po-mini">
            ${soon.map(x => {
              const d = global.Views.preorderDueInfo(x.dueDate);
              return `<li class="po-mini__row">
                <span class="po-badge po-badge--${d.tone}">${d.label}</span>
                <span class="po-mini__name">${U.escapeHtml(x.customerName || 'Tanpa nama')}</span>
                <span class="po-mini__qty">${U.number(U.sum(x.items || [], it => it.qty))} porsi</span>
              </li>`;
            }).join('')}
          </ul>` : `<p class="card__sub">Pesanan terdekat masih beberapa hari lagi.</p>`}
        </section>`;
      })()}

      ${(() => {
        // Dua kelompok saja, sesuai yang penting sehari-hari: uang yang ada
        // di laci, dan uang yang tidak. Rincian non-tunai tetap dibawa
        // supaya saldo ojol yang belum cair masih bisa ditelusuri.
        const g = S.balanceGrouped();
        const adaIsi = g.tunai.jumlahTransaksi || g.nonTunai.jumlahTransaksi ||
          g.tunai.saldo !== 0 || g.nonTunai.saldo !== 0;
        if (!adaIsi) return '';

        const grup = (r, ket, kelas) => `
          <div class="dompet__grup${kelas}">
            <span class="dompet__emoji">${r.emoji}</span>
            <span class="dompet__name">
              ${U.escapeHtml(r.name)}
              <small>${ket}</small>
            </span>
            <span class="dompet__val ${r.saldo < 0 ? 'is-neg' : ''}">${U.rupiah(r.saldo)}</span>
          </div>`;

        return `
        <section class="card card--dompet">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('wallet', 18)} Uang Kamu Ada di Mana</h2>
              <p class="card__sub">Total ${U.rupiah(balance)}</p>
            </div>
            <button type="button" class="link" data-act="atur-kas">Sesuaikan ${I.get('chevronRight', 14)}</button>
          </div>

          <div class="dompet">
            ${grup(g.tunai, 'bisa dipegang hari ini', ' is-tunai')}

            ${grup(g.nonTunai, 'di rekening atau masih ditahan', ' is-nontunai')}
            ${g.nonTunai.rincian.length ? `
              <ul class="dompet__sub">
                ${g.nonTunai.rincian.map(r => `
                  <li class="dompet__subrow">
                    <span class="dompet__subemoji">${r.emoji}</span>
                    <span class="dompet__subname">${U.escapeHtml(r.name)}</span>
                    <span class="dompet__subval ${r.saldo < 0 ? 'is-neg' : ''}">${U.rupiah(r.saldo)}</span>
                  </li>`).join('')}
              </ul>` : ''}
          </div>
        </section>`;
      })()}

      ${(() => {
        const stok = S.stockSummary(t);
        if (!stok.diaturCount) return '';
        const rows = stok.diatur.slice().sort((a, b) => a.sisa - b.sisa).slice(0, 6);
        return `
        <section class="card card--stok">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('package', 18)} Stok Hari Ini</h2>
              <p class="card__sub">${stok.dibuat} dibuat • ${stok.terjual} terjual • ${stok.dikeep} di-keep • <b>sisa ${stok.sisa}</b></p>
              <p class="card__sub card__sub--money">${I.get('coins', 13)} Kalau sisanya habis terjual: <b>${U.rupiah(stok.nilaiSisa)}</b></p>
            </div>
            <a class="link" href="#/menu?tab=stok">Atur stok ${I.get('chevronRight', 14)}</a>
          </div>
          ${stok.habis ? `<p class="po-warn">${I.get('alert', 15)} <b>${stok.habis}</b> menu sudah habis</p>` : ''}
          <ul class="stok-mini">
            ${rows.map(r => {
              const tone = r.sisa <= 0 ? 'bad' : r.sisa <= S.LOW_STOCK ? 'warn' : 'good';
              return `<li class="stok-mini__row">
                <span class="stok-mini__emoji">${r.emoji || '🍽️'}</span>
                <span class="stok-mini__name">${U.escapeHtml(r.name)}</span>
                <span class="stok-mini__meta">${r.terjual} terjual • ${r.dikeep} keep</span>
                <span class="stok-mini__left is-${tone}">${r.sisa <= 0 ? 'habis' : r.sisa}</span>
              </li>`;
            }).join('')}
          </ul>
        </section>`;
      })()}

      <div class="grid grid--2-1">
        <section class="card">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('chart', 18)} Uang Masuk vs Keluar</h2>
              <p class="card__sub">${chartRange} hari terakhir</p>
            </div>
            <div class="seg" role="tablist" aria-label="Rentang grafik">
              ${[7, 14, 30].map(n => `
                <button type="button" class="seg__btn${chartRange === n ? ' is-active' : ''}" data-range="${n}" role="tab"
                  aria-selected="${chartRange === n}">${n}h</button>`).join('')}
            </div>
          </div>
          <div class="legend">
            <span class="legend__item"><i class="dot dot--income"></i> Pemasukan</span>
            <span class="legend__item"><i class="dot dot--expense"></i> Pengeluaran</span>
          </div>
          <div class="chart-host" data-chart-bars></div>
        </section>

        <section class="card card--target">
          <div class="card__head">
            <h2 class="card__title">${I.get('target', 18)} Target Harian</h2>
            <button type="button" class="icon-btn" data-act="edit-target" aria-label="Ubah target">${I.get('edit', 16)}</button>
          </div>
          ${target > 0 ? `
            <div class="target">
              ${C.progressRing(todaySum.income, target, 110)}
              <div class="target__info">
                <p class="target__now">${U.rupiah(todaySum.income)}</p>
                <p class="target__of">dari target ${U.rupiah(target)}</p>
                ${todaySum.income >= target
                  ? `<p class="target__msg is-done">🎉 Target tercapai! Kerja bagus!</p>`
                  : `<p class="target__msg">Kurang ${U.rupiah(target - todaySum.income)} lagi 💪</p>`}
              </div>
            </div>` : `
            <div class="target target--empty">
              <p>Belum ada target harian. Target membantu kamu tahu apakah penjualan hari ini sudah cukup.</p>
              <button type="button" class="btn btn--soft" data-act="edit-target">${I.get('target', 16)} Atur Target</button>
            </div>`}
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="mini-stat__label">Bulan ini</span>
              <strong class="mini-stat__value">${U.rupiah(monthSum.income)}</strong>
            </div>
            <div class="mini-stat">
              <span class="mini-stat__label">Laba bulan ini</span>
              <strong class="mini-stat__value ${monthSum.profit < 0 ? 'is-neg' : 'is-pos'}">${U.rupiah(monthSum.profit)}</strong>
            </div>
            <div class="mini-stat">
              <span class="mini-stat__label">Porsi terjual</span>
              <strong class="mini-stat__value">${U.number(monthSum.itemsSold)}</strong>
            </div>
          </div>
        </section>
      </div>

      <div class="grid grid--1-1">
        <section class="card">
          <div class="card__head">
            <h2 class="card__title">${I.get('star', 18)} Menu Terlaris</h2>
            <span class="card__sub">${chartRange} hari terakhir</span>
          </div>
          ${topRows.length ? `
            <ol class="rank">
              ${topRows.map((r, i) => {
                const max = topRows[0].qty || 1;
                return `
                <li class="rank__item">
                  <span class="rank__no rank__no--${i + 1}">${i + 1}</span>
                  <span class="rank__emoji">${r.emoji || '🍽️'}</span>
                  <div class="rank__body">
                    <div class="rank__line">
                      <span class="rank__name">${U.escapeHtml(r.name)}</span>
                      <span class="rank__qty">${U.number(r.qty)} porsi</span>
                    </div>
                    <div class="rank__bar"><i style="width:${Math.max(6, (r.qty / max) * 100)}%"></i></div>
                    <div class="rank__meta">Omzet ${U.rupiah(r.revenue)}${r.cost ? ` • Untung ${U.rupiah(r.profit)}` : ''}</div>
                  </div>
                </li>`;
              }).join('')}
            </ol>` : UI.emptyState({
              emoji: '🍜',
              title: 'Belum ada menu terjual',
              text: 'Catat penjualan lewat halaman Kasir supaya menu terlaris muncul di sini.',
              actionLabel: 'Buka Kasir', actionIcon: 'cart'
            })}
        </section>

        <section class="card">
          <div class="card__head">
            <h2 class="card__title">${I.get('piggy', 18)} Pengeluaran Terbesar</h2>
            <span class="card__sub">${chartRange} hari terakhir</span>
          </div>
          <div class="chart-host" data-chart-donut></div>
        </section>
      </div>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('clock', 18)} Aktivitas Terakhir</h2>
          <a class="link" href="#/transaksi">Semua transaksi ${I.get('chevronRight', 14)}</a>
        </div>
        ${recent.length ? `<ul class="trx-list">${recent.map(trxRow).join('')}</ul>` : UI.emptyState({
          emoji: '📝',
          title: 'Belum ada transaksi',
          text: 'Semua catatan penjualan dan pengeluaran akan tampil di sini.'
        })}
      </section>
    `;

    /* --- Grafik --- */
    C.bars(root.querySelector('[data-chart-bars]'), series, { height: 250 });
    C.donut(root.querySelector('[data-chart-donut]'), expRows, { centerLabel: 'Total keluar' });

    /* --- Interaksi --- */
    root.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        chartRange = Number(btn.dataset.range);
        render(root);
      });
    });

    root.querySelectorAll('[data-act=sale]').forEach(b =>
      b.addEventListener('click', () => UI.navigate('kasir')));

    root.querySelectorAll('[data-act=expense]').forEach(b =>
      b.addEventListener('click', () => global.Forms.expenseModal(null, () => render(root))));

    root.querySelectorAll('[data-act=edit-target]').forEach(b =>
      b.addEventListener('click', () => targetModal(() => render(root))));

    const aturKas = root.querySelector('[data-act=atur-kas]');
    if (aturKas) aturKas.addEventListener('click', () =>
      global.Forms.cashAdjustModal(() => { global.App.refreshShell(); render(root); }));

    const emptyBtn = root.querySelector('[data-empty-action]');
    if (emptyBtn) emptyBtn.addEventListener('click', () => UI.navigate('kasir'));

    // Tombol struk berada di dalam baris, jadi klik-nya jangan ikut membuka
    // jendela rincian.
    UI.on(root, 'click', '[data-receipt]', (e, node) => {
      e.stopPropagation();
      const trx = S.getTransaction(node.dataset.receipt);
      if (trx) global.Forms.receiptModal(trx);
    }, 'ReceiptDashboard');

    UI.on(root, 'click', '[data-trx]', (e, node) => {
      if (e.target.closest('[data-receipt]')) return;
      const trx = S.getTransaction(node.dataset.trx);
      if (!trx) return;
      if (trx.type === 'income') global.Forms.incomeDetailModal(trx, () => render(root));
      else global.Forms.expenseModal(trx, () => render(root));
    }, 'TrxDashboard');
  }

  /** Baris transaksi ringkas (dipakai juga di halaman lain) */
  /**
   * Satu baris transaksi, dipakai bersama oleh Beranda dan halaman Transaksi.
   *
   * `opts.pilih` menyalakan kotak centang untuk hapus borongan. Dijaga agar
   * tetap aman dipanggil lewat .map() — argumen kedua dari map adalah angka
   * indeks, dan itu diabaikan, bukan disalahartikan sebagai pengaturan.
   */
  function trxRow(t, opts) {
    const o = (opts && typeof opts === 'object') ? opts : {};
    const isIncome = t.type === 'income';
    const cat = isIncome ? null : S.getCategory(t.categoryId);
    const method = S.PAYMENT_METHODS.find(m => m.id === t.method);
    const itemText = (t.items && t.items.length)
      ? t.items.map(it => `${it.name}${it.qty > 1 ? ' ×' + it.qty : ''}`).join(', ')
      : '';
    // Nama pelanggan jadi judul barisnya; pesanannya turun ke baris keterangan.
    const title = isIncome
      ? (t.customerName || itemText || 'Pemasukan')
      : cat.name;
    const emoji = isIncome ? (t.items && t.items.length ? (t.items[0].emoji || '🧾') : '💰') : cat.emoji;

    const dipilih = !!(o.pilih && o.terpilih && o.terpilih.has(t.id));

    return `
      <li class="trx${o.pilih ? ' trx--pilih' : ''}${dipilih ? ' is-dipilih' : ''}"
          data-trx="${t.id}" tabindex="0" role="${o.pilih ? 'checkbox' : 'button'}"
          ${o.pilih ? `aria-checked="${dipilih}"` : ''}>
        ${o.pilih ? `<span class="trx__check${dipilih ? ' is-on' : ''}" aria-hidden="true">
          ${dipilih ? I.get('check', 15) : ''}
        </span>` : ''}
        <span class="trx__avatar trx__avatar--${isIncome ? 'income' : 'expense'}">${emoji}</span>
        <div class="trx__body">
          <p class="trx__title">${U.escapeHtml(title)}${t.adjustment
            ? ' <span class="badge badge--muted">penyesuaian</span>' : ''}</p>
          ${isIncome && t.customerName && itemText
            ? `<p class="trx__items">${U.escapeHtml(itemText)}</p>` : ''}
          <p class="trx__meta">
            ${U.formatDateRelative(t.date)} • ${t.time || '-'}
            ${method ? ` • ${method.emoji} ${U.escapeHtml(method.name)}` : ''}
            ${t.change ? ` • kembali ${U.rupiah(t.change)}` : ''}
            ${t.note ? ` • ${U.escapeHtml(t.note)}` : ''}
          </p>
        </div>
        <span class="trx__amount trx__amount--${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '−'}${U.rupiah(t.total)}
        </span>
        ${isIncome && !o.pilih ? `
          <button type="button" class="trx__receipt" data-receipt="${t.id}"
                  title="Cetak struk" aria-label="Cetak struk ${U.escapeHtml(title)}">
            ${I.get('receipt', 16)}
          </button>` : ''}
        ${o.pilih ? '' : `<span class="trx__chev">${I.get('chevronRight', 16)}</span>`}
      </li>`;
  }

  /** Modal kecil untuk mengubah target harian */
  function targetModal(onDone) {
    const cur = Number(S.get().profile.dailyTarget) || 0;
    UI.modal({
      title: 'Target Penjualan Harian',
      subtitle: 'Berapa omzet yang ingin dicapai setiap hari?',
      icon: 'target',
      size: 'sm',
      body: `
        <form class="form" id="targetForm">
          ${global.Forms.amountField('targetAmount', 'Target per hari', cur)}
          <p class="form__hint form__hint--muted">${I.get('bulb', 15)} Tips: mulai dari rata-rata penjualan harianmu, lalu naikkan pelan-pelan.</p>
        </form>`,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="targetForm" class="btn btn--primary">${I.get('save', 18)} Simpan</button>`,
      onMount: h => {
        const input = global.Forms.bindAmount(h.root, 'targetAmount');
        h.root.querySelector('[data-act=cancel]').addEventListener('click', () => h.close());
        h.root.querySelector('#targetForm').addEventListener('submit', e => {
          e.preventDefault();
          S.updateProfile({ dailyTarget: U.parseNumber(input.value) });
          UI.toast('Target harian disimpan', 'success');
          h.close();
          if (onDone) onDone();
        });
      }
    });
  }

  global.Views.dashboard = render;
  global.Views.trxRow = trxRow;
  global.Views.targetModal = targetModal;
})(window);
