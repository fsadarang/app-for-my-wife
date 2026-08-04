/* =========================================================
   Forms — modal isian yang dipakai bersama antar halaman
   (pengeluaran, penjualan cepat, edit transaksi, menu, kategori)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;
  const I = global.Icons;
  const S = global.Store;

  const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

  /* ---------- Potongan markup ---------- */

  function amountField(id, label, value) {
    return `
      <label class="field field--amount">
        <span class="field__label">${U.escapeHtml(label)}</span>
        <div class="amount-input">
          <span class="amount-input__prefix">Rp</span>
          <input type="text" id="${id}" inputmode="numeric" autocomplete="off"
                 class="amount-input__field" placeholder="0"
                 value="${value ? U.number(value) : ''}" data-autofocus>
        </div>
        <div class="quick-amounts">
          ${QUICK_AMOUNTS.map(a => `<button type="button" class="chip chip--quick" data-add="${a}">+${U.rupiahShort(a)}</button>`).join('')}
          <button type="button" class="chip chip--quick chip--clear" data-clear>${I.get('x', 14)} Hapus</button>
        </div>
      </label>`;
  }

  function dateTimeFields(date, time) {
    return `
      <div class="field-row">
        <label class="field">
          <span class="field__label">Tanggal</span>
          <input type="date" name="date" value="${date || U.today()}" max="2999-12-31">
        </label>
        <label class="field">
          <span class="field__label">Jam</span>
          <input type="time" name="time" value="${time || U.nowTime()}">
        </label>
      </div>`;
  }

  function methodChips(selected) {
    return `
      <div class="field">
        <span class="field__label">Metode Pembayaran</span>
        <div class="chip-row" data-methods>
          ${S.PAYMENT_METHODS.map(m => `
            <button type="button" class="chip chip--method${m.id === (selected || 'tunai') ? ' is-active' : ''}" data-method="${m.id}">
              <span class="chip__emoji">${m.emoji}</span>${U.escapeHtml(m.name)}
            </button>`).join('')}
        </div>
      </div>`;
  }

  function noteField(value, placeholder) {
    return `
      <label class="field">
        <span class="field__label">Catatan <span class="field__hint">(opsional)</span></span>
        <input type="text" name="note" maxlength="120" autocomplete="off"
               placeholder="${U.escapeHtml(placeholder || 'Misal: belanja di pasar pagi')}"
               value="${U.escapeHtml(value || '')}">
      </label>`;
  }

  /** Pasang perilaku pada input nominal (format ribuan + tombol cepat) */
  function bindAmount(root, inputId) {
    const input = root.querySelector('#' + inputId);
    U.attachThousand(input);
    root.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = U.parseNumber(input.value);
        input.value = U.number(cur + Number(btn.dataset.add));
        input.dispatchEvent(new Event('change'));
        input.focus();
      });
    });
    const clearBtn = root.querySelector('[data-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('change'));
        input.focus();
      });
    }
    return input;
  }

  /** Pasang perilaku pada deretan chip pilihan tunggal */
  function bindChips(root, selector, attr) {
    let value = null;
    const chips = Array.from(root.querySelectorAll(selector));
    chips.forEach(chip => {
      if (chip.classList.contains('is-active')) value = chip.dataset[attr];
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        value = chip.dataset[attr];
      });
    });
    return { get: () => value, chips };
  }

  /* ---------- Modal: Catat Pengeluaran ---------- */

  function expenseModal(existing, onDone) {
    const cats = S.get().expenseCategories;
    const isEdit = !!existing;
    const selectedCat = existing ? existing.categoryId : (cats[0] && cats[0].id);

    const body = `
      <form class="form" id="expenseForm" novalidate>
        ${amountField('expenseAmount', 'Jumlah Pengeluaran', existing ? existing.total : 0)}
        <div class="field">
          <span class="field__label">Untuk Apa? <span class="field__hint">pilih satu</span></span>
          <div class="cat-grid" data-cats>
            ${cats.map(c => `
              <button type="button" class="cat-chip${c.id === selectedCat ? ' is-active' : ''}" data-cat="${c.id}"
                      title="${U.escapeHtml(c.tip || c.name)}">
                <span class="cat-chip__emoji">${c.emoji}</span>
                <span class="cat-chip__name">${U.escapeHtml(c.name)}</span>
              </button>`).join('')}
          </div>
        </div>
        ${dateTimeFields(existing && existing.date, existing && existing.time)}
        ${methodChips(existing && existing.method)}
        ${noteField(existing && existing.note, 'Misal: belanja ayam 5 kg')}
      </form>`;

    const m = global.UI.modal({
      title: isEdit ? 'Ubah Pengeluaran' : 'Catat Pengeluaran',
      subtitle: isEdit ? 'Perbarui rincian pengeluaran ini' : 'Uang keluar untuk belanja & biaya usaha',
      icon: 'arrowDown',
      size: 'md',
      body: body,
      footer: `
        ${isEdit ? `<button type="button" class="btn btn--ghost btn--danger-text" data-act="delete">${I.get('trash', 18)} Hapus</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="expenseForm" class="btn btn--expense">${I.get('save', 18)} ${isEdit ? 'Simpan' : 'Catat Pengeluaran'}</button>`,
      onMount: handle => {
        const root = handle.root;
        const amount = bindAmount(root, 'expenseAmount');
        const cat = bindChips(root, '[data-cats] .cat-chip', 'cat');
        const method = bindChips(root, '[data-methods] .chip--method', 'method');
        const form = root.querySelector('#expenseForm');

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        const del = root.querySelector('[data-act=delete]');
        if (del) {
          del.addEventListener('click', async () => {
            const ok = await global.UI.confirm({
              title: 'Hapus pengeluaran?',
              message: 'Catatan ini akan dihapus dari laporan.',
              danger: true, confirmText: 'Hapus'
            });
            if (!ok) return;
            const removed = S.removeTransaction(existing.id);
            handle.close();
            global.UI.toast('Pengeluaran dihapus', 'info', 7000, {
              label: 'Batalkan',
              onClick: () => { S.restoreTransaction(removed.item, removed.index); global.UI.toast('Dikembalikan', 'success'); }
            });
            if (onDone) onDone(null);
          });
        }

        form.addEventListener('submit', e => {
          e.preventDefault();
          const total = U.parseNumber(amount.value);
          if (total <= 0) {
            global.UI.toast('Isi dulu jumlah pengeluarannya ya', 'warn');
            amount.focus();
            return;
          }
          const data = {
            total,
            categoryId: cat.get(),
            date: form.date.value || U.today(),
            time: form.time.value || U.nowTime(),
            method: method.get() || 'tunai',
            note: form.note.value
          };
          if (isEdit) {
            S.updateTransaction(existing.id, data);
            global.UI.toast('Pengeluaran diperbarui', 'success');
          } else {
            S.addExpense(data);
            global.UI.toast(`Tercatat: ${U.rupiah(total)} untuk ${S.getCategory(data.categoryId).name}`, 'success');
          }
          handle.close();
          if (onDone) onDone(data);
        });
      }
    });
    return m;
  }

  /* ---------- Modal: Penjualan Cepat (tanpa pilih menu) ---------- */

  function quickIncomeModal(onDone) {
    const body = `
      <form class="form" id="quickIncomeForm" novalidate>
        <p class="form__hint">${I.get('info', 16)} Cocok untuk mencatat total penjualan sekaligus, misalnya total kasir di akhir hari.</p>
        ${amountField('incomeAmount', 'Jumlah Pemasukan', 0)}
        ${dateTimeFields()}
        ${methodChips('tunai')}
        ${noteField('', 'Misal: setoran penjualan sore')}
      </form>`;

    global.UI.modal({
      title: 'Pemasukan Cepat',
      subtitle: 'Catat uang masuk tanpa memilih menu',
      icon: 'arrowUp',
      size: 'md',
      body: body,
      footer: `
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="quickIncomeForm" class="btn btn--income">${I.get('save', 18)} Catat Pemasukan</button>`,
      onMount: handle => {
        const root = handle.root;
        const amount = bindAmount(root, 'incomeAmount');
        const method = bindChips(root, '[data-methods] .chip--method', 'method');
        const form = root.querySelector('#quickIncomeForm');
        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        form.addEventListener('submit', e => {
          e.preventDefault();
          const total = U.parseNumber(amount.value);
          if (total <= 0) {
            global.UI.toast('Isi dulu jumlah pemasukannya ya', 'warn');
            amount.focus();
            return;
          }
          S.addIncome({
            items: [], total,
            date: form.date.value || U.today(),
            time: form.time.value || U.nowTime(),
            method: method.get() || 'tunai',
            note: form.note.value
          });
          global.UI.toast(`Pemasukan ${U.rupiah(total)} tercatat`, 'success');
          handle.close();
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Detail / Edit Pemasukan ---------- */

  function incomeDetailModal(trx, onDone) {
    const hasItems = trx.items && trx.items.length;
    const rows = (trx.items || []).map((it, idx) => `
      <tr data-idx="${idx}">
        <td class="detail__item">
          <span class="detail__emoji">${it.emoji || '🍽️'}</span>
          <span>${U.escapeHtml(it.name)}<small>${U.rupiah(it.price)} / porsi</small></span>
        </td>
        <td class="detail__qty">
          <div class="stepper stepper--sm">
            <button type="button" class="stepper__btn" data-qty="-1" aria-label="Kurangi">${I.get('minus', 14)}</button>
            <span class="stepper__val">${it.qty}</span>
            <button type="button" class="stepper__btn" data-qty="1" aria-label="Tambah">${I.get('plus', 14)}</button>
          </div>
        </td>
        <td class="detail__sum">${U.rupiah(it.qty * it.price)}</td>
      </tr>`).join('');

    const body = `
      <form class="form" id="incomeEditForm" novalidate>
        ${hasItems ? `
          <div class="table-wrap">
            <table class="table table--detail">
              <thead><tr><th>Menu</th><th class="ta-c">Jumlah</th><th class="ta-r">Subtotal</th></tr></thead>
              <tbody data-items>${rows}</tbody>
            </table>
          </div>
          <div class="detail__totals">
            <div class="detail__total-row"><span>Subtotal</span><b data-subtotal>${U.rupiah(trx.subtotal || 0)}</b></div>
            <div class="detail__total-row">
              <span>Diskon</span>
              <div class="amount-input amount-input--inline">
                <span class="amount-input__prefix">Rp</span>
                <input type="text" id="editDiscount" inputmode="numeric" value="${trx.discount ? U.number(trx.discount) : ''}" placeholder="0">
              </div>
            </div>
            <div class="detail__total-row detail__total-row--grand"><span>Total</span><b data-grand>${U.rupiah(trx.total)}</b></div>
          </div>
        ` : amountField('editIncomeAmount', 'Jumlah Pemasukan', trx.total)}
        ${dateTimeFields(trx.date, trx.time)}
        ${methodChips(trx.method)}
        ${noteField(trx.note)}
      </form>`;

    global.UI.modal({
      title: 'Rincian Pemasukan',
      subtitle: `${U.formatDateRelative(trx.date)} • ${trx.time || '-'}`,
      icon: 'receipt',
      size: 'md',
      body: body,
      footer: `
        <button type="button" class="btn btn--ghost btn--danger-text" data-act="delete">${I.get('trash', 18)} Hapus</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Tutup</button>
        <button type="submit" form="incomeEditForm" class="btn btn--primary">${I.get('save', 18)} Simpan</button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#incomeEditForm');
        const method = bindChips(root, '[data-methods] .chip--method', 'method');
        const items = U.deepClone(trx.items || []);
        let amountInput = null;
        let discountInput = null;

        if (hasItems) {
          discountInput = root.querySelector('#editDiscount');
          U.attachThousand(discountInput);

          const refresh = () => {
            const subtotal = U.sum(items, it => it.qty * it.price);
            let disc = U.parseNumber(discountInput.value);
            if (disc > subtotal) { disc = subtotal; discountInput.value = U.number(disc); }
            root.querySelector('[data-subtotal]').textContent = U.rupiah(subtotal);
            root.querySelector('[data-grand]').textContent = U.rupiah(subtotal - disc);
            root.querySelectorAll('[data-items] tr').forEach(tr => {
              const i = Number(tr.dataset.idx);
              if (!items[i]) { tr.remove(); return; }
              tr.querySelector('.stepper__val').textContent = items[i].qty;
              tr.querySelector('.detail__sum').textContent = U.rupiah(items[i].qty * items[i].price);
            });
          };

          root.querySelector('[data-items]').addEventListener('click', e => {
            const btn = e.target.closest('[data-qty]');
            if (!btn) return;
            const tr = btn.closest('tr');
            const i = Number(tr.dataset.idx);
            const delta = Number(btn.dataset.qty);
            if (!items[i]) return;
            items[i].qty = Math.max(0, items[i].qty + delta);
            if (items[i].qty === 0) {
              if (items.filter(x => x.qty > 0).length === 0) {
                items[i].qty = 1;
                global.UI.toast('Minimal satu item harus tersisa', 'warn');
              } else {
                tr.classList.add('is-removed');
              }
            } else {
              tr.classList.remove('is-removed');
            }
            refresh();
          });
          discountInput.addEventListener('input', refresh);
          refresh();
        } else {
          amountInput = bindAmount(root, 'editIncomeAmount');
        }

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        root.querySelector('[data-act=delete]').addEventListener('click', async () => {
          const ok = await global.UI.confirm({
            title: 'Hapus pemasukan?',
            message: `Transaksi senilai ${U.rupiah(trx.total)} akan dihapus dari laporan.`,
            danger: true, confirmText: 'Hapus'
          });
          if (!ok) return;
          const removed = S.removeTransaction(trx.id);
          handle.close();
          global.UI.toast('Transaksi dihapus', 'info', 7000, {
            label: 'Batalkan',
            onClick: () => { S.restoreTransaction(removed.item, removed.index); global.UI.toast('Dikembalikan', 'success'); }
          });
          if (onDone) onDone();
        });

        form.addEventListener('submit', e => {
          e.preventDefault();
          const patch = {
            date: form.date.value || trx.date,
            time: form.time.value || trx.time,
            method: method.get() || trx.method,
            note: form.note.value
          };
          if (hasItems) {
            const kept = items.filter(it => it.qty > 0);
            if (!kept.length) { global.UI.toast('Minimal satu item harus tersisa', 'warn'); return; }
            patch.items = kept;
            patch.discount = U.parseNumber(discountInput.value);
          } else {
            const total = U.parseNumber(amountInput.value);
            if (total <= 0) { global.UI.toast('Jumlah tidak boleh kosong', 'warn'); return; }
            patch.total = total;
          }
          S.updateTransaction(trx.id, patch);
          global.UI.toast('Transaksi diperbarui', 'success');
          handle.close();
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Tambah / Ubah Menu ---------- */

  function productModal(existing, onDone) {
    const isEdit = !!existing;
    const groups = S.productGroups();
    const emoji = existing ? existing.emoji : '🍽️';
    const group = existing ? existing.group : 'Makanan';

    const body = `
      <form class="form" id="productForm" novalidate>
        <div class="field-row field-row--emoji">
          <div class="field field--tight">
            <span class="field__label">Ikon</span>
            <button type="button" class="emoji-preview" data-emoji-toggle aria-label="Pilih ikon">
              <span data-emoji-current>${emoji}</span>
              ${I.get('chevronDown', 14)}
            </button>
          </div>
          <label class="field field--grow">
            <span class="field__label">Nama Menu</span>
            <input type="text" name="name" maxlength="60" required autocomplete="off" data-autofocus
                   placeholder="Misal: Nasi Goreng Spesial" value="${U.escapeHtml(existing ? existing.name : '')}">
          </label>
        </div>
        <div class="emoji-panel" data-emoji-panel hidden>
          ${global.UI.emojiPicker(I.FOOD_EMOJI, emoji)}
        </div>

        <label class="field">
          <span class="field__label">Kelompok</span>
          <input type="text" name="group" list="groupList" autocomplete="off" value="${U.escapeHtml(group)}" placeholder="Makanan / Minuman / Tambahan">
          <datalist id="groupList">${groups.map(g => `<option value="${U.escapeHtml(g)}"></option>`).join('')}</datalist>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field__label">Harga Jual</span>
            <div class="amount-input">
              <span class="amount-input__prefix">Rp</span>
              <input type="text" id="prodPrice" inputmode="numeric" placeholder="0"
                     value="${existing && existing.price ? U.number(existing.price) : ''}">
            </div>
          </label>
          <label class="field">
            <span class="field__label">Modal / HPP <span class="field__hint">opsional</span></span>
            <div class="amount-input">
              <span class="amount-input__prefix">Rp</span>
              <input type="text" id="prodCost" inputmode="numeric" placeholder="0"
                     value="${existing && existing.cost ? U.number(existing.cost) : ''}">
            </div>
          </label>
        </div>

        <div class="margin-preview" data-margin>
          <span class="margin-preview__label">${I.get('scale', 16)} Untung per porsi</span>
          <span class="margin-preview__value" data-margin-value>–</span>
        </div>
        <p class="form__hint form__hint--muted">
          ${I.get('bulb', 15)} HPP adalah modal bahan untuk membuat satu porsi. Diisi supaya kamu tahu menu mana yang paling menguntungkan.
        </p>
      </form>`;

    global.UI.modal({
      title: isEdit ? 'Ubah Menu' : 'Tambah Menu Baru',
      subtitle: isEdit ? 'Perbarui nama, harga, atau modalnya' : 'Menu akan muncul di halaman Kasir',
      icon: 'book',
      size: 'md',
      body: body,
      footer: `
        ${isEdit ? `<button type="button" class="btn btn--ghost btn--danger-text" data-act="delete">${I.get('trash', 18)} Hapus</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="productForm" class="btn btn--primary">${I.get('save', 18)} Simpan Menu</button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#productForm');
        const priceInput = root.querySelector('#prodPrice');
        const costInput = root.querySelector('#prodCost');
        U.attachThousand(priceInput);
        U.attachThousand(costInput);

        let chosenEmoji = emoji;
        const panel = root.querySelector('[data-emoji-panel]');
        const current = root.querySelector('[data-emoji-current]');
        root.querySelector('[data-emoji-toggle]').addEventListener('click', () => {
          panel.hidden = !panel.hidden;
        });
        panel.addEventListener('click', e => {
          const btn = e.target.closest('[data-emoji]');
          if (!btn) return;
          chosenEmoji = btn.dataset.emoji;
          current.textContent = chosenEmoji;
          panel.querySelectorAll('.emoji-picker__item').forEach(b => {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
          });
          panel.hidden = true;
        });

        const marginValue = root.querySelector('[data-margin-value]');
        const marginBox = root.querySelector('[data-margin]');
        const updateMargin = () => {
          const price = U.parseNumber(priceInput.value);
          const cost = U.parseNumber(costInput.value);
          if (!price || !cost) {
            marginValue.textContent = price && !cost ? 'Isi HPP untuk melihat untung' : '–';
            marginBox.className = 'margin-preview';
            return;
          }
          const profit = price - cost;
          const pct = (profit / price) * 100;
          marginValue.textContent = `${U.rupiah(profit)}  (${pct.toFixed(0)}%)`;
          marginBox.className = 'margin-preview ' +
            (profit <= 0 ? 'is-bad' : pct < 25 ? 'is-warn' : 'is-good');
        };
        priceInput.addEventListener('input', updateMargin);
        costInput.addEventListener('input', updateMargin);
        updateMargin();

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        const del = root.querySelector('[data-act=delete]');
        if (del) {
          del.addEventListener('click', async () => {
            const ok = await global.UI.confirm({
              title: 'Hapus menu ini?',
              message: 'Transaksi yang sudah tercatat tidak ikut terhapus.',
              danger: true, confirmText: 'Hapus menu'
            });
            if (!ok) return;
            S.removeProduct(existing.id);
            handle.close();
            global.UI.toast('Menu dihapus', 'info');
            if (onDone) onDone();
          });
        }

        form.addEventListener('submit', e => {
          e.preventDefault();
          const name = form.name.value.trim();
          const price = U.parseNumber(priceInput.value);
          if (!name) { global.UI.toast('Nama menu belum diisi', 'warn'); form.name.focus(); return; }
          if (price <= 0) { global.UI.toast('Harga jual belum diisi', 'warn'); priceInput.focus(); return; }
          const data = {
            name, price,
            cost: U.parseNumber(costInput.value),
            emoji: chosenEmoji,
            group: form.group.value.trim() || 'Lainnya'
          };
          if (isEdit) { S.updateProduct(existing.id, data); global.UI.toast('Menu diperbarui', 'success'); }
          else { S.addProduct(data); global.UI.toast(`"${name}" ditambahkan ke menu`, 'success'); }
          handle.close();
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Kategori Pengeluaran ---------- */

  function categoryModal(existing, onDone) {
    const isEdit = !!existing;
    const emoji = existing ? existing.emoji : '🧾';
    const colors = ['#f97316', '#0ea5e9', '#ef4444', '#8b5cf6', '#14b8a6', '#eab308', '#ec4899', '#64748b', '#22c55e', '#f43f5e'];
    const color = existing ? existing.color : colors[0];

    const body = `
      <form class="form" id="categoryForm" novalidate>
        <div class="field-row field-row--emoji">
          <div class="field field--tight">
            <span class="field__label">Ikon</span>
            <button type="button" class="emoji-preview" data-emoji-toggle aria-label="Pilih ikon">
              <span data-emoji-current>${emoji}</span>${I.get('chevronDown', 14)}
            </button>
          </div>
          <label class="field field--grow">
            <span class="field__label">Nama Kategori</span>
            <input type="text" name="name" maxlength="40" required autocomplete="off" data-autofocus
                   placeholder="Misal: Bahan Baku" value="${U.escapeHtml(existing ? existing.name : '')}">
          </label>
        </div>
        <div class="emoji-panel" data-emoji-panel hidden>
          ${global.UI.emojiPicker(I.EXPENSE_EMOJI, emoji)}
        </div>
        <div class="field">
          <span class="field__label">Warna di grafik</span>
          <div class="color-picker" data-colors>
            ${colors.map(c => `<button type="button" class="color-picker__dot${c === color ? ' is-active' : ''}"
                  style="--c:${c}" data-color="${c}" aria-label="Warna ${c}"></button>`).join('')}
          </div>
        </div>
      </form>`;

    global.UI.modal({
      title: isEdit ? 'Ubah Kategori' : 'Tambah Kategori',
      subtitle: 'Kategori memudahkan melihat uang paling banyak habis ke mana',
      icon: 'tag',
      size: 'sm',
      body: body,
      footer: `
        ${isEdit ? `<button type="button" class="btn btn--ghost btn--danger-text" data-act="delete">${I.get('trash', 18)} Hapus</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="categoryForm" class="btn btn--primary">${I.get('save', 18)} Simpan</button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#categoryForm');
        let chosenEmoji = emoji;
        let chosenColor = color;

        const panel = root.querySelector('[data-emoji-panel]');
        const current = root.querySelector('[data-emoji-current]');
        root.querySelector('[data-emoji-toggle]').addEventListener('click', () => { panel.hidden = !panel.hidden; });
        panel.addEventListener('click', e => {
          const btn = e.target.closest('[data-emoji]');
          if (!btn) return;
          chosenEmoji = btn.dataset.emoji;
          current.textContent = chosenEmoji;
          panel.querySelectorAll('.emoji-picker__item').forEach(b => b.classList.toggle('is-active', b === btn));
          panel.hidden = true;
        });

        root.querySelector('[data-colors]').addEventListener('click', e => {
          const btn = e.target.closest('[data-color]');
          if (!btn) return;
          chosenColor = btn.dataset.color;
          root.querySelectorAll('.color-picker__dot').forEach(b => b.classList.toggle('is-active', b === btn));
        });

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        const del = root.querySelector('[data-act=delete]');
        if (del) {
          del.addEventListener('click', async () => {
            if (S.get().expenseCategories.length <= 1) {
              global.UI.toast('Minimal harus ada satu kategori', 'warn');
              return;
            }
            const ok = await global.UI.confirm({
              title: 'Hapus kategori?',
              message: 'Pengeluaran lama pada kategori ini akan dipindahkan ke "Lain-lain".',
              danger: true, confirmText: 'Hapus'
            });
            if (!ok) return;
            S.removeCategory(existing.id);
            handle.close();
            global.UI.toast('Kategori dihapus', 'info');
            if (onDone) onDone();
          });
        }

        form.addEventListener('submit', e => {
          e.preventDefault();
          const name = form.name.value.trim();
          if (!name) { global.UI.toast('Nama kategori belum diisi', 'warn'); return; }
          if (isEdit) S.updateCategory(existing.id, { name, emoji: chosenEmoji, color: chosenColor });
          else S.addCategory({ name, emoji: chosenEmoji, color: chosenColor });
          global.UI.toast('Kategori disimpan', 'success');
          handle.close();
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Struk ---------- */

  function receiptModal(trx) {
    const profile = S.get().profile;
    const method = S.PAYMENT_METHODS.find(m => m.id === trx.method);
    const body = `
      <div class="receipt" id="receiptPrint">
        <div class="receipt__head">
          <div class="receipt__logo">🍽️</div>
          <h3>${U.escapeHtml(profile.businessName || 'Usaha Makanan')}</h3>
          <p>${U.formatDateFull(trx.date)} • ${trx.time || ''}</p>
        </div>
        <div class="receipt__divider"></div>
        ${(trx.items && trx.items.length) ? `
          <table class="receipt__table">
            ${trx.items.map(it => `
              <tr>
                <td>${it.emoji || ''} ${U.escapeHtml(it.name)}<br><small>${it.qty} × ${U.rupiah(it.price)}</small></td>
                <td class="ta-r">${U.rupiah(it.qty * it.price)}</td>
              </tr>`).join('')}
          </table>
          <div class="receipt__divider"></div>
          <table class="receipt__table">
            <tr><td>Subtotal</td><td class="ta-r">${U.rupiah(trx.subtotal || 0)}</td></tr>
            ${trx.discount ? `<tr><td>Diskon</td><td class="ta-r">-${U.rupiah(trx.discount)}</td></tr>` : ''}
            <tr class="receipt__grand"><td>TOTAL</td><td class="ta-r">${U.rupiah(trx.total)}</td></tr>
          </table>
        ` : `<table class="receipt__table"><tr class="receipt__grand"><td>TOTAL</td><td class="ta-r">${U.rupiah(trx.total)}</td></tr></table>`}
        <div class="receipt__divider"></div>
        <p class="receipt__meta">Pembayaran: ${method ? method.emoji + ' ' + method.name : U.escapeHtml(trx.method || '-')}</p>
        ${trx.note ? `<p class="receipt__meta">Catatan: ${U.escapeHtml(trx.note)}</p>` : ''}
        <p class="receipt__thanks">Terima kasih 🙏<br>Selamat menikmati!</p>
      </div>`;

    global.UI.modal({
      title: 'Struk Penjualan',
      icon: 'receipt',
      size: 'sm',
      body: body,
      footer: `
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="close">Tutup</button>
        <button type="button" class="btn btn--primary" data-act="print">${I.get('print', 18)} Cetak</button>`,
      onMount: handle => {
        handle.root.querySelector('[data-act=close]').addEventListener('click', () => handle.close());
        handle.root.querySelector('[data-act=print]').addEventListener('click', () => {
          const marked = handle.root.querySelector('#receiptPrint');
          document.body.classList.add('is-printing');
          marked.classList.add('print-target');
          window.print();
          setTimeout(() => {
            document.body.classList.remove('is-printing');
            marked.classList.remove('print-target');
          }, 400);
        });
      }
    });
  }

  global.Forms = {
    expenseModal, quickIncomeModal, incomeDetailModal,
    productModal, categoryModal, receiptModal,
    bindAmount, bindChips, amountField, dateTimeFields, methodChips, noteField
  };
})(window);
