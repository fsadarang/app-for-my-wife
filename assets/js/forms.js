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
  const PORSI_CEPAT = S.PORSI_CEPAT;

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
    return {
      get: () => value,
      /** Pilih salah satu dari luar — dipakai saat pilihan lain disembunyikan */
      set: v => {
        const target = chips.find(c => c.dataset[attr] === v);
        if (!target) return;
        chips.forEach(c => c.classList.toggle('is-active', c === target));
        value = v;
      },
      chips
    };
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
          <span>${U.escapeHtml(it.name)}<small>${U.rupiah(it.price)} / pcs</small></span>
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
        <label class="field">
          <span class="field__label">Nama Pelanggan <span class="field__hint">boleh dikosongkan</span></span>
          <input type="text" name="customerName" maxlength="60" autocomplete="off"
                 placeholder="Misal: Bu Ani / Ojol / Meja 3" value="${U.escapeHtml(trx.customerName || '')}">
        </label>
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
        <div class="cash-box-pay" data-cash-block${trx.method === 'tunai' ? '' : ' hidden'}>
          <label class="field">
            <span class="field__label">Uang yang diberikan <span class="field__hint">boleh dikosongkan</span></span>
            <div class="amount-input">
              <span class="amount-input__prefix">Rp</span>
              <input type="text" id="editCash" inputmode="numeric" placeholder="0"
                     value="${trx.cashGiven ? U.number(trx.cashGiven) : ''}">
            </div>
          </label>
          <div class="change-row" data-change-row>
            <span>${I.get('coins', 15)} Kembalian</span>
            <b data-change>${trx.cashGiven ? U.rupiah(trx.change || 0) : '–'}</b>
          </div>
        </div>
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
        <button type="button" class="btn btn--soft" data-act="receipt">${I.get('receipt', 18)} Struk</button>
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

        /* --- Uang tunai & kembalian --- */
        const cashInput = root.querySelector('#editCash');
        const cashBlock = root.querySelector('[data-cash-block]');

        const currentTotal = () => {
          if (hasItems) {
            const subtotal = U.sum(items.filter(it => it.qty > 0), it => it.qty * it.price);
            return Math.max(0, subtotal - U.parseNumber(discountInput.value));
          }
          return U.parseNumber(amountInput.value);
        };

        const refreshChange = () => {
          const given = U.parseNumber(cashInput.value);
          const diff = given - currentTotal();
          const el = root.querySelector('[data-change]');
          const row = root.querySelector('[data-change-row]');
          el.textContent = given > 0
            ? (diff < 0 ? 'Kurang ' + U.rupiah(Math.abs(diff)) : U.rupiah(diff))
            : '–';
          row.classList.toggle('is-short', given > 0 && diff < 0);
          row.classList.toggle('is-ok', given > 0 && diff >= 0);
        };

        U.attachThousand(cashInput);
        cashInput.addEventListener('input', refreshChange);
        if (discountInput) discountInput.addEventListener('input', refreshChange);
        if (amountInput) amountInput.addEventListener('input', refreshChange);
        refreshChange();

        // Kotak uang tunai hanya relevan untuk pembayaran tunai.
        method.chips.forEach(chip => chip.addEventListener('click', () => {
          const isCash = chip.dataset.method === 'tunai';
          cashBlock.hidden = !isCash;
          if (!isCash) { cashInput.value = ''; refreshChange(); }
        }));

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        // Struk dibuka dari data yang sudah tersimpan, bukan dari isian di
        // layar ini — jadi yang tercetak selalu sama dengan yang tercatat.
        root.querySelector('[data-act=receipt]').addEventListener('click', () => {
          const fresh = S.getTransaction(trx.id) || trx;
          receiptModal(fresh);
        });

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
          const chosenMethod = method.get() || trx.method;
          const patch = {
            date: form.date.value || trx.date,
            time: form.time.value || trx.time,
            customerName: form.customerName.value,
            method: chosenMethod,
            cashGiven: chosenMethod === 'tunai' ? U.parseNumber(cashInput.value) : 0,
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
    const isi = S.isiPorsi(existing);

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
          <span class="margin-preview__label">${I.get('scale', 16)} Untung per pcs</span>
          <span class="margin-preview__value" data-margin-value>–</span>
        </div>
        <p class="form__hint form__hint--muted">
          ${I.get('bulb', 15)} <span>Harga jual dan HPP dihitung <b>per pcs</b> — modal bahan untuk membuat satu buah.</span>
        </p>

        <label class="field">
          <span class="field__label">Isi per porsi <span class="field__hint">berapa pcs dihitung 1 porsi</span></span>
          <div class="porsi-field">
            <input type="number" id="prodPorsi" inputmode="numeric" min="1" max="999" step="1"
                   value="${isi}">
            <span class="porsi-field__unit">pcs / porsi</span>
          </div>
          <span class="field__note" data-porsi-note></span>
        </label>
        <p class="form__hint form__hint--muted">
          ${I.get('info', 15)} <span>Dipakai untuk tombol cepat <b>1 / 5 / 10 porsi</b> di Kasir.
          Isi <b>1</b> kalau menu ini memang dijual satuan.</span>
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

        // Pratinjau isi porsi: "1 porsi = 5 pcs = Rp 10.000", supaya
        // angkanya langsung bisa dicocokkan dengan harga yang biasa dipakai.
        const porsiInput = root.querySelector('#prodPorsi');
        const porsiNote = root.querySelector('[data-porsi-note]');
        const updatePorsi = () => {
          const n = S.isiPorsi(porsiInput.value);
          const price = U.parseNumber(priceInput.value);
          porsiNote.innerHTML = n <= 1
            ? 'Dijual satuan — 1 porsi = 1 pcs.'
            : `1 porsi = <b>${U.number(n)} pcs</b>${price ? ` = <b>${U.rupiah(n * price)}</b>` : ''}`;
        };
        porsiInput.addEventListener('input', updatePorsi);
        priceInput.addEventListener('input', updatePorsi);
        updatePorsi();

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
            group: form.group.value.trim() || 'Lainnya',
            isiPorsi: S.isiPorsi(porsiInput.value)
          };
          if (isEdit) { S.updateProduct(existing.id, data); global.UI.toast('Menu diperbarui', 'success'); }
          else { S.addProduct(data); global.UI.toast(`"${name}" ditambahkan ke menu`, 'success'); }
          handle.close();
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Sesuaikan Saldo Kas ---------- */

  /**
   * Kunci kata sandi sebelum angka saldo kas boleh diubah.
   *
   * Yang dicocokkan adalah kata sandi akun yang sedang masuk, diperiksa
   * langsung ke server. Kata sandinya tidak pernah disimpan di perangkat
   * ini, dan tidak ada masa tenggang — tiap kali mau mengubah saldo,
   * kata sandinya diminta lagi.
   *
   * Tanpa internet pemeriksaan tidak bisa dilakukan, jadi perubahannya
   * ditahan. Kalau ditahan, paling-paling penyesuaiannya tertunda; kalau
   * diloloskan, kuncinya bisa dilewati cukup dengan mematikan wifi.
   *
   * Ini pengaman terhadap orang yang memegang perangkatnya, bukan
   * terhadap orang yang paham cara kerja browser.
   */
  function bukaKunciKas() {
    const C = global.Cloud;
    const akun = (C && C.isConfigured()) ? C.currentUser() : null;

    // Belum masuk akun: tidak ada kata sandi yang bisa dicocokkan.
    if (!akun) {
      return global.UI.confirm({
        title: 'Belum masuk ke akun',
        message: 'Kunci kata sandi baru aktif setelah masuk ke akun, karena kata sandinya ' +
          'dicocokkan ke akun itu. Sekarang saldo kas masih bisa diubah tanpa kata sandi. ' +
          'Tetap lanjut mengubah saldo?',
        confirmText: 'Lanjut tanpa kunci'
      });
    }

    return new Promise(resolve => {
      let lolos = false;

      global.UI.modal({
        title: 'Masukkan Kata Sandi',
        subtitle: 'Kata sandi akun ' + akun.email,
        icon: 'lock',
        size: 'sm',
        onClose: () => resolve(lolos),
        body: `
          <form class="form" id="kunciForm" novalidate>
            <p class="form__hint">
              ${I.get('info', 16)}
              <span>Mengubah saldo kas ikut mengubah laporan uangmu, jadi dikunci dulu.
              Kata sandinya <b>tidak disimpan</b> di perangkat ini.</span>
            </p>
            <label class="field">
              <span class="field__label">Kata Sandi</span>
              <div class="pass-input">
                <input type="password" name="sandi" autocomplete="current-password"
                       data-autofocus placeholder="••••••">
                <button type="button" class="pass-input__eye" data-act="lihat"
                        aria-label="Tampilkan kata sandi">${I.get('search', 16)}</button>
              </div>
            </label>
            <div class="auth-msg" data-msg hidden></div>
          </form>`,
        footer: `<span class="spacer"></span>
          <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
          <button type="submit" form="kunciForm" class="btn btn--primary" data-act="buka">
            ${I.get('check', 18)} Buka Kunci
          </button>`,
        onMount: handle => {
          const root = handle.root;
          const form = root.querySelector('#kunciForm');
          const sandi = form.sandi;
          const pesan = root.querySelector('[data-msg]');
          const tombol = root.querySelector('[data-act=buka]');

          const tampilkan = (teks, baik) => {
            pesan.hidden = false;
            pesan.className = 'auth-msg' + (baik ? ' is-good' : ' is-bad');
            pesan.textContent = teks;
          };

          root.querySelector('[data-act=lihat]').addEventListener('click', () => {
            const buka = sandi.type === 'password';
            sandi.type = buka ? 'text' : 'password';
            sandi.focus();
          });

          root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

          form.addEventListener('submit', async e => {
            e.preventDefault();
            const isi = sandi.value;
            if (!isi) { tampilkan('Kata sandi belum diisi.'); sandi.focus(); return; }

            tombol.disabled = true;
            tampilkan('Memeriksa...', true);
            try {
              await C.verifikasiKataSandi(isi);
              lolos = true;
              handle.close();
            } catch (err) {
              // Isian dibiarkan apa adanya supaya tinggal diperbaiki,
              // tidak perlu mengetik ulang dari nol.
              tampilkan(C.isNetworkError(err)
                ? 'Tidak ada internet. Kata sandi perlu diperiksa ke server dulu, ' +
                  'jadi saldo kas belum bisa diubah sekarang.'
                : (err && err.message) || 'Kata sandi salah.');
              sandi.select();
            } finally {
              tombol.disabled = false;
            }
          });
        }
      });
    });
  }

  /**
   * Saldo Kas bukan angka yang disimpan, melainkan hasil hitungan:
   *   Modal Awal + semua pemasukan − semua pengeluaran
   *
   * Karena itu angkanya tidak bisa sekadar ditimpa — begitu ada penjualan
   * berikutnya, hitungannya jalan lagi dan angka yang ditimpa tadi hilang.
   * Yang benar adalah menutup SELISIHNYA, dan ada dua sebab yang berbeda:
   *
   * 1. Uangnya memang keluar/masuk tanpa sempat dicatat (paling sering).
   *    Selisihnya dicatat sebagai transaksi, supaya laporan ikut benar.
   * 2. Angka Modal Awal-nya yang dulu salah ketik.
   *    Yang diperbaiki modal awalnya, dan laporan tidak perlu tersentuh.
   *    Ini hanya berlaku untuk uang tunai — modal awal memang uang tunai.
   */
  function cashAdjustModal(onDone) {
    bukaKunciKas().then(boleh => { if (boleh) jendelaSesuaikanKas(onDone); });
  }

  function jendelaSesuaikanKas(onDone) {
    const grup = S.balanceGrouped();
    const perCara = S.balanceByMethod();
    const total = S.cashBalance();

    // Tiap cara bayar bisa disesuaikan sendiri-sendiri: uang tunai dihitung
    // dari laci, QRIS dan transfer dari mutasi rekening, ojol dari laporan
    // aplikasinya. Angkanya datang dari tempat yang berbeda-beda, jadi
    // selisihnya juga harus bisa ditutup satu per satu.
    let caraAktif = 'tunai';
    const cariCara = id => perCara.find(r => r.id === id) || perCara[0];

    const body = `
      <form class="form" id="cashForm" novalidate>
        <div class="kas-now">
          <span class="kas-now__label">${I.get('wallet', 15)} Total seluruh saldo</span>
          <strong class="kas-now__value">${U.rupiah(total)}</strong>
        </div>

        <div class="kas-split">
          <div class="kas-split__row is-tunai">
            <span class="kas-split__emoji">${grup.tunai.emoji}</span>
            <span class="kas-split__name">
              ${U.escapeHtml(grup.tunai.name)}
              <small>bisa dipegang hari ini</small>
            </span>
            <strong class="kas-split__val ${grup.tunai.saldo < 0 ? 'is-neg' : ''}">${U.rupiah(grup.tunai.saldo)}</strong>
          </div>
          <div class="kas-split__row is-nontunai">
            <span class="kas-split__emoji">${grup.nonTunai.emoji}</span>
            <span class="kas-split__name">
              ${U.escapeHtml(grup.nonTunai.name)}
              <small>${grup.nonTunai.rincian.map(r => r.name + ' ' + U.rupiah(r.saldo)).join(' • ')}</small>
            </span>
            <strong class="kas-split__val ${grup.nonTunai.saldo < 0 ? 'is-neg' : ''}">${U.rupiah(grup.nonTunai.saldo)}</strong>
          </div>
        </div>

        <div class="field">
          <span class="field__label">Saldo mana yang mau disesuaikan?</span>
          <div class="chip-row" data-kas-cara>
            ${perCara.map(r => `
              <button type="button" class="chip chip--method${r.id === caraAktif ? ' is-active' : ''}"
                      data-kas-cara-val="${r.id}">
                <span class="chip__emoji">${r.emoji}</span>${U.escapeHtml(r.name)}
              </button>`).join('')}
          </div>
        </div>

        <label class="field">
          <span class="field__label" data-kas-label></span>
          <div class="amount-input">
            <span class="amount-input__prefix">Rp</span>
            <input type="text" id="kasReal" inputmode="numeric" placeholder="0" data-autofocus>
          </div>
          <span class="field__note" data-kas-note></span>
        </label>

        <div class="kas-diff" data-diff></div>

        <div class="field" data-cara-wrap>
          <span class="field__label">Selisihnya mau dicatat sebagai apa?</span>
          <div class="kas-cara" data-cara>
            <button type="button" class="kas-opt is-active" data-cara-val="transaksi">
              <strong>Catat sebagai penyesuaian</strong>
              <span>Saldo kas jadi cocok, tapi selisihnya <b>tidak dihitung</b> sebagai penjualan
              atau pengeluaran di Laporan — jadi untung-rugimu tidak ikut berubah.</span>
            </button>
            <button type="button" class="kas-opt" data-cara-val="modal">
              <strong>Modal awal saya yang salah</strong>
              <span>Yang diperbaiki angka Modal Awal-nya saja. Laporan penjualan dan pengeluaran
              tidak berubah sama sekali.</span>
            </button>
          </div>
        </div>
      </form>`;

    global.UI.modal({
      title: 'Sesuaikan Saldo Kas',
      subtitle: 'Cocokkan dengan uang yang sebenarnya',
      icon: 'wallet',
      size: 'md',
      body: body,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="cashForm" class="btn btn--primary" data-act="simpan">
          ${I.get('save', 18)} Sesuaikan
        </button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#cashForm');
        const input = root.querySelector('#kasReal');
        const diff = root.querySelector('[data-diff]');
        const simpan = root.querySelector('[data-act=simpan]');
        const label = root.querySelector('[data-kas-label]');
        const nota = root.querySelector('[data-kas-note]');
        const caraWrap = root.querySelector('[data-cara-wrap]');
        U.attachThousand(input);

        const cara = bindChips(root, '[data-cara] .kas-opt', 'caraVal');

        const baris = () => cariCara(caraAktif);
        const selisih = () => U.parseNumber(input.value) - baris().saldo;

        /** Tiap cara bayar punya kalimat sendiri — sumber angkanya beda */
        const PENJELASAN = {
          tunai: { ikon: 'banknote', apa: 'Uang TUNAI yang benar-benar ada di laci sekarang' },
          qris: { ikon: 'qr', apa: 'Saldo QRIS menurut catatan aplikasi/rekeningmu' },
          transfer: { ikon: 'creditCard', apa: 'Saldo TRANSFER menurut mutasi rekeningmu' },
          ojol: { ikon: 'package', apa: 'Saldo OJOL / ONLINE menurut laporan aplikasinya' }
        };

        function gambarKolom() {
          const r = baris();
          const p = PENJELASAN[r.id] || { ikon: 'wallet', apa: 'Saldo ' + r.name + ' yang sebenarnya' };
          label.innerHTML = `${I.get(p.ikon, 14)} ${U.escapeHtml(p.apa)}`;
          input.value = r.saldo ? U.number(r.saldo) : '';
          nota.innerHTML =
            `Tercatat ${U.rupiah(r.saldo)} — dari ` +
            (r.modalAwal ? `modal awal ${U.rupiah(r.modalAwal)} + ` : '') +
            `masuk ${U.rupiah(r.masuk)} − keluar ${U.rupiah(r.keluar)}. ` +
            `Saldo cara bayar lain tidak ikut berubah.`;

          // "Modal awal saya yang salah" hanya masuk akal untuk uang tunai:
          // modal awal usaha memang uang tunai, bukan saldo QRIS atau ojol.
          const bolehModal = r.id === 'tunai';
          caraWrap.hidden = !bolehModal;
          if (!bolehModal) cara.set('transaksi');
          gambarSelisih();
        }

        function gambarSelisih() {
          const r = baris();
          const d = selisih();
          if (!d) {
            diff.className = 'kas-diff is-sama';
            diff.innerHTML = `${I.get('check', 16)} Saldo ${U.escapeHtml(r.name)} sudah cocok — tidak ada yang perlu disesuaikan.`;
            simpan.disabled = true;
            return;
          }
          const lebih = d > 0;
          diff.className = 'kas-diff ' + (lebih ? 'is-lebih' : 'is-kurang');
          diff.innerHTML = `
            ${I.get(lebih ? 'trendUp' : 'trendDown', 16)}
            <span>Saldo ${U.escapeHtml(r.name)} <b>${lebih ? 'lebih' : 'kurang'} ${U.rupiah(Math.abs(d))}</b>
            dari yang tercatat. Total seluruh saldo akan jadi ${U.rupiah(total + d)}.</span>`;
          simpan.disabled = false;
        }

        root.querySelectorAll('[data-kas-cara-val]').forEach(chip => {
          chip.addEventListener('click', () => {
            caraAktif = chip.dataset.kasCaraVal;
            root.querySelectorAll('[data-kas-cara-val]').forEach(b =>
              b.classList.toggle('is-active', b === chip));
            gambarKolom();
            input.focus();
          });
        });

        input.addEventListener('input', gambarSelisih);
        gambarKolom();

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        form.addEventListener('submit', e => {
          e.preventDefault();
          const d = selisih();
          if (!d) return;
          const r = baris();
          const target = U.parseNumber(input.value);

          if (r.id === 'tunai' && cara.get() === 'modal') {
            // Modal awal memang uang tunai, jadi menggesernya sebesar
            // selisih akan membuat saldo tunai pas.
            const modalAwal = Number(S.get().profile.startingCash) || 0;
            S.updateProfile({ startingCash: Math.max(0, modalAwal + d) });
            handle.close();
            global.UI.toast(`Modal awal diperbaiki. Uang tunai sekarang tercatat ${U.rupiah(target)}.`, 'success', 6000);
            if (onDone) onDone();
            return;
          }

          // Ditandai sebagai penyesuaian: ikut menghitung saldo kas, tapi
          // TIDAK ikut di laporan untung-rugi. Tanpa penanda ini, sekali
          // penyesuaian besar bisa membuat satu hari terlihat rugi jutaan.
          const catatan = 'Penyesuaian saldo ' + r.name;
          if (d > 0) {
            S.addIncome({ total: d, customerName: '', note: catatan, method: r.id, adjustment: true });
          } else {
            const kategori = S.get().expenseCategories.find(c => c.id === 'cat_lain') ||
              S.get().expenseCategories[0];
            S.addExpense({
              total: Math.abs(d), categoryId: kategori && kategori.id,
              note: catatan, method: r.id, adjustment: true
            });
          }
          handle.close();
          global.UI.toast(
            `Saldo ${r.name} sekarang tercatat ${U.rupiah(target)}. ` +
            `Selisih ${U.rupiah(Math.abs(d))} tidak dihitung sebagai ` +
            `${d > 0 ? 'penjualan' : 'pengeluaran'} di Laporan.`, 'success', 8000);
          if (onDone) onDone();
        });
      }
    });
  }

  /* ---------- Modal: Stok Harian ---------- */

  /**
   * Atur berapa pcs satu menu yang tersedia pada satu tanggal.
   *
   * Angka pada kotak isian adalah TOTAL yang dibuat hari itu. Yang
   * disimpan hanya selisihnya, jadi menambah 20 pcs sore hari tetap
   * tercatat sebagai penambahan tersendiri dan riwayatnya kelihatan.
   */
  function stockModal(product, date, onDone) {
    const d = date || U.today();
    const isi = S.isiPorsi(product);
    // Menu yang dijual per porsi lebih enak ditambah per porsi juga:
    // sekali goreng biasanya sekian porsi, bukan sekian pcs ganjil.
    const chip = isi > 1
      ? [1, 2, 5, 10, 20].map(n => ({ n: n * isi, label: `${n} porsi` }))
      : [5, 10, 20, 25, 50].map(n => ({ n: n, label: String(n) }));

    function stats() {
      const row = S.stockOverview(d).find(r => r.productId === product.id);
      return row || { dibuat: 0, terjual: 0, dikeep: 0, sisa: 0, diatur: false };
    }

    const start = stats();

    const body = `
      <form class="form" id="stockForm" novalidate>
        <div class="stock-head">
          <span class="stock-head__emoji">${product.emoji || '🍽️'}</span>
          <div class="stock-head__body">
            <strong class="stock-head__name">${U.escapeHtml(product.name)}</strong>
            <span class="stock-head__date">${I.get('calendar', 13)} ${U.formatDateRelative(d)}</span>
          </div>
        </div>

        <label class="field">
          <span class="field__label">Jumlah yang dibuat <span class="field__hint">dalam pcs${isi > 1 ? ` — 1 porsi = ${U.number(isi)} pcs` : ''}</span></span>
          <div class="stock-input">
            <button type="button" class="stock-input__btn" data-step="-1" aria-label="Kurangi satu">${I.get('minus', 18)}</button>
            <input type="number" id="stockQty" inputmode="numeric" min="0" step="1" value="${start.dibuat}" data-autofocus aria-label="Jumlah yang dibuat">
            <button type="button" class="stock-input__btn" data-step="1" aria-label="Tambah satu">${I.get('plus', 18)}</button>
          </div>
        </label>

        <div class="chip-row chip-row--quick">
          ${chip.map(c => `<button type="button" class="chip chip--quick" data-add="${c.n}">${I.get('plus', 13)} ${U.escapeHtml(c.label)}</button>`).join('')}
        </div>

        <div class="stock-preview" data-preview></div>

        <label class="field">
          <span class="field__label">Catatan <span class="field__hint">opsional</span></span>
          <input type="text" name="note" maxlength="60" autocomplete="off" placeholder="Misal: gorengan kedua">
        </label>

        <div data-history></div>
      </form>`;

    global.UI.modal({
      title: 'Atur Stok',
      subtitle: 'Berapa yang tersedia untuk dijual',
      icon: 'package',
      size: 'md',
      body: body,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="stockForm" class="btn btn--primary">${I.get('save', 18)} Simpan Stok</button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#stockForm');
        const input = root.querySelector('#stockQty');
        const preview = root.querySelector('[data-preview]');
        const history = root.querySelector('[data-history]');

        const readQty = () => Math.max(0, Math.round(Number(input.value) || 0));

        function drawPreview() {
          const s = stats();
          const dibuat = readQty();
          const sisa = dibuat - s.terjual - s.dikeep;
          const tone = sisa < 0 ? 'is-bad' : sisa === 0 ? 'is-warn' : 'is-good';
          preview.innerHTML = `
            <div class="stock-preview__row">
              <span>${I.get('cart', 14)} Terjual</span><b>${s.terjual}</b>
            </div>
            <div class="stock-preview__row">
              <span>${I.get('calendar', 14)} Ter-keep (pre-order)</span><b>${s.dikeep}</b>
            </div>
            <div class="stock-preview__row stock-preview__row--total ${tone}">
              <span>${I.get('package', 15)} Sisa bisa dijual</span>
              <b>${sisa}${isi > 1 && sisa > 0 ? ` <small>(${U.escapeHtml(S.porsiText(sisa, isi))})</small>` : ''}</b>
            </div>
            ${sisa < 0 ? `<p class="stock-preview__warn">${I.get('alert', 14)} Yang terjual dan ter-keep sudah lebih banyak dari yang dibuat. Tambah jumlahnya kalau memang sempat bikin lagi.</p>` : ''}`;
        }

        function drawHistory() {
          const list = S.stockEntries(d, product.id);
          if (!list.length) {
            history.innerHTML = `<p class="form__hint form__hint--muted">${I.get('info', 15)} Belum ada catatan stok untuk tanggal ini.</p>`;
            return;
          }
          history.innerHTML = `
            <div class="stock-log">
              <span class="field__label">Riwayat hari ini</span>
              <ul class="stock-log__list">
                ${list.map(s => `
                  <li class="stock-log__item">
                    <b class="stock-log__qty ${s.qty < 0 ? 'is-neg' : ''}">${s.qty > 0 ? '+' : ''}${s.qty}</b>
                    <span class="stock-log__meta">
                      ${clockOf(s.createdAt)}${s.note ? ' • ' + U.escapeHtml(s.note) : ''}
                    </span>
                    <button type="button" class="icon-btn stock-log__del" data-del="${s.id}" aria-label="Hapus catatan ini">${I.get('trash', 14)}</button>
                  </li>`).join('')}
              </ul>
            </div>`;
          history.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => {
              S.removeStockEntry(btn.dataset.del);
              // Kotak isian ikut menyesuaikan, supaya angkanya tidak
              // menimpa balik catatan yang barusan dihapus.
              input.value = String(stats().dibuat);
              drawHistory();
              drawPreview();
              if (onDone) onDone();
            });
          });
        }

        root.querySelectorAll('[data-step]').forEach(btn => {
          btn.addEventListener('click', () => {
            input.value = String(Math.max(0, readQty() + Number(btn.dataset.step)));
            drawPreview();
          });
        });
        root.querySelectorAll('[data-add]').forEach(btn => {
          btn.addEventListener('click', () => {
            input.value = String(readQty() + Number(btn.dataset.add));
            drawPreview();
          });
        });
        input.addEventListener('input', drawPreview);

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        form.addEventListener('submit', e => {
          e.preventDefault();
          const target = readQty();
          const before = stats().dibuat;
          const entry = S.setStockMade(product.id, d, target, form.note.value.trim());
          handle.close();
          if (!entry) global.UI.toast('Jumlah stok tidak berubah', 'info', 3000);
          else if (entry.qty > 0 && before > 0) global.UI.toast(`Stok "${product.name}" ditambah ${entry.qty} → ${target}`, 'success');
          else global.UI.toast(`Stok "${product.name}" diatur ${target}`, 'success');
          if (onDone) onDone();
        });

        drawPreview();
        drawHistory();
      }
    });
  }

  function clockOf(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
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

  /* ---------- Modal: Pre-Order ---------- */

  /**
   * Catat pesanan untuk tanggal mendatang.
   * Nilainya belum masuk pemasukan — baru dihitung saat diselesaikan.
   */
  function preorderModal(existing, onDone) {
    const isEdit = !!existing;
    const items = existing ? U.deepClone(existing.items || []) : [];
    const products = S.get().products.filter(p => p.active !== false);
    let search = '';

    const body = `
      <form class="form" id="preorderForm" novalidate>
        <div class="field-row">
          <label class="field">
            <span class="field__label">Nama Pemesan</span>
            <input type="text" name="customerName" maxlength="60" autocomplete="off" data-autofocus
                   placeholder="Misal: Bu Ani" value="${U.escapeHtml(existing ? existing.customerName : '')}">
          </label>
          <label class="field">
            <span class="field__label">No. HP <span class="field__hint">opsional</span></span>
            <input type="tel" name="phone" maxlength="25" autocomplete="off"
                   placeholder="08xx" value="${U.escapeHtml(existing ? existing.phone : '')}">
          </label>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field__label">Harus selesai tanggal</span>
            <input type="date" name="dueDate" value="${existing ? existing.dueDate : U.addDays(U.today(), 1)}" max="2999-12-31">
          </label>
          <label class="field">
            <span class="field__label">Jam <span class="field__hint">opsional</span></span>
            <input type="time" name="dueTime" value="${existing ? existing.dueTime : ''}">
          </label>
        </div>
        <div class="chip-row" data-due-quick>
          <button type="button" class="chip chip--quick" data-due="0">Hari ini</button>
          <button type="button" class="chip chip--quick" data-due="1">Besok</button>
          <button type="button" class="chip chip--quick" data-due="2">Lusa</button>
          <button type="button" class="chip chip--quick" data-due="7">Minggu depan</button>
        </div>

        <div class="field">
          <span class="field__label">Pesanan</span>
          <div class="po-items" data-po-items></div>
        </div>

        <div class="field">
          <span class="field__label">Tambah menu <span class="field__hint">ketuk untuk menambah</span></span>
          <div class="search search--sm">
            ${I.get('search', 17, 'search__icon')}
            <input type="search" id="poSearch" placeholder="Cari menu..." autocomplete="off">
          </div>
          <div class="po-picker" data-po-picker></div>
        </div>

        ${noteField(existing && existing.note, 'Misal: antar ke alamat, tidak pedas')}
      </form>`;

    global.UI.modal({
      title: isEdit ? 'Ubah Pre-Order' : 'Pre-Order Baru',
      subtitle: 'Pesanan untuk dikerjakan di tanggal mendatang',
      icon: 'calendar',
      size: 'md',
      body: body,
      footer: `
        ${isEdit ? `<button type="button" class="btn btn--ghost btn--danger-text" data-act="delete">${I.get('trash', 18)} Hapus</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="preorderForm" class="btn btn--primary" data-act="save">
          ${I.get('save', 18)} Simpan
        </button>`,
      onMount: handle => {
        const root = handle.root;
        const form = root.querySelector('#preorderForm');
        const itemsHost = root.querySelector('[data-po-items]');
        const pickerHost = root.querySelector('[data-po-picker]');
        const saveBtn = root.querySelector('[data-act=save]');

        const total = () => U.sum(items, it => it.qty * it.price);

        function renderItems() {
          if (!items.length) {
            itemsHost.innerHTML = `<p class="po-items__empty">${I.get('info', 15)} Belum ada menu. Pilih dari daftar di bawah.</p>`;
          } else {
            itemsHost.innerHTML = items.map((it, i) => {
              const isi = S.isiPorsi(it);
              return `
              <div class="po-item" data-i="${i}">
                <span class="po-item__emoji">${it.emoji || '🍽️'}</span>
                <div class="po-item__body">
                  <p class="po-item__name">${U.escapeHtml(it.name)}</p>
                  <p class="po-item__price">${U.rupiah(it.price)} × ${U.number(it.qty)} pcs = <b>${U.rupiah(it.price * it.qty)}</b></p>
                  ${isi > 1 ? `<p class="cart-item__porsi">${I.get('package', 12)} <b>${U.escapeHtml(S.porsiText(it.qty, isi))}</b></p>` : ''}
                </div>
                <button type="button" class="icon-btn" data-del aria-label="Hapus">${I.get('trash', 15)}</button>
                <div class="po-item__steppers">
                  ${isi > 1 ? `
                    <div class="stepper stepper--sm stepper--porsi">
                      <button type="button" class="stepper__btn" data-porsi-dec
                              ${it.qty - isi < 1 ? 'disabled' : ''} aria-label="Kurangi satu porsi">${I.get('minus', 14)}</button>
                      <span class="stepper__val">${U.number(Math.floor(it.qty / isi))}<small>porsi</small></span>
                      <button type="button" class="stepper__btn" data-porsi-inc aria-label="Tambah satu porsi">${I.get('plus', 14)}</button>
                    </div>` : ''}
                  <div class="stepper stepper--sm">
                    <button type="button" class="stepper__btn" data-dec aria-label="Kurangi satu pcs">${I.get('minus', 14)}</button>
                    <span class="stepper__val">${U.number(it.qty)}<small>pcs</small></span>
                    <button type="button" class="stepper__btn" data-inc aria-label="Tambah satu pcs">${I.get('plus', 14)}</button>
                  </div>
                </div>
                <div class="porsi-quick porsi-quick--full">
                  ${PORSI_CEPAT.map(n => `
                    <button type="button" class="chip chip--porsi${it.qty === n * isi ? ' is-active' : ''}"
                            data-porsi="${n}">${n} ${isi > 1 ? 'porsi' : 'pcs'}</button>`).join('')}
                </div>
              </div>`;
            }).join('') +
              `<div class="po-total"><span>Total pesanan</span><b>${U.rupiah(total())}</b></div>`;
          }
          saveBtn.disabled = items.length === 0;
          saveBtn.classList.toggle('is-disabled', items.length === 0);

          itemsHost.querySelectorAll('.po-item').forEach(node => {
            const i = Number(node.dataset.i);
            node.querySelector('[data-inc]').addEventListener('click', () => { items[i].qty += 1; renderItems(); renderPicker(); });
            node.querySelector('[data-dec]').addEventListener('click', () => {
              items[i].qty -= 1;
              if (items[i].qty <= 0) items.splice(i, 1);
              renderItems(); renderPicker();
            });
            node.querySelector('[data-del]').addEventListener('click', () => { items.splice(i, 1); renderItems(); renderPicker(); });

            // Naik-turun satu porsi penuh; sisa pcs yang tidak genap
            // dibiarkan apa adanya. Tombol kurang mati kalau hasilnya
            // akan kurang dari 1 pcs, supaya barisnya tidak terhapus.
            const poDec = node.querySelector('[data-porsi-dec]');
            if (poDec) poDec.addEventListener('click', () => {
              const n = S.isiPorsi(items[i]);
              if (items[i].qty - n < 1) return;
              items[i].qty -= n;
              renderItems(); renderPicker();
            });
            const poInc = node.querySelector('[data-porsi-inc]');
            if (poInc) poInc.addEventListener('click', () => {
              items[i].qty += S.isiPorsi(items[i]);
              renderItems(); renderPicker();
            });

            node.querySelectorAll('[data-porsi]').forEach(chip => {
              chip.addEventListener('click', () => {
                const n = Number(chip.dataset.porsi) || 1;
                items[i].qty = Math.max(1, n * S.isiPorsi(items[i]));
                renderItems(); renderPicker();
              });
            });
          });
        }

        function renderPicker() {
          const list = products.filter(p => U.matches(p.name, search) || U.matches(p.group, search));
          if (!products.length) {
            pickerHost.innerHTML = `<p class="po-items__empty">Belum ada menu. Tambahkan dulu di halaman Menu.</p>`;
            return;
          }
          if (!list.length) {
            pickerHost.innerHTML = `<p class="po-items__empty">Tidak ada menu cocok dengan "${U.escapeHtml(search)}".</p>`;
            return;
          }
          pickerHost.innerHTML = list.map(p => {
            const chosen = items.find(x => x.productId === p.id);
            const isi = S.isiPorsi(p);
            return `
              <button type="button" class="po-pick${chosen ? ' is-chosen' : ''}" data-pick="${p.id}">
                <span class="po-pick__emoji">${p.emoji || '🍽️'}</span>
                <span class="po-pick__name">${U.escapeHtml(p.name)}${isi > 1
                  ? `<small>1 porsi = ${U.number(isi)} pcs</small>` : ''}</span>
                <span class="po-pick__price">${U.rupiah(p.price)}</span>
                ${chosen ? `<span class="po-pick__badge">${U.number(chosen.qty)}</span>` : ''}
              </button>`;
          }).join('');
          pickerHost.querySelectorAll('[data-pick]').forEach(btn => {
            btn.addEventListener('click', () => {
              const p = S.getProduct(btn.dataset.pick);
              if (!p) return;
              // Sekali ketuk = satu porsi, sama seperti di Kasir.
              const isi = S.isiPorsi(p);
              const found = items.find(x => x.productId === p.id);
              if (found) { found.isiPorsi = isi; found.qty += isi; }
              else items.push({
                productId: p.id, name: p.name, emoji: p.emoji,
                qty: isi, price: p.price, cost: p.cost, isiPorsi: isi, note: ''
              });
              renderItems(); renderPicker();
            });
          });
        }

        const searchEl = root.querySelector('#poSearch');
        searchEl.addEventListener('input', U.debounce(() => {
          search = searchEl.value.trim();
          renderPicker();
        }, 150));

        root.querySelectorAll('[data-due]').forEach(btn => btn.addEventListener('click', () => {
          form.dueDate.value = U.addDays(U.today(), Number(btn.dataset.due));
        }));

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        const del = root.querySelector('[data-act=delete]');
        if (del) del.addEventListener('click', async () => {
          const ok = await global.UI.confirm({
            title: 'Hapus pre-order?',
            message: `Pesanan ${existing.customerName || 'ini'} akan dihapus dari daftar.`,
            danger: true, confirmText: 'Hapus'
          });
          if (!ok) return;
          const removed = S.removePreorder(existing.id);
          handle.close();
          global.UI.toast('Pre-order dihapus', 'info', 7000, {
            label: 'Batalkan',
            onClick: () => { S.restorePreorder(removed.item, removed.index); global.UI.toast('Dikembalikan', 'success'); }
          });
          if (onDone) onDone();
        });

        form.addEventListener('submit', e => {
          e.preventDefault();
          if (!items.length) { global.UI.toast('Pilih dulu menu yang dipesan', 'warn'); return; }
          const data = {
            customerName: form.customerName.value,
            phone: form.phone.value,
            dueDate: form.dueDate.value || U.addDays(U.today(), 1),
            dueTime: form.dueTime.value,
            note: form.note.value,
            items: items
          };
          if (isEdit) {
            S.updatePreorder(existing.id, data);
            global.UI.toast('Pre-order diperbarui', 'success');
          } else {
            S.addPreorder(data);
            global.UI.toast(`Pre-order untuk ${U.formatDateRelative(data.dueDate)} tersimpan`, 'success', 5000);
          }
          handle.close();
          if (onDone) onDone();
        });

        renderItems();
        renderPicker();
      }
    });
  }

  /** Selesaikan pre-order: barang diserahkan, uang diterima, jadi pemasukan */
  function completePreorderModal(po, onDone) {
    const body = `
      <form class="form" id="completePoForm" novalidate>
        <div class="po-confirm">
          <p class="po-confirm__name">${I.get('users', 16)} ${U.escapeHtml(po.customerName || 'Tanpa nama')}</p>
          <ul class="po-confirm__items">
            ${(po.items || []).map(it => `<li>${it.emoji || '🍽️'} ${U.escapeHtml(it.name)} <b>×${it.qty}</b></li>`).join('')}
          </ul>
          <div class="po-confirm__total"><span>Total tagihan</span><b>${U.rupiah(po.total)}</b></div>
        </div>
        <p class="form__hint">${I.get('info', 16)} <span>Setelah disimpan, nilainya baru masuk sebagai <b>pemasukan hari ini</b>.</span></p>
        ${methodChips('tunai')}
        <div class="cash-box-pay" data-cash-block>
          <label class="field">
            <span class="field__label">Uang yang diberikan <span class="field__hint">opsional</span></span>
            <div class="amount-input">
              <span class="amount-input__prefix">Rp</span>
              <input type="text" id="poCash" inputmode="numeric" placeholder="0">
            </div>
          </label>
          <div class="change-row" data-change-row>
            <span>${I.get('coins', 15)} Kembalian</span>
            <b data-change>–</b>
          </div>
        </div>
      </form>`;

    global.UI.modal({
      title: 'Selesaikan Pre-Order',
      subtitle: `Jatuh tempo ${U.formatDateRelative(po.dueDate)}`,
      icon: 'check',
      size: 'sm',
      body: body,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="cancel">Batal</button>
        <button type="submit" form="completePoForm" class="btn btn--income">${I.get('check', 18)} Selesai &amp; Catat</button>`,
      onMount: handle => {
        const root = handle.root;
        const method = bindChips(root, '[data-methods] .chip--method', 'method');
        const cashInput = root.querySelector('#poCash');
        const cashBlock = root.querySelector('[data-cash-block]');
        U.attachThousand(cashInput);

        const refreshChange = () => {
          const given = U.parseNumber(cashInput.value);
          const diff = given - po.total;
          const el = root.querySelector('[data-change]');
          const row = root.querySelector('[data-change-row]');
          el.textContent = given > 0 ? (diff < 0 ? 'Kurang ' + U.rupiah(Math.abs(diff)) : U.rupiah(diff)) : '–';
          row.classList.toggle('is-short', given > 0 && diff < 0);
          row.classList.toggle('is-ok', given > 0 && diff >= 0);
        };
        cashInput.addEventListener('input', refreshChange);
        method.chips.forEach(chip => chip.addEventListener('click', () => {
          const isCash = chip.dataset.method === 'tunai';
          cashBlock.hidden = !isCash;
          if (!isCash) { cashInput.value = ''; refreshChange(); }
        }));

        root.querySelector('[data-act=cancel]').addEventListener('click', () => handle.close());

        root.querySelector('#completePoForm').addEventListener('submit', e => {
          e.preventDefault();
          const chosen = method.get() || 'tunai';
          const given = chosen === 'tunai' ? U.parseNumber(cashInput.value) : 0;
          if (given > 0 && given < po.total) {
            global.UI.toast(`Uang yang diberikan kurang ${U.rupiah(po.total - given)}`, 'warn', 5000);
            return;
          }
          const trx = S.completePreorder(po.id, { method: chosen, cashGiven: given });
          handle.close();
          global.UI.toast(`Pre-order selesai — ${U.rupiah(po.total)} masuk sebagai pemasukan`, 'success', 6000, {
            label: 'Lihat Struk',
            onClick: () => { if (trx) receiptModal(trx); }
          });
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
          <div class="receipt__logo">${profile.logo
            ? `<img src="${profile.logo}" alt="">`
            : '🍽️'}</div>
          <h3>${U.escapeHtml(profile.businessName || 'Usaha Makanan')}</h3>
          <p>${U.formatDateFull(trx.date)} • ${trx.time || ''}</p>
          ${trx.customerName ? `<p class="receipt__customer">Pelanggan: <b>${U.escapeHtml(trx.customerName)}</b></p>` : ''}
        </div>
        <div class="receipt__divider"></div>
        ${(trx.items && trx.items.length) ? `
          <table class="receipt__table">
            ${trx.items.map(it => {
              const isi = S.isiPorsi(it);
              return `
              <tr>
                <td>${it.emoji || ''} ${U.escapeHtml(it.name)}<br><small>${U.number(it.qty)} pcs × ${U.rupiah(it.price)}</small>
                  ${isi > 1 ? `<br><small>(${U.escapeHtml(S.porsiText(it.qty, isi))})</small>` : ''}
                  ${it.note ? `<br><small>* ${U.escapeHtml(it.note)}</small>` : ''}</td>
                <td class="ta-r">${U.rupiah(it.qty * it.price)}</td>
              </tr>`;
            }).join('')}
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
        ${trx.cashGiven ? `
          <table class="receipt__table">
            <tr><td>Uang diberikan</td><td class="ta-r">${U.rupiah(trx.cashGiven)}</td></tr>
            <tr><td><b>Kembalian</b></td><td class="ta-r"><b>${U.rupiah(trx.change || 0)}</b></td></tr>
          </table>` : ''}
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
    productModal, categoryModal, receiptModal, preorderModal, completePreorderModal, stockModal,
    cashAdjustModal, bukaKunciKas,
    bindAmount, bindChips, amountField, dateTimeFields, methodChips, noteField
  };
})(window);
