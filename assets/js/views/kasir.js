/* =========================================================
   View: Kasir — catat penjualan dengan memilih menu
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  // Keranjang bertahan selama sesi, jadi tidak hilang saat pindah halaman.
  let cart = [];
  let search = '';
  let activeGroup = 'Semua';
  let payMethod = 'tunai';
  let discount = 0;
  let saleDate = null; // null = hari ini

  function cartTotalQty() { return U.sum(cart, it => it.qty); }
  function cartSubtotal() { return U.sum(cart, it => it.qty * it.price); }
  function cartTotal() { return Math.max(0, cartSubtotal() - Math.min(discount, cartSubtotal())); }

  function render(root) {
    const st = S.get();
    const products = st.products.filter(p => p.active !== false);
    saleDate = saleDate || U.today();

    root.innerHTML = `
      <div class="pos">
        <section class="pos__catalog">
          <div class="pos__toolbar">
            <div class="search">
              ${I.get('search', 18, 'search__icon')}
              <input type="search" id="posSearch" placeholder="Cari menu... (tekan /)" autocomplete="off"
                     value="${U.escapeHtml(search)}" aria-label="Cari menu">
              <button type="button" class="search__clear" data-act="clear-search" hidden aria-label="Bersihkan">${I.get('x', 16)}</button>
            </div>
            <button type="button" class="btn btn--soft" data-act="add-product">${I.get('plus', 18)} Menu Baru</button>
          </div>

          <div class="pos__groups" data-groups></div>
          <div class="pos__grid" data-grid></div>
        </section>

        <aside class="pos__cart" data-cart-panel>
          <div class="cart">
            <header class="cart__head">
              <h2 class="cart__title">${I.get('cart', 18)} Pesanan</h2>
              <div class="cart__head-actions">
                <span class="cart__count" data-cart-count>0 item</span>
                <button type="button" class="icon-btn cart__collapse" data-act="close-cart" aria-label="Tutup pesanan">${I.get('chevronDown', 18)}</button>
              </div>
            </header>
            <div class="cart__items" data-cart-items></div>
            <div class="cart__foot" data-cart-foot></div>
          </div>
        </aside>

        <div class="pos__bar" data-cart-bar hidden>
          <button type="button" class="pos__bar-info" data-act="open-cart">
            <span class="pos__bar-count" data-bar-count>0</span>
            <span class="pos__bar-label">Lihat Pesanan</span>
            <strong class="pos__bar-total" data-bar-total>Rp 0</strong>
          </button>
        </div>
      </div>`;

    /* --- Pencarian --- */
    const searchInput = root.querySelector('#posSearch');
    const clearBtn = root.querySelector('[data-act=clear-search]');
    const syncClear = () => { clearBtn.hidden = !searchInput.value; };
    syncClear();
    searchInput.addEventListener('input', U.debounce(() => {
      search = searchInput.value.trim();
      syncClear();
      renderGrid(root);
    }, 120));
    clearBtn.addEventListener('click', () => {
      search = ''; searchInput.value = ''; syncClear(); searchInput.focus(); renderGrid(root);
    });

    root.querySelector('[data-act=add-product]').addEventListener('click', () => {
      global.Forms.productModal(null, () => render(root));
    });

    /* --- Panel keranjang (mobile) --- */
    const panel = root.querySelector('[data-cart-panel]');
    root.querySelector('[data-act=open-cart]').addEventListener('click', () => panel.classList.add('is-open'));
    root.querySelector('[data-act=close-cart]').addEventListener('click', () => panel.classList.remove('is-open'));

    renderGroups(root, products);
    renderGrid(root);
    renderCart(root);
  }

  function renderGroups(root, products) {
    const host = root.querySelector('[data-groups]');
    const groups = ['Semua'].concat(Array.from(new Set(products.map(p => p.group || 'Lainnya'))));
    if (!groups.includes(activeGroup)) activeGroup = 'Semua';
    host.innerHTML = groups.map(g => `
      <button type="button" class="pill${g === activeGroup ? ' is-active' : ''}" data-group="${U.escapeHtml(g)}">
        ${U.escapeHtml(g)}
        <span class="pill__count">${g === 'Semua' ? products.length : products.filter(p => (p.group || 'Lainnya') === g).length}</span>
      </button>`).join('');
    host.querySelectorAll('[data-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeGroup = btn.dataset.group;
        host.querySelectorAll('[data-group]').forEach(b => b.classList.toggle('is-active', b === btn));
        renderGrid(root);
      });
    });
  }

  function renderGrid(root) {
    const grid = root.querySelector('[data-grid]');
    const all = S.get().products.filter(p => p.active !== false);

    if (!all.length) {
      grid.innerHTML = UI.emptyState({
        emoji: '📖',
        title: 'Menu masih kosong',
        text: 'Tambahkan menu jualanmu dulu supaya bisa dipilih dengan sekali ketuk saat ada pembeli.',
        actionLabel: 'Tambah Menu Pertama'
      });
      grid.querySelector('[data-empty-action]').addEventListener('click', () => {
        global.Forms.productModal(null, () => render(root));
      });
      renderCart(root);
      return;
    }

    const list = all.filter(p =>
      (activeGroup === 'Semua' || (p.group || 'Lainnya') === activeGroup) &&
      (U.matches(p.name, search) || U.matches(p.group, search))
    );

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty empty--sm">
          <div class="empty__art">🔍</div>
          <h3 class="empty__title">Menu tidak ditemukan</h3>
          <p class="empty__text">Tidak ada menu yang cocok dengan "${U.escapeHtml(search)}".</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(p => {
      const inCart = cart.find(c => c.productId === p.id);
      const margin = p.price && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : null;
      return `
        <button type="button" class="prod${inCart ? ' is-in-cart' : ''}" data-add="${p.id}">
          ${inCart ? `<span class="prod__badge">${inCart.qty}</span>` : ''}
          <span class="prod__emoji">${p.emoji || '🍽️'}</span>
          <span class="prod__name">${U.escapeHtml(p.name)}</span>
          <span class="prod__price">${U.rupiah(p.price)}</span>
          ${margin != null ? `<span class="prod__margin">untung ${margin}%</span>` : ''}
        </button>`;
    }).join('') + `
      <button type="button" class="prod prod--custom" data-act="custom-item">
        <span class="prod__emoji">${I.get('plus', 26)}</span>
        <span class="prod__name">Item Lain</span>
        <span class="prod__price">di luar daftar menu</span>
      </button>`;

    grid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        addToCart(btn.dataset.add);
        bump(btn);
        renderGrid(root);
        renderCart(root);
      });
    });
    const customBtn = grid.querySelector('[data-act=custom-item]');
    if (customBtn) customBtn.addEventListener('click', () => customItemModal(root));
  }

  function bump(node) {
    node.classList.remove('is-bump');
    void node.offsetWidth;
    node.classList.add('is-bump');
  }

  function addToCart(productId) {
    const p = S.getProduct(productId);
    if (!p) return;
    const found = cart.find(c => c.productId === p.id);
    if (found) found.qty += 1;
    else cart.push({ productId: p.id, name: p.name, emoji: p.emoji, qty: 1, price: p.price, cost: p.cost });
  }

  function renderCart(root) {
    const itemsHost = root.querySelector('[data-cart-items]');
    const footHost = root.querySelector('[data-cart-foot]');
    const bar = root.querySelector('[data-cart-bar]');
    if (!itemsHost) return;

    const qty = cartTotalQty();
    const subtotal = cartSubtotal();
    const total = cartTotal();
    const hpp = U.sum(cart, it => it.qty * it.cost);
    const estProfit = total - hpp;

    root.querySelector('[data-cart-count]').textContent = `${qty} item`;
    root.querySelector('[data-bar-count]').textContent = qty;
    root.querySelector('[data-bar-total]').textContent = U.rupiah(total);
    bar.hidden = qty === 0;

    if (!cart.length) {
      itemsHost.innerHTML = `
        <div class="cart__empty">
          <div class="cart__empty-art">🛒</div>
          <p class="cart__empty-title">Belum ada pesanan</p>
          <p class="cart__empty-text">Ketuk menu di sebelah kiri untuk menambahkannya ke pesanan.</p>
        </div>`;
      footHost.innerHTML = '';
      root.querySelector('[data-cart-panel]').classList.remove('is-open');
      return;
    }

    itemsHost.innerHTML = cart.map((it, i) => `
      <div class="cart-item" data-i="${i}">
        <span class="cart-item__emoji">${it.emoji || '🍽️'}</span>
        <div class="cart-item__body">
          <p class="cart-item__name">${U.escapeHtml(it.name)}</p>
          <p class="cart-item__price">${U.rupiah(it.price)} × ${it.qty} = <b>${U.rupiah(it.price * it.qty)}</b></p>
        </div>
        <div class="stepper">
          <button type="button" class="stepper__btn" data-dec aria-label="Kurangi ${U.escapeHtml(it.name)}">${I.get('minus', 15)}</button>
          <span class="stepper__val">${it.qty}</span>
          <button type="button" class="stepper__btn" data-inc aria-label="Tambah ${U.escapeHtml(it.name)}">${I.get('plus', 15)}</button>
        </div>
        <button type="button" class="icon-btn cart-item__del" data-del aria-label="Hapus ${U.escapeHtml(it.name)}">${I.get('trash', 16)}</button>
      </div>`).join('');

    const isToday = saleDate === U.today();
    footHost.innerHTML = `
      <div class="cart__summary">
        <div class="cart__row"><span>Subtotal</span><b>${U.rupiah(subtotal)}</b></div>
        <div class="cart__row cart__row--discount">
          <span>Diskon</span>
          <div class="amount-input amount-input--inline">
            <span class="amount-input__prefix">Rp</span>
            <input type="text" id="cartDiscount" inputmode="numeric" placeholder="0" value="${discount ? U.number(discount) : ''}">
          </div>
        </div>
        <div class="cart__row cart__row--total"><span>Total Bayar</span><b>${U.rupiah(total)}</b></div>
        ${hpp > 0 ? `<div class="cart__row cart__row--hint">
          <span>${I.get('scale', 14)} Estimasi untung</span><b class="${estProfit < 0 ? 'is-neg' : 'is-pos'}">${U.rupiah(estProfit)}</b>
        </div>` : ''}
      </div>

      <div class="cart__methods">
        <span class="field__label">Dibayar dengan</span>
        <div class="chip-row" data-methods>
          ${S.PAYMENT_METHODS.map(m => `
            <button type="button" class="chip chip--method${m.id === payMethod ? ' is-active' : ''}" data-method="${m.id}">
              <span class="chip__emoji">${m.emoji}</span>${U.escapeHtml(m.name)}
            </button>`).join('')}
        </div>
      </div>

      <div class="cart__date">
        <button type="button" class="cart__date-toggle" data-act="toggle-date">
          ${I.get('calendar', 15)} ${isToday ? 'Hari ini' : U.formatDate(saleDate)}
          <span class="cart__date-hint">${isToday ? 'ubah tanggal' : 'transaksi mundur'}</span>
        </button>
        <input type="date" class="cart__date-input" data-date-input value="${saleDate}" ${isToday ? 'hidden' : ''}>
      </div>

      <div class="cart__actions">
        <button type="button" class="btn btn--ghost btn--danger-text" data-act="clear-cart">${I.get('trash', 16)} Kosongkan</button>
        <button type="button" class="btn btn--income btn--block btn--lg" data-act="checkout">
          ${I.get('check', 20)} Simpan Penjualan • ${U.rupiah(total)}
        </button>
      </div>`;

    /* --- Interaksi keranjang --- */
    itemsHost.querySelectorAll('.cart-item').forEach(node => {
      const i = Number(node.dataset.i);
      node.querySelector('[data-inc]').addEventListener('click', () => { cart[i].qty += 1; renderCart(root); renderGrid(root); });
      node.querySelector('[data-dec]').addEventListener('click', () => {
        cart[i].qty -= 1;
        if (cart[i].qty <= 0) cart.splice(i, 1);
        renderCart(root); renderGrid(root);
      });
      node.querySelector('[data-del]').addEventListener('click', () => {
        cart.splice(i, 1); renderCart(root); renderGrid(root);
      });
    });

    const discInput = footHost.querySelector('#cartDiscount');
    U.attachThousand(discInput);
    discInput.addEventListener('input', U.debounce(() => {
      const v = U.parseNumber(discInput.value);
      discount = Math.min(v, cartSubtotal());
      const totalNow = cartTotal();
      footHost.querySelector('.cart__row--total b').textContent = U.rupiah(totalNow);
      footHost.querySelector('[data-act=checkout]').innerHTML =
        `${I.get('check', 20)} Simpan Penjualan • ${U.rupiah(totalNow)}`;
      root.querySelector('[data-bar-total]').textContent = U.rupiah(totalNow);
    }, 200));

    footHost.querySelectorAll('[data-method]').forEach(chip => {
      chip.addEventListener('click', () => {
        payMethod = chip.dataset.method;
        footHost.querySelectorAll('[data-method]').forEach(c => c.classList.toggle('is-active', c === chip));
      });
    });

    const dateInput = footHost.querySelector('[data-date-input]');
    footHost.querySelector('[data-act=toggle-date]').addEventListener('click', () => {
      dateInput.hidden = !dateInput.hidden;
      if (!dateInput.hidden) dateInput.focus();
    });
    dateInput.addEventListener('change', () => {
      saleDate = dateInput.value || U.today();
      renderCart(root);
    });

    footHost.querySelector('[data-act=clear-cart]').addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Kosongkan pesanan?',
        message: 'Semua item pada pesanan ini akan dihapus.',
        danger: true, confirmText: 'Kosongkan'
      });
      if (!ok) return;
      cart = []; discount = 0;
      renderCart(root); renderGrid(root);
    });

    footHost.querySelector('[data-act=checkout]').addEventListener('click', () => checkout(root));
  }

  function checkout(root) {
    if (!cart.length) return;
    const trx = S.addIncome({
      items: cart,
      discount: discount,
      date: saleDate || U.today(),
      time: U.nowTime(),
      method: payMethod
    });
    const total = trx.total;
    cart = []; discount = 0; saleDate = U.today();
    renderCart(root); renderGrid(root);

    UI.toast(`Penjualan ${U.rupiah(total)} tersimpan 🎉`, 'success', 6000, {
      label: 'Lihat Struk',
      onClick: () => global.Forms.receiptModal(trx)
    });

    const st = S.get();
    const target = Number(st.profile.dailyTarget) || 0;
    if (target > 0) {
      const todayIncome = S.summary(U.today(), U.today()).income;
      if (todayIncome >= target && todayIncome - total < target) {
        setTimeout(() => UI.toast('🎉 Target harian tercapai! Mantap!', 'success', 6000), 700);
      }
    }
  }

  /** Item di luar daftar menu */
  function customItemModal(root) {
    UI.modal({
      title: 'Item di Luar Menu',
      subtitle: 'Untuk penjualan yang belum terdaftar di menu',
      icon: 'plus',
      size: 'sm',
      body: `
        <form class="form" id="customItemForm">
          <label class="field">
            <span class="field__label">Nama Item</span>
            <input type="text" name="name" maxlength="60" data-autofocus autocomplete="off" placeholder="Misal: Nasi Bungkus Titipan">
          </label>
          <div class="field-row">
            <label class="field">
              <span class="field__label">Harga</span>
              <div class="amount-input"><span class="amount-input__prefix">Rp</span>
                <input type="text" id="customPrice" inputmode="numeric" placeholder="0"></div>
            </label>
            <label class="field">
              <span class="field__label">Jumlah</span>
              <input type="number" name="qty" min="1" step="1" value="1">
            </label>
          </div>
          <label class="check">
            <input type="checkbox" name="saveMenu">
            <span>Simpan juga ke daftar menu</span>
          </label>
        </form>`,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="customItemForm" class="btn btn--primary">${I.get('plus', 18)} Tambahkan</button>`,
      onMount: h => {
        const form = h.root.querySelector('#customItemForm');
        const price = h.root.querySelector('#customPrice');
        U.attachThousand(price);
        h.root.querySelector('[data-act=cancel]').addEventListener('click', () => h.close());
        form.addEventListener('submit', e => {
          e.preventDefault();
          const name = form.name.value.trim();
          const p = U.parseNumber(price.value);
          const qty = Math.max(1, Number(form.qty.value) || 1);
          if (!name) { UI.toast('Nama item belum diisi', 'warn'); return; }
          if (p <= 0) { UI.toast('Harga belum diisi', 'warn'); return; }
          if (form.saveMenu.checked) {
            const created = S.addProduct({ name, price: p, emoji: '🍽️', group: 'Lainnya' });
            cart.push({ productId: created.id, name, emoji: '🍽️', qty, price: p, cost: 0 });
          } else {
            cart.push({ productId: null, name, emoji: '🍽️', qty, price: p, cost: 0 });
          }
          h.close();
          renderGrid(root); renderCart(root);
          UI.toast(`${name} ditambahkan ke pesanan`, 'success');
        });
      }
    });
  }

  function focusSearch() {
    const input = document.getElementById('posSearch');
    if (input) { input.focus(); input.select(); return true; }
    return false;
  }

  global.Views.kasir = render;
  global.Views.kasirFocusSearch = focusSearch;
  global.Views.kasirHasCart = () => cart.length > 0;
})(window);
