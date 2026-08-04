/* =========================================================
   View: Menu & Kategori — kelola daftar jualan dan pos pengeluaran
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  let tab = 'menu';   // menu | kategori
  let q = '';

  function render(root, params) {
    if (params && params.tab) tab = params.tab;
    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('book', 22)} Menu &amp; Kategori</h1>
          <p class="page-sub">Atur daftar jualan beserta harga, dan kelompok pengeluaran usahamu.</p>
        </div>
        <div class="page-head__actions" data-head-actions></div>
      </section>

      <div class="seg seg--wide seg--tabs" role="tablist">
        <button type="button" class="seg__btn${tab === 'menu' ? ' is-active' : ''}" data-tab="menu" role="tab">
          ${I.get('book', 16)} Daftar Menu
        </button>
        <button type="button" class="seg__btn${tab === 'kategori' ? ' is-active' : ''}" data-tab="kategori" role="tab">
          ${I.get('tag', 16)} Kategori Pengeluaran
        </button>
      </div>

      <div data-tab-body></div>`;

    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab; q = ''; render(root);
    }));

    if (tab === 'menu') renderMenuTab(root);
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
