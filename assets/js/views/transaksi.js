/* =========================================================
   View: Transaksi — daftar lengkap, bisa disaring & diubah
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  const PAGE = 200;   // batas baris yang digambar sekaligus, agar tetap ringan
  let shown = PAGE;

  // Mode pilih untuk hapus banyak sekaligus
  let pilihMode = false;
  const terpilih = new Set();

  function keluarModePilih() { pilihMode = false; terpilih.clear(); }

  const filter = {
    type: 'all',      // all | income | expense
    preset: 'today',  // today | week | month | all | custom
    from: U.today(),
    to: U.today(),
    q: '',
    category: 'all'
  };

  /** Dipanggil setiap saringan berubah, supaya daftar kembali ke halaman pertama */
  function resetPaging() {
    shown = PAGE;
    // Pilihan ikut dikosongkan: catatan yang tadi dipilih bisa saja sudah
    // tidak tampil setelah saringan berubah, dan menghapus sesuatu yang
    // tidak terlihat di layar terlalu mudah disesali.
    terpilih.clear();
  }

  // Wadah halaman dibuat baru tiap kali berpindah menu. Kalau wadahnya
  // berganti, artinya pengguna baru masuk lagi ke halaman ini — mode pilih
  // jangan sampai menempel dari kunjungan sebelumnya.
  let wadahTerakhir = null;

  function resolveRange() {
    const t = U.today();
    switch (filter.preset) {
      case 'today': return { from: t, to: t };
      case 'week': return { from: U.addDays(t, -6), to: t };
      case 'month': return { from: U.startOfMonth(t), to: t };
      case 'all': return { from: S.firstDate(), to: t };
      default: return { from: filter.from, to: filter.to };
    }
  }

  function apply(params) {
    if (params && params.preset) filter.preset = params.preset;
    if (params && params.type) filter.type = params.type;
  }

  function render(root, params) {
    if (root !== wadahTerakhir) { wadahTerakhir = root; keluarModePilih(); }
    apply(params);
    const range = resolveRange();
    const cats = S.get().expenseCategories;

    let list = S.inRange(range.from, range.to);
    if (filter.type !== 'all') list = list.filter(t => t.type === filter.type);
    if (filter.category !== 'all') list = list.filter(t => t.type === 'expense' && t.categoryId === filter.category);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      list = list.filter(t => {
        const hay = [
          t.note || '',
          t.type === 'expense' ? S.getCategory(t.categoryId).name : '',
          (t.items || []).map(it => it.name).join(' '),
          String(t.total)
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    list = S.sortedDesc(list);

    // Ringkasan tetap memakai seluruh hasil saringan, meski yang digambar dibatasi.
    const income = U.sum(list.filter(t => t.type === 'income'), t => t.total);
    const expense = U.sum(list.filter(t => t.type === 'expense'), t => t.total);
    const total = list.length;
    const visible = list.slice(0, shown);
    const byDate = U.groupBy(visible, t => t.date);

    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('receipt', 22)} Transaksi</h1>
          <p class="page-sub">Semua catatan uang masuk dan keluar. Ketuk salah satu untuk mengubah.</p>
        </div>
        <div class="page-head__actions">
          ${total ? `<button type="button" class="btn btn--soft" data-act="mode-pilih">
            ${I.get('check', 18)} ${pilihMode ? 'Selesai Pilih' : 'Pilih'}
          </button>` : ''}
          <button type="button" class="btn btn--soft" data-act="export">${I.get('download', 18)} Ekspor Excel</button>
          <button type="button" class="btn btn--expense" data-act="expense">${I.get('plus', 18)} Pengeluaran</button>
          <button type="button" class="btn btn--income" data-act="income">${I.get('plus', 18)} Pemasukan</button>
        </div>
      </section>

      ${pilihMode ? `
        <div class="pilihbar">
          <div class="pilihbar__info">
            <strong>${terpilih.size} dipilih</strong>
            <span>Ketuk baris untuk memilih atau membatalkan</span>
          </div>
          <div class="pilihbar__actions">
            <button type="button" class="btn btn--soft btn--sm" data-act="pilih-semua">
              ${I.get('check', 15)} Pilih semua ${total}
            </button>
            <button type="button" class="btn btn--ghost btn--sm" data-act="pilih-batal" ${terpilih.size ? '' : 'disabled'}>
              Kosongkan
            </button>
            <button type="button" class="btn btn--danger btn--sm" data-act="hapus-terpilih" ${terpilih.size ? '' : 'disabled'}>
              ${I.get('trash', 15)} Hapus ${terpilih.size || ''}
            </button>
          </div>
        </div>` : ''}

      <section class="filters">
        <div class="filters__row">
          <div class="seg seg--wide" role="tablist" aria-label="Jenis transaksi">
            ${[['all', 'Semua', 'grid'], ['income', 'Masuk', 'arrowUp'], ['expense', 'Keluar', 'arrowDown']].map(([v, label, icon]) => `
              <button type="button" class="seg__btn${filter.type === v ? ' is-active' : ''}" data-type="${v}" role="tab">
                ${I.get(icon, 15)} ${label}
              </button>`).join('')}
          </div>
          <div class="search search--sm">
            ${I.get('search', 17, 'search__icon')}
            <input type="search" id="trxSearch" placeholder="Cari catatan, menu, atau nominal..." value="${U.escapeHtml(filter.q)}" aria-label="Cari transaksi">
          </div>
        </div>
        <div class="filters__row filters__row--chips">
          ${[['today', 'Hari ini'], ['week', '7 Hari'], ['month', 'Bulan Ini'], ['all', 'Semua'], ['custom', 'Pilih Tanggal']].map(([v, label]) => `
            <button type="button" class="pill${filter.preset === v ? ' is-active' : ''}" data-preset="${v}">${label}</button>`).join('')}
          ${filter.type !== 'income' ? `
            <select class="select select--sm" data-cat-filter aria-label="Saring kategori">
              <option value="all">Semua kategori</option>
              ${cats.map(c => `<option value="${c.id}"${filter.category === c.id ? ' selected' : ''}>${c.emoji} ${U.escapeHtml(c.name)}</option>`).join('')}
            </select>` : ''}
        </div>
        ${filter.preset === 'custom' ? `
          <div class="filters__row filters__row--dates">
            <label class="field field--inline">
              <span class="field__label">Dari</span>
              <input type="date" data-from value="${filter.from}">
            </label>
            <label class="field field--inline">
              <span class="field__label">Sampai</span>
              <input type="date" data-to value="${filter.to}">
            </label>
          </div>` : ''}
      </section>

      <section class="summary-strip">
        <div class="summary-strip__item">
          <span class="summary-strip__label">Periode</span>
          <strong>${range.from === range.to ? U.formatDate(range.from) : U.formatDate(range.from) + ' – ' + U.formatDate(range.to)}</strong>
        </div>
        <div class="summary-strip__item is-income">
          <span class="summary-strip__label">${I.get('arrowUp', 14)} Masuk</span>
          <strong>${U.rupiah(income)}</strong>
        </div>
        <div class="summary-strip__item is-expense">
          <span class="summary-strip__label">${I.get('arrowDown', 14)} Keluar</span>
          <strong>${U.rupiah(expense)}</strong>
        </div>
        <div class="summary-strip__item ${income - expense >= 0 ? 'is-profit' : 'is-loss'}">
          <span class="summary-strip__label">${I.get('scale', 14)} Selisih</span>
          <strong>${U.rupiah(income - expense)}</strong>
        </div>
        <div class="summary-strip__item">
          <span class="summary-strip__label">Jumlah</span>
          <strong>${total} catatan</strong>
        </div>
      </section>

      <section class="trx-groups">
        ${visible.length ? Array.from(byDate.keys()).map(date => {
          const rows = byDate.get(date);
          const dayIncomes = rows.filter(t => t.type === 'income');
          const dIn = U.sum(dayIncomes, t => t.total);
          const dOut = U.sum(rows.filter(t => t.type === 'expense'), t => t.total);
          const dPorsi = U.sum(dayIncomes, t => U.sum(t.items || [], it => it.qty));
          return `
            <div class="trx-group">
              <div class="trx-group__head">
                <div class="trx-group__title">
                  <h3>${U.formatDateRelative(date)}</h3>
                  ${dayIncomes.length ? `<span class="trx-group__customers">
                    ${I.get('users', 13)} ${dayIncomes.length} pelanggan${dPorsi ? ` • ${U.number(dPorsi)} porsi` : ''}
                  </span>` : ''}
                </div>
                <div class="trx-group__totals">
                  ${dIn ? `<span class="is-income">+${U.rupiah(dIn)}</span>` : ''}
                  ${dOut ? `<span class="is-expense">−${U.rupiah(dOut)}</span>` : ''}
                  <span class="trx-group__net ${dIn - dOut >= 0 ? 'is-pos' : 'is-neg'}">${U.rupiah(dIn - dOut)}</span>
                </div>
              </div>
              <ul class="trx-list">${rows.map(t =>
                global.Views.trxRow(t, { pilih: pilihMode, terpilih: terpilih })).join('')}</ul>
            </div>`;
        }).join('') : UI.emptyState({
          emoji: '🗂️',
          title: 'Tidak ada transaksi',
          text: filter.q
            ? `Tidak ada hasil untuk "${filter.q}" pada periode ini.`
            : 'Belum ada catatan pada periode dan saringan yang dipilih.',
          actionLabel: 'Catat Penjualan', actionIcon: 'cart'
        })}
        ${total > visible.length ? `
          <button type="button" class="btn btn--soft btn--block" data-act="more">
            ${I.get('chevronDown', 18)} Tampilkan ${Math.min(PAGE, total - visible.length)} catatan lagi
            <span class="badge badge--muted">${visible.length} dari ${total}</span>
          </button>` : ''}
      </section>`;

    /* --- Interaksi --- */
    root.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
      filter.type = b.dataset.type;
      if (filter.type === 'income') filter.category = 'all';
      resetPaging();
      render(root);
    }));

    root.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
      filter.preset = b.dataset.preset;
      if (filter.preset === 'custom') {
        const r = resolveRange();
        filter.from = filter.from || r.from;
        filter.to = filter.to || r.to;
      }
      resetPaging();
      render(root);
    }));

    const moreBtn = root.querySelector('[data-act=more]');
    if (moreBtn) moreBtn.addEventListener('click', () => { shown += PAGE; render(root); });

    const catFilter = root.querySelector('[data-cat-filter]');
    if (catFilter) catFilter.addEventListener('change', () => {
      filter.category = catFilter.value; resetPaging(); render(root);
    });

    const fromEl = root.querySelector('[data-from]');
    const toEl = root.querySelector('[data-to]');
    if (fromEl) fromEl.addEventListener('change', () => {
      filter.from = fromEl.value;
      if (filter.from > filter.to) filter.to = filter.from;
      resetPaging();
      render(root);
    });
    if (toEl) toEl.addEventListener('change', () => {
      filter.to = toEl.value;
      if (filter.to < filter.from) filter.from = filter.to;
      resetPaging();
      render(root);
    });

    const searchEl = root.querySelector('#trxSearch');
    searchEl.addEventListener('input', U.debounce(() => {
      filter.q = searchEl.value.trim();
      resetPaging();
      const pos = searchEl.selectionStart;
      render(root);
      const again = root.querySelector('#trxSearch');
      again.focus();
      try { again.setSelectionRange(pos, pos); } catch (e) { /* noop */ }
    }, 260));

    root.querySelector('[data-act=income]').addEventListener('click', () => UI.navigate('kasir'));
    root.querySelector('[data-act=expense]').addEventListener('click', () =>
      global.Forms.expenseModal(null, () => render(root)));
    root.querySelector('[data-act=export]').addEventListener('click', () => exportCSV(list, range));

    const emptyBtn = root.querySelector('[data-empty-action]');
    if (emptyBtn) emptyBtn.addEventListener('click', () => UI.navigate('kasir'));

    UI.on(root, 'click', '[data-receipt]', (e, node) => {
      e.stopPropagation();
      const trx = S.getTransaction(node.dataset.receipt);
      if (trx) global.Forms.receiptModal(trx);
    }, 'ReceiptList');

    /* --- Mode pilih --- */
    const modeBtn = root.querySelector('[data-act=mode-pilih]');
    if (modeBtn) modeBtn.addEventListener('click', () => {
      if (pilihMode) keluarModePilih(); else pilihMode = true;
      render(root);
    });

    const semuaBtn = root.querySelector('[data-act=pilih-semua]');
    if (semuaBtn) semuaBtn.addEventListener('click', () => {
      // Memilih SELURUH hasil saringan, bukan hanya yang sedang tampil.
      // Jumlahnya ditulis di tombolnya, dan dikonfirmasi lagi sebelum dihapus.
      list.forEach(t => terpilih.add(t.id));
      render(root);
    });

    const kosongBtn = root.querySelector('[data-act=pilih-batal]');
    if (kosongBtn) kosongBtn.addEventListener('click', () => { terpilih.clear(); render(root); });

    const hapusBtn = root.querySelector('[data-act=hapus-terpilih]');
    if (hapusBtn) hapusBtn.addEventListener('click', () => hapusTerpilih(root, list));

    const toggle = id => {
      if (terpilih.has(id)) terpilih.delete(id); else terpilih.add(id);
      render(root);
    };

    UI.on(root, 'click', '[data-trx]', (e, node) => {
      if (e.target.closest('[data-receipt]')) return;
      if (pilihMode) { toggle(node.dataset.trx); return; }
      openTrx(node.dataset.trx, root);
    }, 'TrxList');
    UI.on(root, 'keydown', '[data-trx]', (e, node) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (pilihMode) toggle(node.dataset.trx);
      else openTrx(node.dataset.trx, root);
    }, 'TrxListKey');
  }

  /** Konfirmasi lalu hapus semua yang dipilih, dengan tombol Batalkan */
  async function hapusTerpilih(root, list) {
    const ids = Array.from(terpilih);
    if (!ids.length) return;

    // Ringkasan nilainya ditampilkan supaya jelas apa yang akan hilang —
    // menghapus 60 catatan tanpa tahu nilainya terlalu mudah disesali.
    const dipilih = list.filter(t => terpilih.has(t.id));
    const masuk = U.sum(dipilih.filter(t => t.type === 'income'), t => t.total);
    const keluar = U.sum(dipilih.filter(t => t.type === 'expense'), t => t.total);
    const rincian = [
      masuk ? `pemasukan ${U.rupiah(masuk)}` : '',
      keluar ? `pengeluaran ${U.rupiah(keluar)}` : ''
    ].filter(Boolean).join(' dan ');

    const ok = await UI.confirm({
      title: `Hapus ${ids.length} catatan?`,
      message: `Total yang ikut hilang: ${rincian || 'Rp 0'}. ` +
        (global.Cloud && global.Cloud.currentUser()
          ? 'Penghapusan ini juga berlaku di perangkat lain yang memakai akun yang sama.'
          : 'Catatan ini akan hilang dari perangkat ini.') +
        ' Masih bisa dibatalkan sesaat setelah dihapus.',
      danger: true,
      confirmText: `Hapus ${ids.length} catatan`
    });
    if (!ok) return;

    const dibuang = S.removeTransactions(ids);
    keluarModePilih();
    render(root);

    UI.toast(`${dibuang.length} catatan dihapus`, 'info', 12000, {
      label: 'Batalkan',
      onClick: () => {
        S.restoreTransactions(dibuang);
        UI.toast(`${dibuang.length} catatan dikembalikan`, 'success');
        render(root);
      }
    });
  }

  function openTrx(id, root) {
    const trx = S.getTransaction(id);
    if (!trx) return;
    if (trx.type === 'income') global.Forms.incomeDetailModal(trx, () => render(root));
    else global.Forms.expenseModal(trx, () => render(root));
  }

  function exportCSV(list, range) {
    if (!list.length) { UI.toast('Tidak ada data untuk diekspor', 'warn'); return; }
    global.Exporter.saveWorkbook(list.slice().reverse(), {
      from: range.from, to: range.to,
      title: S.get().profile.businessName || '',
      rangeLabel: `${U.formatDate(range.from, true)} – ${U.formatDate(range.to, true)}`,
      filename: `transaksi-${range.from}-sd-${range.to}`
    });
  }

  global.Views.transaksi = render;
})(window);
