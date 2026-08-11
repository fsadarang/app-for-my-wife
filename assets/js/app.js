/* =========================================================
   App — kerangka aplikasi: navigasi, rute, pintasan, aksi cepat
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;

  const NAV = [
    { path: 'dashboard', label: 'Beranda', icon: 'home', bottom: true },
    { path: 'kasir', label: 'Kasir', icon: 'cart', bottom: true },
    { path: 'preorder', label: 'Pre-Order', icon: 'calendar', bottom: true },
    { path: 'transaksi', label: 'Transaksi', icon: 'receipt', bottom: true },
    { path: 'laporan', label: 'Laporan', icon: 'chart', bottom: true },
    { path: 'menu', label: 'Menu', icon: 'book', bottom: true },
    { path: 'pengaturan', label: 'Pengaturan', icon: 'settings', bottom: false }
  ];

  const TITLES = {
    dashboard: 'Beranda', kasir: 'Kasir', preorder: 'Pre-Order', transaksi: 'Transaksi',
    laporan: 'Laporan', menu: 'Menu & Kategori', pengaturan: 'Pengaturan'
  };

  let viewRoot = null;      // <main id="view">
  let viewBody = null;      // wadah baru tiap pindah halaman, agar listener lama ikut hilang

  /* ---------- Kerangka ---------- */

  function renderShell() {
    const st = S.get();
    const app = document.getElementById('app');

    app.innerHTML = `
      <a class="skip-link" href="#view">Lompat ke konten</a>

      <aside class="sidebar">
        <div class="brand">
          <span class="brand__mark" data-logo-mark>🍽️</span>
          <div class="brand__text">
            <strong class="brand__name" data-brand-name>${U.escapeHtml(st.profile.businessName || 'Dapur Kita')}</strong>
            <span class="brand__sub">Catatan Untung Rugi</span>
          </div>
        </div>

        <nav class="nav" aria-label="Navigasi utama">
          ${NAV.map(n => `
            <a class="nav__item" href="#/${n.path}" data-nav="${n.path}">
              <span class="nav__icon">${I.get(n.icon, 20)}</span>
              <span class="nav__label">${n.label}</span>
              ${n.path === 'preorder' ? '<span class="nav__badge" data-po-badge hidden></span>' : ''}
              <span class="nav__marker"></span>
            </a>`).join('')}
        </nav>

        <div class="sidebar__foot">
          <div class="cash-box">
            <span class="cash-box__label">${I.get('wallet', 16)} Saldo Kas</span>
            <strong class="cash-box__value" data-cash>${U.rupiah(S.cashBalance())}</strong>
          </div>
          <button type="button" class="theme-toggle" data-act="theme" aria-label="Ganti tema">
            <span data-theme-icon>${I.get('moon', 18)}</span>
            <span data-theme-label>Mode Gelap</span>
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn topbar__menu" data-act="open-nav" aria-label="Buka menu">${I.get('menu', 22)}</button>
          <div class="topbar__title">
            <span class="topbar__brand-mark" data-logo-mark>🍽️</span>
            <div>
              <h1 data-page-title>Beranda</h1>
              <p data-page-date>${U.formatDateRelative(U.today())}</p>
            </div>
          </div>
          <div class="topbar__actions">
            <span class="topbar__cash" data-cash-top>${I.get('wallet', 16)} ${U.rupiah(S.cashBalance())}</span>
            <button type="button" class="icon-btn" data-act="theme" aria-label="Ganti tema">
              <span data-theme-icon>${I.get('moon', 20)}</span>
            </button>
            <a class="icon-btn" href="#/pengaturan" aria-label="Pengaturan">${I.get('settings', 20)}</a>
          </div>
        </header>

        <main class="view" id="view" tabindex="-1"></main>
      </div>

      <div class="nav-scrim" data-act="close-nav" hidden></div>

      <div class="fab" data-fab>
        <div class="fab__menu" data-fab-menu hidden>
          <button type="button" class="fab__item" data-fab-act="sale">
            <span class="fab__item-icon fab__item-icon--income">${I.get('cart', 18)}</span> Catat Penjualan
          </button>
          <button type="button" class="fab__item" data-fab-act="expense">
            <span class="fab__item-icon fab__item-icon--expense">${I.get('wallet', 18)}</span> Catat Pengeluaran
          </button>
          <button type="button" class="fab__item" data-fab-act="quick">
            <span class="fab__item-icon fab__item-icon--neutral">${I.get('coins', 18)}</span> Pemasukan Cepat
          </button>
        </div>
        <button type="button" class="fab__btn" data-fab-toggle aria-label="Aksi cepat" aria-expanded="false">
          ${I.get('plus', 26)}
        </button>
      </div>

      <nav class="bottomnav" aria-label="Navigasi bawah">
        ${NAV.filter(n => n.bottom).map(n => `
          <a class="bottomnav__item" href="#/${n.path}" data-nav="${n.path}">
            <span class="bottomnav__icon">${I.get(n.icon, 21)}${n.path === 'preorder' ? '<i class="bottomnav__badge" data-po-badge hidden></i>' : ''}</span>
            <span class="bottomnav__label">${n.label}</span>
          </a>`).join('')}
      </nav>`;

    viewRoot = document.getElementById('view');
    bindShell();
    updateThemeButton();
  }

  function bindShell() {
    const app = document.getElementById('app');

    app.querySelectorAll('[data-act=theme]').forEach(btn => btn.addEventListener('click', toggleTheme));

    const scrim = app.querySelector('.nav-scrim');
    app.querySelector('[data-act=open-nav]').addEventListener('click', () => {
      document.body.classList.add('is-nav-open');
      scrim.hidden = false;
    });
    scrim.addEventListener('click', closeNav);
    app.querySelectorAll('.sidebar .nav__item').forEach(a => a.addEventListener('click', closeNav));

    // Tombol aksi cepat (mengambang)
    const fab = app.querySelector('[data-fab]');
    const fabMenu = app.querySelector('[data-fab-menu]');
    const fabToggle = app.querySelector('[data-fab-toggle]');

    const closeFab = () => {
      fab.classList.remove('is-open');
      fabMenu.hidden = true;
      fabToggle.setAttribute('aria-expanded', 'false');
    };
    fabToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = !fab.classList.contains('is-open');
      fab.classList.toggle('is-open', open);
      fabMenu.hidden = !open;
      fabToggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!fab.contains(e.target)) closeFab();
    });
    fabMenu.addEventListener('click', e => {
      const btn = e.target.closest('[data-fab-act]');
      if (!btn) return;
      closeFab();
      const act = btn.dataset.fabAct;
      if (act === 'sale') UI.navigate('kasir');
      if (act === 'expense') global.Forms.expenseModal(null, refreshCurrentView);
      if (act === 'quick') global.Forms.quickIncomeModal(refreshCurrentView);
    });
  }

  function closeNav() {
    document.body.classList.remove('is-nav-open');
    const scrim = document.querySelector('.nav-scrim');
    if (scrim) scrim.hidden = true;
  }

  function toggleTheme() {
    const cur = S.get().settings.theme;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = cur === 'auto' ? (isDark ? 'light' : 'dark') : (cur === 'dark' ? 'light' : 'dark');
    S.updateSettings({ theme: next });
    UI.applyTheme(next);
    updateThemeButton();
    global.Charts.redrawAll();
    UI.toast(next === 'dark' ? 'Mode gelap aktif 🌙' : 'Mode terang aktif ☀️', 'info', 2000);
  }

  function updateThemeButton() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.innerHTML = I.get(dark ? 'sun' : 'moon', el.closest('.theme-toggle') ? 18 : 20);
    });
    const label = document.querySelector('[data-theme-label]');
    if (label) label.textContent = dark ? 'Mode Terang' : 'Mode Gelap';
  }

  /** Perbarui bagian kerangka yang bergantung pada data */
  /**
   * Pasang logo usaha (kalau ada) pada penanda merek dan ikon tab browser.
   * Kalau belum diisi, ikon piring bawaan yang dipakai.
   */
  function applyLogo() {
    const logo = S.get().profile.logo || '';
    document.querySelectorAll('[data-logo-mark]').forEach(el => {
      if (logo) {
        el.innerHTML = '<img src="' + logo + '" alt="" class="brand__logo">';
        el.classList.add('has-logo');
      } else {
        el.textContent = '🍽️';
        el.classList.remove('has-logo');
      }
    });
    const link = document.querySelector('link[rel="icon"]');
    if (link && logo) link.href = logo;
  }

  /** Lencana: berapa pre-order yang belum selesai (yang lewat tenggat ditandai) */
  function refreshPreorderBadge() {
    const sum = S.preorderSummary();
    document.querySelectorAll('[data-po-badge]').forEach(el => {
      el.hidden = sum.pendingCount === 0;
      el.textContent = el.tagName === 'I' ? '' : String(sum.pendingCount);
      el.classList.toggle('is-late', sum.lateCount > 0);
      el.title = sum.pendingCount + ' pre-order belum selesai';
    });
  }

  function refreshShell() {
    const st = S.get();
    applyLogo();
    refreshPreorderBadge();
    const name = document.querySelector('[data-brand-name]');
    if (name) name.textContent = st.profile.businessName || 'Dapur Kita';
    const cash = document.querySelector('[data-cash]');
    if (cash) cash.textContent = U.rupiah(S.cashBalance());
    const cashTop = document.querySelector('[data-cash-top]');
    if (cashTop) cashTop.innerHTML = `${I.get('wallet', 16)} ${U.rupiah(S.cashBalance())}`;
    updateThemeButton();
  }

  function setActiveNav(path) {
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('is-active', a.dataset.nav === path);
      if (a.dataset.nav === path) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const title = document.querySelector('[data-page-title]');
    if (title) title.textContent = TITLES[path] || 'Beranda';
    const dateEl = document.querySelector('[data-page-date]');
    if (dateEl) dateEl.textContent = U.formatDateFull(U.today());
    document.title = (TITLES[path] || 'Beranda') + ' • ' + (S.get().profile.businessName || 'Dapur Kita');
    document.body.classList.toggle('is-kasir', path === 'kasir');
  }

  function refreshCurrentView() {
    const { path, params } = UI.parseHash();
    const fn = global.Views[path];
    if (fn && viewBody) {
      fn(viewBody, params);
      applyTipVisibility();
    }
    refreshShell();
  }

  /* ---------- Rute ---------- */

  function mount(path) {
    return function (params) {
      const fn = global.Views[path];
      if (!fn) return;
      global.Charts.hideTip();
      closeNav();
      setActiveNav(path);

      // Wadah baru tiap navigasi: semua event listener halaman sebelumnya
      // ikut terbuang bersama elemennya, jadi tidak ada penumpukan.
      viewRoot.innerHTML = '';
      viewBody = document.createElement('div');
      viewBody.className = 'view-body';
      viewRoot.appendChild(viewBody);

      fn(viewBody, params);
      applyTipVisibility();
      window.scrollTo({ top: 0, behavior: 'auto' });
      refreshShell();
    };
  }

  function applyTipVisibility() {
    if (!viewBody) return;
    if (!S.get().settings.showTips) {
      viewBody.querySelectorAll('.tip').forEach(t => t.remove());
      return;
    }
    if (global.Views.bindTips) global.Views.bindTips(viewBody);
  }

  /* ---------- Pintasan keyboard ---------- */

  function bindShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (UI.hasOpenModal()) { UI.closeTopModal(); return; }
        if (document.body.classList.contains('is-nav-open')) { closeNav(); return; }
        const openCart = document.querySelector('.pos__cart.is-open');
        if (openCart) openCart.classList.remove('is-open');
        return;
      }

      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey || UI.hasOpenModal()) return;

      const key = e.key.toLowerCase();

      if (key === '/') {
        e.preventDefault();
        const box = document.querySelector('#posSearch, #trxSearch, #menuSearch');
        if (box) { box.focus(); box.select(); }
        else UI.toast('Kotak pencarian ada di halaman Kasir, Transaksi, dan Menu', 'info', 2500);
        return;
      }
      if (key === 'b') { e.preventDefault(); UI.navigate('kasir'); return; }
      if (key === 'p') { e.preventDefault(); global.Forms.expenseModal(null, refreshCurrentView); return; }
      if (key === '?') { e.preventDefault(); UI.navigate('pengaturan'); return; }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        UI.navigate(NAV[num - 1].path);
      }
    });
  }

  /* ---------- Onboarding ---------- */

  function checkOnboarding() {
    if (!S.get().settings.onboarded) {
      setTimeout(() => global.Views.onboarding.start(), 250);
      return true;
    }
    return false;
  }

  /* ---------- Mulai ---------- */

  function init() {
    S.load();
    UI.applyTheme(S.get().settings.theme);
    UI.watchSystemTheme(() => S.get().settings.theme);

    renderShell();

    NAV.forEach(n => UI.route(n.path, mount(n.path)));
    UI.startRouter(mount('dashboard'));

    bindShortcuts();
    checkOnboarding();

    // Simpan data sebelum halaman ditutup, jaga-jaga ada perubahan tertunda.
    window.addEventListener('beforeunload', () => S.persist());

    // Ingatkan sekali saja saat meninggalkan Kasir dengan pesanan yang belum disimpan.
    let lastPath = UI.parseHash().path;
    window.addEventListener('hashchange', () => {
      const now = UI.parseHash().path;
      const leavingKasir = lastPath === 'kasir' && now !== 'kasir';
      lastPath = now;
      if (leavingKasir && global.Views.kasirHasCart && global.Views.kasirHasCart()) {
        UI.toast('Pesanan di Kasir belum disimpan — isinya masih tersimpan kalau kamu kembali ke sana', 'warn', 5000);
      }
    });

    document.body.classList.remove('is-loading');
  }

  global.App = { init, refreshShell, refreshCurrentView, checkOnboarding, applyLogo, refreshPreorderBadge, NAV };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
