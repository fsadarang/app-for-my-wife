/* =========================================================
   View: Menu & Kategori — kelola daftar jualan dan pos pengeluaran
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  let tab = 'menu';   // menu | stok | kategori
  let q = '';
  let stockDate = null;   // tanggal yang sedang dilihat di tab Stok

  /**
   * Simpan tab & tanggal yang sedang dibuka ke alamat halaman TANPA
   * memicu navigasi ulang, supaya saat tampilan disegarkan (misalnya
   * setelah mencatat pengeluaran) posisinya tidak melompat balik.
   */
  function syncHash() {
    const next = '#/menu' + (tab === 'stok' ? '?tab=stok&date=' + stockDate : tab === 'kategori' ? '?tab=kategori' : '');
    if (location.hash === next) return;
    try { history.replaceState(null, '', next); } catch (e) { /* alamat tidak bisa diubah, abaikan */ }
  }

  function render(root, params) {
    if (params && params.tab) tab = params.tab;
    if (params && params.date) stockDate = params.date;
    if (!stockDate) stockDate = U.today();

    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('book', 22)} Menu &amp; Stok</h1>
          <p class="page-sub">Atur daftar jualan, jumlah yang tersedia hari ini, dan kelompok pengeluaran.</p>
        </div>
        <div class="page-head__actions" data-head-actions></div>
      </section>

      <div class="seg seg--wide seg--tabs" role="tablist">
        <button type="button" class="seg__btn${tab === 'menu' ? ' is-active' : ''}" data-tab="menu" role="tab">
          ${I.get('book', 16)} Daftar Menu
        </button>
        <button type="button" class="seg__btn${tab === 'stok' ? ' is-active' : ''}" data-tab="stok" role="tab">
          ${I.get('package', 16)} Stok
        </button>
        <button type="button" class="seg__btn${tab === 'kategori' ? ' is-active' : ''}" data-tab="kategori" role="tab">
          ${I.get('tag', 16)} Kategori
        </button>
      </div>

      <div data-tab-body></div>`;

    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab; q = ''; syncHash(); render(root);
    }));

    if (tab === 'menu') renderMenuTab(root);
    else if (tab === 'stok') renderStockTab(root);
    else renderCategoryTab(root);
  }

  /* ---------- Tab: Daftar Menu ---------- */

  function renderMenuTab(root) {
    const products = S.get().products;
    const host = root.querySelector('[data-tab-body]');

    root.querySelector('[data-head-actions]').innerHTML = `
      ${!products.length ? `<button type="button" class="btn btn--soft" data-act="seed">${I.get('sparkle', 18)} Isi Contoh Menu</button>` : ''}
      <button type="button" class="btn btn--primary" data-act="add">${I.get('plus', 18)} Tambah Menu</button>`;

    root.querySelector('[data-act=add]').addEventListener('click', () => global.Forms.productModal(null, () => render(root)));
    const seedBtn = root.querySelector('[data-act=seed]');
    if (seedBtn) seedBtn.addEventListener('click', () => {
      S.seedProducts();
      UI.toast('10 contoh menu ditambahkan. Silakan diubah sesuai jualanmu.', 'success', 5000);
      render(root);
    });

    if (!products.length) {
      host.innerHTML = UI.emptyState({
        emoji: '📖',
        title: 'Daftar menu masih kosong',
        text: 'Tambahkan menu jualanmu agar pencatatan penjualan cukup sekali ketuk, dan kamu bisa tahu menu mana yang paling laris.',
        actionLabel: 'Tambah Menu Pertama'
      });
      host.querySelector('[data-empty-action]').addEventListener('click', () => global.Forms.productModal(null, () => render(root)));
      return;
    }

    const list = products.filter(p => U.matches(p.name, q) || U.matches(p.group, q));
    const withCost = products.filter(p => p.cost > 0);
    const avgMargin = withCost.length
      ? U.sum(withCost, p => ((p.price - p.cost) / p.price) * 100) / withCost.length : 0;
    const groups = U.groupBy(list, p => p.group || 'Lainnya');

    host.innerHTML = `
      ${UI.tipCard('menu-hpp', `Isi <b>HPP</b> (modal bahan per porsi) pada tiap menu. Dari situ aplikasi bisa menghitung menu mana yang paling menguntungkan — bukan sekadar paling laris.`)}

      <div class="stat-row">
        <div class="stat-mini"><span>${I.get('book', 16)} Jumlah menu</span><strong>${products.length}</strong></div>
        <div class="stat-mini"><span>${I.get('check', 16)} Aktif dijual</span><strong>${products.filter(p => p.active !== false).length}</strong></div>
        <div class="stat-mini"><span>${I.get('scale', 16)} Rata-rata margin</span><strong>${withCost.length ? avgMargin.toFixed(0) + '%' : '–'}</strong></div>
        <div class="stat-mini"><span>${I.get('alert', 16)} Belum ada HPP</span><strong>${products.length - withCost.length}</strong></div>
      </div>

      <div class="search search--sm search--block">
        ${I.get('search', 17, 'search__icon')}
        <input type="search" id="menuSearch" placeholder="Cari menu..." value="${U.escapeHtml(q)}" aria-label="Cari menu">
      </div>

      ${list.length ? Array.from(groups.keys()).sort().map(g => `
        <section class="card card--group">
          <div class="card__head">
            <h2 class="card__title">${U.escapeHtml(g)}</h2>
            <span class="card__sub">${groups.get(g).length} menu</span>
          </div>
          <div class="menu-grid">
            ${groups.get(g).map(menuCard).join('')}
          </div>
        </section>`).join('') : `
        <div class="empty empty--sm">
          <div class="empty__art">🔍</div>
          <h3 class="empty__title">Tidak ditemukan</h3>
          <p class="empty__text">Tidak ada menu yang cocok dengan "${U.escapeHtml(q)}".</p>
        </div>`}`;

    const searchEl = host.querySelector('#menuSearch');
    if (searchEl) {
      searchEl.addEventListener('input', U.debounce(() => {
        q = searchEl.value.trim();
        const pos = searchEl.selectionStart;
        renderMenuTab(root);
        const again = root.querySelector('#menuSearch');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* noop */ } }
      }, 200));
    }

    UI.on(host, 'click', '[data-edit]', (e, node) => {
      if (e.target.closest('[data-toggle]')) return;
      const p = S.getProduct(node.dataset.edit);
      if (p) global.Forms.productModal(p, () => render(root));
    }, 'MenuEdit');

    UI.on(host, 'click', '[data-toggle]', (e, node) => {
      const p = S.getProduct(node.dataset.toggle);
      if (!p) return;
      S.updateProduct(p.id, { active: p.active === false });
      UI.toast(p.active === false ? `"${p.name}" ditampilkan lagi di Kasir` : `"${p.name}" disembunyikan dari Kasir`, 'info');
      renderMenuTab(root);
    }, 'MenuToggle');

    UI.on(host, 'keydown', '[data-edit]', (e, node) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const p = S.getProduct(node.dataset.edit);
      if (p) global.Forms.productModal(p, () => render(root));
    }, 'MenuEditKey');

    bindTips(host);
  }

  function menuCard(p) {
    const hasCost = p.cost > 0;
    const profit = p.price - p.cost;
    const pct = p.price ? (profit / p.price) * 100 : 0;
    const tone = !hasCost ? 'none' : profit <= 0 ? 'bad' : pct < 25 ? 'warn' : 'good';
    const inactive = p.active === false;

    return `
      <article class="menu-card${inactive ? ' is-inactive' : ''}" data-edit="${p.id}" tabindex="0" role="button" aria-label="Ubah ${U.escapeHtml(p.name)}">
        <span class="menu-card__emoji">${p.emoji || '🍽️'}</span>
        <div class="menu-card__body">
          <h3 class="menu-card__name">${U.escapeHtml(p.name)}${inactive ? ' <span class="badge badge--muted">disembunyikan</span>' : ''}</h3>
          <p class="menu-card__price">${U.rupiah(p.price)}</p>
          <p class="menu-card__margin is-${tone}">
            ${hasCost
              ? `${I.get('scale', 14)} Modal ${U.rupiah(p.cost)} → untung ${U.rupiah(profit)} (${pct.toFixed(0)}%)`
              : `${I.get('info', 14)} HPP belum diisi`}
          </p>
        </div>
        <div class="menu-card__actions">
          <button type="button" class="icon-btn" data-toggle="${p.id}" aria-label="${inactive ? 'Tampilkan' : 'Sembunyikan'} menu"
                  title="${inactive ? 'Tampilkan di Kasir' : 'Sembunyikan dari Kasir'}">
            ${I.get(inactive ? 'check' : 'x', 16)}
          </button>
          <span class="icon-btn icon-btn--ghost" aria-hidden="true">${I.get('edit', 16)}</span>
        </div>
      </article>`;
  }

  /* ---------- Tab: Stok ---------- */

  /**
   * Berapa porsi tiap varian yang tersedia pada satu tanggal, dipisah
   * antara yang sudah terjual dan yang di-keep untuk pre-order, supaya
   * angka "sisa" benar-benar bisa dijual ke pembeli yang datang.
   */
  function renderStockTab(root) {
    const host = root.querySelector('[data-tab-body]');
    const st = S.get();
    const sum = S.stockSummary(stockDate);
    const rows = sum.rows;
    const isToday = stockDate === U.today();

    root.querySelector('[data-head-actions]').innerHTML = `
      <button type="button" class="btn btn--soft" data-act="copy-prev">${I.get('copy', 18)} Salin Kemarin</button>
      <button type="button" class="btn btn--primary" data-act="today" ${isToday ? 'disabled' : ''}>${I.get('calendar', 18)} Hari Ini</button>`;

    if (!st.products.length) {
      host.innerHTML = UI.emptyState({
        emoji: '📦',
        title: 'Belum ada menu untuk diatur stoknya',
        text: 'Tambahkan menu jualanmu dulu di tab "Daftar Menu", baru jumlah tersedianya bisa dicatat di sini.',
        actionLabel: 'Ke Daftar Menu'
      });
      host.querySelector('[data-empty-action]').addEventListener('click', () => { tab = 'menu'; syncHash(); render(root); });
      bindStockHead(root);
      return;
    }

    const groups = U.groupBy(rows.filter(r => !r.hilang), r => r.group || 'Lainnya');
    const orphan = rows.filter(r => r.hilang);

    host.innerHTML = `
      ${UI.tipCard('stok-cara', `Isi <b>jumlah yang dibuat</b> tiap pagi. Setiap penjualan otomatis mengurangi sisanya, dan pesanan pre-order untuk tanggal itu otomatis di-<b>keep</b> supaya tidak ikut terjual.`)}

      <div class="datebar">
        <button type="button" class="icon-btn" data-act="prev" aria-label="Tanggal sebelumnya">${I.get('chevronLeft', 18)}</button>
        <div class="datebar__body">
          <strong class="datebar__label">${U.formatDateRelative(stockDate)}</strong>
          <span class="datebar__sub">${U.formatDateFull(stockDate)}</span>
        </div>
        <button type="button" class="icon-btn" data-act="next" aria-label="Tanggal berikutnya">${I.get('chevronRight', 18)}</button>
        <input type="date" class="datebar__input" data-date-input value="${stockDate}" aria-label="Pilih tanggal stok">
      </div>

      <div class="stat-row">
        <div class="stat-mini"><span>${I.get('package', 16)} Dibuat</span><strong>${sum.dibuat}</strong></div>
        <div class="stat-mini"><span>${I.get('cart', 16)} Terjual</span><strong>${sum.terjual}</strong></div>
        <div class="stat-mini"><span>${I.get('calendar', 16)} Ter-keep</span><strong>${sum.dikeep}</strong></div>
        <div class="stat-mini stat-mini--accent"><span>${I.get('check', 16)} Sisa</span><strong>${sum.sisa}</strong></div>
      </div>

      <div class="potensi">
        <span class="potensi__icon">${I.get('coins', 20)}</span>
        <div class="potensi__body">
          <span class="potensi__label">Kalau sisanya habis terjual</span>
          <strong class="potensi__value">${U.rupiah(sum.nilaiSisa)}</strong>
        </div>
        <span class="potensi__note">perkiraan dari harga jual, belum dikurangi diskon</span>
      </div>

      ${!sum.diaturCount ? `
        <div class="notice notice--info">
          ${I.get('info', 18)}
          <div>
            <b>Stok ${U.formatDateRelative(stockDate).toLowerCase()} belum diatur.</b>
            <span>Ketuk menu di bawah untuk mengisi jumlah yang dibuat. Penjualan tetap bisa dicatat walau stok belum diisi.</span>
          </div>
        </div>` : (sum.habis || sum.menipis) ? `
        <div class="notice notice--warn">
          ${I.get('alert', 18)}
          <div>
            <b>${sum.habis ? sum.habis + ' menu habis' : ''}${sum.habis && sum.menipis ? ' • ' : ''}${sum.menipis ? sum.menipis + ' menu menipis' : ''}</b>
            <span>Sisa dihitung setelah dikurangi yang terjual dan yang di-keep untuk pre-order.</span>
          </div>
        </div>` : ''}

      ${Array.from(groups.keys()).sort().map(g => `
        <section class="card card--group">
          <div class="card__head">
            <h2 class="card__title">${U.escapeHtml(g)}</h2>
            <span class="card__sub">${groups.get(g).length} menu</span>
          </div>
          <ul class="stock-list">
            ${groups.get(g).map(stockRow).join('')}
          </ul>
        </section>`).join('')}

      ${orphan.length ? `
        <section class="card card--group">
          <div class="card__head">
            <h2 class="card__title">Item di luar daftar menu</h2>
            <span class="card__sub">tercatat terjual / di-keep</span>
          </div>
          <ul class="stock-list">
            ${orphan.map(stockRow).join('')}
          </ul>
        </section>` : ''}`;

    bindStockHead(root);

    const goDate = d => { stockDate = d; syncHash(); renderStockTab(root); };
    host.querySelector('[data-act=prev]').addEventListener('click', () => goDate(U.addDays(stockDate, -1)));
    host.querySelector('[data-act=next]').addEventListener('click', () => goDate(U.addDays(stockDate, 1)));
    const dateInput = host.querySelector('[data-date-input]');
    dateInput.addEventListener('change', () => goDate(dateInput.value || U.today()));

    const openStock = id => {
      const p = S.getProduct(id);
      if (!p) return;
      global.Forms.stockModal(p, stockDate, () => renderStockTab(root));
    };

    UI.on(host, 'click', '[data-add-stock]', (e, node) => {
      e.stopPropagation();
      const id = node.dataset.addStock;
      const n = Number(node.dataset.qty) || 0;
      const p = S.getProduct(id);
      if (!p || !n) return;
      S.addStockEntry({ productId: id, date: stockDate, qty: n });
      UI.toast(`"${p.name}" +${n} → ${S.stockMade(id, stockDate)} dibuat`, 'success', 3000);
      renderStockTab(root);
    }, 'StockAdd');

    UI.on(host, 'click', '[data-stock]', (e, node) => {
      if (e.target.closest('[data-add-stock]')) return;
      openStock(node.dataset.stock);
    }, 'StockOpen');

    UI.on(host, 'keydown', '[data-stock]', (e, node) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openStock(node.dataset.stock);
    }, 'StockOpenKey');

    bindTips(host);
  }

  function bindStockHead(root) {
    const todayBtn = root.querySelector('[data-act=today]');
    if (todayBtn) todayBtn.addEventListener('click', () => { stockDate = U.today(); syncHash(); renderStockTab(root); });

    const copyBtn = root.querySelector('[data-act=copy-prev]');
    if (copyBtn) copyBtn.addEventListener('click', async () => {
      const prev = U.addDays(stockDate, -1);
      const source = S.stockOverview(prev).filter(r => r.productId && r.diatur && r.dibuat > 0);
      if (!source.length) {
        UI.toast(`Tidak ada catatan stok pada ${U.formatDateRelative(prev).toLowerCase()} untuk disalin`, 'info', 4000);
        return;
      }
      // Hanya menu yang belum punya catatan hari ini yang diisi, supaya
      // angka yang sudah diatur sendiri tidak tertimpa.
      const target = source.filter(r => !S.hasStockRecord(r.productId, stockDate));
      if (!target.length) {
        UI.toast('Semua menu sudah punya catatan stok untuk tanggal ini', 'info', 4000);
        return;
      }
      const ok = await UI.confirm({
        title: 'Salin stok dari ' + U.formatDateRelative(prev).toLowerCase() + '?',
        message: `${target.length} menu akan diisi dengan jumlah yang sama seperti ${U.formatDateRelative(prev).toLowerCase()}. Menu yang stoknya sudah diatur tidak diubah.`,
        confirmText: 'Salin'
      });
      if (!ok) return;
      target.forEach(r => S.addStockEntry({ productId: r.productId, date: stockDate, qty: r.dibuat, note: 'salinan ' + prev }));
      UI.toast(`${target.length} menu disalin dari ${U.formatDateRelative(prev).toLowerCase()}`, 'success');
      renderStockTab(root);
    });
  }

  function stockRow(r) {
    const tone = !r.diatur ? 'none' : r.sisa < 0 ? 'bad' : r.sisa === 0 ? 'bad' : r.sisa <= S.LOW_STOCK ? 'warn' : 'good';
    const clickable = !!r.productId;
    return `
      <li class="stock-row is-${tone}"${clickable ? ` data-stock="${r.productId}" tabindex="0" role="button" aria-label="Atur stok ${U.escapeHtml(r.name)}"` : ''}>
        <span class="stock-row__emoji">${r.emoji || '🍽️'}</span>
        <div class="stock-row__body">
          <p class="stock-row__name">${U.escapeHtml(r.name)}${r.active === false && !r.hilang ? ' <span class="badge badge--muted">disembunyikan</span>' : ''}</p>
          <p class="stock-row__meta">
            <span class="stock-tag">${I.get('package', 12)} Dibuat <b>${r.diatur ? r.dibuat : '–'}</b></span>
            <span class="stock-tag stock-tag--sold">${I.get('cart', 12)} Terjual <b>${r.terjual}</b></span>
            <span class="stock-tag stock-tag--keep">${I.get('calendar', 12)} Keep <b>${r.dikeep}</b></span>
          </p>
          ${clickable ? `
            <div class="stock-row__quick">
              <button type="button" class="chip chip--mini" data-add-stock="${r.productId}" data-qty="5">+5</button>
              <button type="button" class="chip chip--mini" data-add-stock="${r.productId}" data-qty="10">+10</button>
              <span class="stock-row__hint">ketuk baris untuk atur</span>
            </div>` : ''}
        </div>
        <div class="stock-row__right">
          <span class="stock-row__left-label">Sisa</span>
          <strong class="stock-row__left">${r.diatur ? r.sisa : '–'}</strong>
          ${r.diatur
            ? `<span class="stock-row__money">${r.sisa > 0 ? U.rupiah(r.nilaiSisa) : '&nbsp;'}</span>`
            : '<span class="stock-row__unset">belum diatur</span>'}
        </div>
      </li>`;
  }

  /* ---------- Tab: Kategori Pengeluaran ---------- */

  function renderCategoryTab(root) {
    const st = S.get();
    const cats = st.expenseCategories;
    const host = root.querySelector('[data-tab-body]');
    const monthFrom = U.startOfMonth(U.today());
    const usage = S.expenseByCategory(monthFrom, U.today());
    const usageMap = new Map(usage.map(u => [u.id, u]));
    const totalMonth = U.sum(usage, u => u.total);

    root.querySelector('[data-head-actions]').innerHTML =
      `<button type="button" class="btn btn--primary" data-act="add-cat">${I.get('plus', 18)} Tambah Kategori</button>`;
    root.querySelector('[data-act=add-cat]').addEventListener('click', () =>
      global.Forms.categoryModal(null, () => render(root)));

    host.innerHTML = `
      ${UI.tipCard('cat-why', `Kategori membuat kamu bisa melihat <b>ke mana uang paling banyak habis</b>. Kalau biaya bahan baku terus naik sementara omzet tetap, itu tanda harga jual perlu ditinjau.`)}
      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('tag', 18)} Kategori Pengeluaran</h2>
          <span class="card__sub">Pemakaian bulan ${U.monthLabel(U.today())}</span>
        </div>
        <ul class="cat-list">
          ${cats.map(c => {
            const u = usageMap.get(c.id);
            const total = u ? u.total : 0;
            const pct = totalMonth ? (total / totalMonth) * 100 : 0;
            return `
              <li class="cat-row" data-edit-cat="${c.id}" tabindex="0" role="button">
                <span class="cat-row__emoji" style="--c:${c.color}">${c.emoji}</span>
                <div class="cat-row__body">
                  <div class="cat-row__line">
                    <span class="cat-row__name">${U.escapeHtml(c.name)}</span>
                    <span class="cat-row__total">${total ? U.rupiah(total) : '–'}</span>
                  </div>
                  <div class="cat-row__bar"><i style="width:${Math.max(pct, total ? 3 : 0)}%; background:${c.color}"></i></div>
                  <p class="cat-row__meta">${u ? `${u.count} catatan • ${pct.toFixed(0)}% dari pengeluaran bulan ini` : (c.tip || 'Belum dipakai bulan ini')}</p>
                </div>
                <span class="cat-row__chev">${I.get('edit', 16)}</span>
              </li>`;
          }).join('')}
        </ul>
      </section>`;

    const openCat = node => global.Forms.categoryModal(S.getCategory(node.dataset.editCat), () => render(root));
    UI.on(host, 'click', '[data-edit-cat]', (e, node) => openCat(node), 'CatEdit');
    UI.on(host, 'keydown', '[data-edit-cat]', (e, node) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openCat(node);
    }, 'CatEditKey');
    bindTips(host);
  }

  /* ---------- Tips ---------- */

  function bindTips(host) {
    host.querySelectorAll('.tip').forEach(tip => {
      const id = tip.dataset.tip;
      if (localStorage.getItem('dapurku.tip.' + id) === 'off') { tip.remove(); return; }
      tip.querySelector('.tip__close').addEventListener('click', () => {
        localStorage.setItem('dapurku.tip.' + id, 'off');
        tip.remove();
      });
    });
  }

  global.Views.menu = render;
  global.Views.bindTips = bindTips;
})(window);
