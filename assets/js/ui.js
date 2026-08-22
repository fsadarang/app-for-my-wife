/* =========================================================
   UI — komponen umum: toast, modal, konfirmasi, tema, router
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;
  const I = global.Icons;

  /* ---------- Helper DOM ---------- */

  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html).trim();
    return tpl.content.firstElementChild;
  }

  /**
   * Delegasi event: on(root, 'click', '.btn', handler, 'key')
   * `key` mencegah pemasangan ganda saat halaman digambar ulang berkali-kali
   * pada elemen induk yang sama.
   */
  function on(root, type, selector, handler, key) {
    if (key) {
      const flag = 'bound' + key;
      if (root.dataset[flag] === '1') return;
      root.dataset[flag] = '1';
    }
    root.addEventListener(type, function (e) {
      const target = e.target.closest(selector);
      if (target && root.contains(target)) handler(e, target);
    });
  }

  /* ---------- Toast ---------- */

  let toastRoot = null;

  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = el('<div class="toast-stack" id="toastStack" role="status" aria-live="polite"></div>');
      document.body.appendChild(toastRoot);
    }
    return toastRoot;
  }

  const TOAST_ICON = { success: 'check', error: 'alert', info: 'info', warn: 'alert' };

  /**
   * toast('Tersimpan', 'success')
   * toast('Dihapus', 'info', 6000, { label: 'Batalkan', onClick: fn })
   */
  function toast(message, type, duration, action) {
    const root = ensureToastRoot();
    const kind = type || 'info';
    const node = el(`
      <div class="toast toast--${kind}" role="alert">
        <span class="toast__icon">${I.get(TOAST_ICON[kind] || 'info', 18)}</span>
        <span class="toast__msg">${U.escapeHtml(message)}</span>
        ${action ? `<button type="button" class="toast__action">${U.escapeHtml(action.label)}</button>` : ''}
        <button type="button" class="toast__close" aria-label="Tutup">${I.get('x', 16)}</button>
      </div>
    `);

    let timer = null;
    const dismiss = () => {
      clearTimeout(timer);
      node.classList.add('is-leaving');
      setTimeout(() => node.remove(), 220);
    };

    if (action) {
      qs('.toast__action', node).addEventListener('click', () => {
        try { action.onClick(); } catch (e) { console.error(e); }
        dismiss();
      });
    }
    qs('.toast__close', node).addEventListener('click', dismiss);

    root.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-in'));
    timer = setTimeout(dismiss, duration || (action ? 7000 : 3000));
    return dismiss;
  }

  /* ---------- Modal ---------- */

  const openModals = [];

  /**
   * modal({ title, subtitle, icon, body, footer, size, onMount, onClose, closeOnBackdrop })
   *
   * closeOnBackdrop: bawaannya `false` — ketukan di luar jendela tidak
   * menutup apa pun. Isi `true` hanya kalau jendela itu memang tidak punya
   * isian yang bisa hilang.
   * -> { close, root, body }
   */
  function modal(opts) {
    const o = opts || {};
    const overlay = el(`
      <div class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal modal--${o.size || 'md'}">
          <header class="modal__head">
            <div class="modal__title-wrap">
              ${o.icon ? `<span class="modal__icon">${o.iconEmoji ? U.escapeHtml(o.icon) : I.get(o.icon, 20)}</span>` : ''}
              <div>
                <h2 class="modal__title">${U.escapeHtml(o.title || '')}</h2>
                ${o.subtitle ? `<p class="modal__subtitle">${U.escapeHtml(o.subtitle)}</p>` : ''}
              </div>
            </div>
            <button type="button" class="icon-btn modal__close" aria-label="Tutup">${I.get('x', 20)}</button>
          </header>
          <div class="modal__body"></div>
          ${o.footer ? '<footer class="modal__foot"></footer>' : ''}
        </div>
      </div>
    `);

    const bodyEl = qs('.modal__body', overlay);
    if (typeof o.body === 'string') bodyEl.innerHTML = o.body;
    else if (o.body instanceof Node) bodyEl.appendChild(o.body);

    const footEl = qs('.modal__foot', overlay);
    if (footEl) {
      if (typeof o.footer === 'string') footEl.innerHTML = o.footer;
      else if (o.footer instanceof Node) footEl.appendChild(o.footer);
    }

    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      overlay.classList.remove('is-in');
      const idx = openModals.indexOf(handle);
      if (idx >= 0) openModals.splice(idx, 1);
      if (!openModals.length) document.body.classList.remove('is-modal-open');
      setTimeout(() => overlay.remove(), 200);
      if (o.onClose) o.onClose(result);
    }

    qs('.modal__close', overlay).addEventListener('click', () => close());

    /**
     * Ketukan di luar jendela TIDAK menutup apa pun.
     *
     * Di HP, area di luar jendela gampang sekali tersenggol — misalnya saat
     * menutup papan ketik atau jari meleset sedikit — dan dulu isian yang
     * sudah setengah diketik langsung hilang tanpa peringatan. Sekarang
     * jendelanya hanya bergoyang sebentar dan tombol tutup ikut berkedip,
     * supaya jelas ketukannya terbaca tapi memang sengaja tidak ditutup.
     *
     * Menutup jendela harus lewat tombol X, tombol Batal, atau Esc — tiga
     * hal yang tidak mungkin tertekan tanpa sengaja.
     */
    const dialog = qs('.modal', overlay);
    overlay.addEventListener('mousedown', e => {
      if (e.target !== overlay) return;
      if (o.closeOnBackdrop === true) { close(); return; }
      dialog.classList.remove('is-nudge');
      void dialog.offsetWidth;      // paksa animasi mengulang dari awal
      dialog.classList.add('is-nudge');
    });

    document.body.appendChild(overlay);
    document.body.classList.add('is-modal-open');
    requestAnimationFrame(() => overlay.classList.add('is-in'));

    const handle = { close, root: overlay, body: bodyEl, footer: footEl };
    openModals.push(handle);

    if (o.onMount) o.onMount(handle);

    // Fokus pertama ke input agar langsung bisa mengetik
    setTimeout(() => {
      const focusTarget = qs('[data-autofocus]', overlay) ||
        qs('input:not([type=hidden]), textarea, select, button.btn--primary', bodyEl);
      if (focusTarget && !('ontouchstart' in window)) focusTarget.focus();
    }, 60);

    return handle;
  }

  function closeTopModal() {
    if (openModals.length) openModals[openModals.length - 1].close();
  }

  function hasOpenModal() { return openModals.length > 0; }

  /** Konfirmasi -> Promise<boolean> */
  function confirm(opts) {
    const o = opts || {};
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };

      const m = modal({
        title: o.title || 'Konfirmasi',
        icon: o.danger ? 'alert' : 'help',
        size: 'sm',
        body: `<p class="confirm__text">${U.escapeHtml(o.message || 'Lanjutkan?')}</p>`,
        footer: `
          <button type="button" class="btn btn--ghost" data-act="cancel">${U.escapeHtml(o.cancelText || 'Batal')}</button>
          <button type="button" class="btn ${o.danger ? 'btn--danger' : 'btn--primary'}" data-act="ok" data-autofocus>
            ${U.escapeHtml(o.confirmText || 'Ya, lanjutkan')}
          </button>`,
        onClose: () => finish(false)
      });

      m.root.classList.add('modal-overlay--confirm');
      qs('[data-act=cancel]', m.footer).addEventListener('click', () => { finish(false); m.close(); });
      qs('[data-act=ok]', m.footer).addEventListener('click', () => { finish(true); m.close(); });
    });
  }

  /* ---------- Tema ---------- */

  function applyTheme(mode) {
    const m = mode || 'auto';
    const dark = m === 'dark' || (m === 'auto' &&
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.documentElement.dataset.themeMode = m;
    const meta = qs('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#17120f' : '#ffffff');
  }

  function watchSystemTheme(getMode) {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (getMode() === 'auto') applyTheme('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  /* ---------- Komponen kecil ---------- */

  function emptyState(opts) {
    const o = opts || {};
    return `
      <div class="empty">
        <div class="empty__art" aria-hidden="true">${o.emoji || '🍽️'}</div>
        <h3 class="empty__title">${U.escapeHtml(o.title || 'Belum ada data')}</h3>
        <p class="empty__text">${U.escapeHtml(o.text || '')}</p>
        ${o.actionLabel ? `<button type="button" class="btn btn--primary" data-empty-action>
          ${I.get(o.actionIcon || 'plus', 18)} ${U.escapeHtml(o.actionLabel)}</button>` : ''}
      </div>`;
  }

  function badge(text, tone) {
    return `<span class="badge badge--${tone || 'neutral'}">${U.escapeHtml(text)}</span>`;
  }

  /** Kartu tips yang bisa ditutup */
  function tipCard(id, text) {
    return `
      <div class="tip" data-tip="${U.escapeHtml(id)}">
        <span class="tip__icon">${I.get('bulb', 18)}</span>
        <p class="tip__text">${text}</p>
        <button type="button" class="icon-btn tip__close" aria-label="Sembunyikan tips">${I.get('x', 16)}</button>
      </div>`;
  }

  /** Pemilih emoji sederhana */
  function emojiPicker(list, selected, name) {
    return `<div class="emoji-picker" role="radiogroup">` +
      list.map(e => `
        <button type="button" class="emoji-picker__item${e === selected ? ' is-active' : ''}"
          data-emoji="${e}" role="radio" aria-checked="${e === selected}" aria-label="${e}"
          ${name ? `data-name="${name}"` : ''}>${e}</button>`).join('') +
      `</div>`;
  }

  /* ---------- Router sederhana (hash) ---------- */

  const routes = new Map();
  let currentRoute = null;
  let notFoundHandler = null;

  function route(name, handler) { routes.set(name, handler); }

  function parseHash() {
    const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const params = {};
    if (query) {
      query.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path: path || 'dashboard', params };
  }

  function navigate(path, params) {
    let hash = '#/' + path;
    if (params && Object.keys(params).length) {
      hash += '?' + Object.entries(params)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    }
    if (location.hash === hash) resolve();
    else location.hash = hash;
  }

  function resolve() {
    const { path, params } = parseHash();
    const handler = routes.get(path) || notFoundHandler;
    currentRoute = path;
    if (handler) handler(params);
  }

  function startRouter(fallback) {
    notFoundHandler = fallback;
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  function getRoute() { return currentRoute; }

  global.UI = {
    qs, qsa, el, on,
    toast, modal, confirm, closeTopModal, hasOpenModal,
    applyTheme, watchSystemTheme,
    emptyState, badge, tipCard, emojiPicker,
    route, navigate, startRouter, getRoute, parseHash
  };
})(window);
