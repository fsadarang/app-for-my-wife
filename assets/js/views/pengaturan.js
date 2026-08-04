/* =========================================================
   View: Pengaturan — profil usaha, tampilan, cadangan data
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  function render(root) {
    const st = S.get();
    const p = st.profile;
    const totalTrx = st.transactions.length;
    const sizeKB = (JSON.stringify(st).length / 1024).toFixed(1);

    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('settings', 22)} Pengaturan</h1>
          <p class="page-sub">Sesuaikan aplikasi dengan usahamu, dan amankan datanya.</p>
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('store', 18)} Profil Usaha</h2>
        </div>
        <form class="form form--settings" id="profileForm">
          <div class="field-row">
            <label class="field">
              <span class="field__label">Nama Usaha</span>
              <input type="text" name="businessName" maxlength="60" placeholder="Misal: Warung Bu Sri"
                     value="${U.escapeHtml(p.businessName || '')}">
            </label>
            <label class="field">
              <span class="field__label">Nama Panggilan Kamu</span>
              <input type="text" name="ownerName" maxlength="40" placeholder="Misal: Bu Sri"
                     value="${U.escapeHtml(p.ownerName || '')}">
            </label>
          </div>
          <div class="field-row">
            <label class="field">
              <span class="field__label">Target Penjualan Harian</span>
              <div class="amount-input"><span class="amount-input__prefix">Rp</span>
                <input type="text" id="setTarget" inputmode="numeric" placeholder="0"
                       value="${p.dailyTarget ? U.number(p.dailyTarget) : ''}"></div>
            </label>
            <label class="field">
              <span class="field__label">Modal Awal / Kas Awal</span>
              <div class="amount-input"><span class="amount-input__prefix">Rp</span>
                <input type="text" id="setCash" inputmode="numeric" placeholder="0"
                       value="${p.startingCash ? U.number(p.startingCash) : ''}"></div>
            </label>
          </div>
          <p class="form__hint form__hint--muted">${I.get('info', 15)} Modal awal adalah uang yang sudah ada di kas sebelum kamu mulai mencatat. Dipakai untuk menghitung Saldo Kas di Beranda.</p>
          <div class="form__actions">
            <button type="submit" class="btn btn--primary">${I.get('save', 18)} Simpan Profil</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('sun', 18)} Tampilan</h2>
        </div>
        <div class="setting-row">
          <div class="setting-row__text">
            <h3>Tema warna</h3>
            <p>Pilih tampilan terang, gelap, atau ikut pengaturan HP.</p>
          </div>
          <div class="seg" data-theme-seg>
            ${[['light', 'Terang', 'sun'], ['dark', 'Gelap', 'moon'], ['auto', 'Otomatis', 'refresh']].map(([v, label, icon]) => `
              <button type="button" class="seg__btn${st.settings.theme === v ? ' is-active' : ''}" data-theme="${v}">
                ${I.get(icon, 15)} ${label}
              </button>`).join('')}
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-row__text">
            <h3>Tampilkan kartu tips</h3>
            <p>Kotak saran berwarna kuning yang muncul di beberapa halaman.</p>
          </div>
          <button type="button" class="switch${st.settings.showTips ? ' is-on' : ''}" data-act="toggle-tips"
                  role="switch" aria-checked="${!!st.settings.showTips}">
            <span class="switch__knob"></span>
          </button>
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('save', 18)} Cadangan &amp; Data</h2>
        </div>
        <div class="callout callout--info">
          <span class="callout__emoji">🔒</span>
          <div>
            <h3>Datamu tersimpan di perangkat ini saja</h3>
            <p>Tidak dikirim ke mana pun. Karena itu, <b>rutinlah membuat cadangan</b> — apalagi sebelum ganti HP atau membersihkan data browser.</p>
          </div>
        </div>

        <div class="setting-grid">
          <button type="button" class="action-tile" data-act="backup">
            <span class="action-tile__icon action-tile__icon--blue">${I.get('download', 22)}</span>
            <span class="action-tile__title">Simpan Cadangan</span>
            <span class="action-tile__text">Unduh seluruh data ke satu berkas (.json)</span>
          </button>
          <button type="button" class="action-tile" data-act="restore">
            <span class="action-tile__icon action-tile__icon--green">${I.get('upload', 22)}</span>
            <span class="action-tile__title">Pulihkan Cadangan</span>
            <span class="action-tile__text">Muat kembali data dari berkas cadangan</span>
          </button>
          <button type="button" class="action-tile" data-act="csv">
            <span class="action-tile__icon action-tile__icon--amber">${I.get('receipt', 22)}</span>
            <span class="action-tile__title">Ekspor Semua ke CSV</span>
            <span class="action-tile__text">Untuk dibuka di Excel / Google Sheets</span>
          </button>
          <button type="button" class="action-tile" data-act="demo">
            <span class="action-tile__icon action-tile__icon--violet">${I.get('sparkle', 22)}</span>
            <span class="action-tile__title">${S.hasDemoData() ? 'Hapus Data Contoh' : 'Isi Data Contoh'}</span>
            <span class="action-tile__text">${S.hasDemoData() ? 'Bersihkan transaksi contoh 21 hari' : 'Coba fitur laporan dengan data 21 hari'}</span>
          </button>
        </div>
        <input type="file" accept="application/json,.json" data-restore-input hidden>

        <div class="data-facts">
          <div class="data-fact"><span>${I.get('receipt', 16)} Transaksi</span><strong>${U.number(totalTrx)}</strong></div>
          <div class="data-fact"><span>${I.get('book', 16)} Menu</span><strong>${st.products.length}</strong></div>
          <div class="data-fact"><span>${I.get('tag', 16)} Kategori</span><strong>${st.expenseCategories.length}</strong></div>
          <div class="data-fact"><span>${I.get('package', 16)} Ukuran data</span><strong>${sizeKB} KB</strong></div>
          <div class="data-fact"><span>${I.get('check', 16)} Penyimpanan</span><strong>${S.isStorageOK() ? 'Normal' : 'Bermasalah'}</strong></div>
        </div>
      </section>

      <section class="card">
        <div class="card__head">
          <h2 class="card__title">${I.get('help', 18)} Panduan Singkat</h2>
        </div>
        <ol class="guide">
          <li><b>Isi daftar menu</b> beserta harga jual dan modal bahannya di halaman <a class="link" href="#/menu">Menu</a>.</li>
          <li><b>Setiap ada pembeli</b>, buka <a class="link" href="#/kasir">Kasir</a>, ketuk menu yang dibeli, lalu simpan.</li>
          <li><b>Setiap belanja atau bayar apa pun</b>, tekan tombol Catat Pengeluaran dan pilih kategorinya.</li>
          <li><b>Setiap akhir hari atau akhir minggu</b>, lihat <a class="link" href="#/laporan">Laporan</a> untuk tahu untung-rugi dan menu terlaris.</li>
          <li><b>Rutin buat cadangan</b> lewat tombol Simpan Cadangan di atas.</li>
        </ol>
        <div class="shortcuts">
          <h3>${I.get('sparkle', 16)} Pintasan keyboard (untuk pengguna laptop)</h3>
          <ul>
            <li><kbd>1</kbd>–<kbd>5</kbd> pindah halaman</li>
            <li><kbd>B</kbd> catat penjualan (Kasir)</li>
            <li><kbd>P</kbd> catat pengeluaran</li>
            <li><kbd>/</kbd> fokus ke kotak pencarian</li>
            <li><kbd>Esc</kbd> tutup jendela yang terbuka</li>
          </ul>
        </div>
      </section>

      <section class="card card--danger">
        <div class="card__head">
          <h2 class="card__title">${I.get('alert', 18)} Zona Hati-hati</h2>
        </div>
        <div class="setting-row">
          <div class="setting-row__text">
            <h3>Hapus semua transaksi</h3>
            <p>Menu dan kategori tetap tersimpan, hanya catatan transaksi yang dihapus.</p>
          </div>
          <button type="button" class="btn btn--danger-outline" data-act="clear-trx">${I.get('trash', 16)} Hapus Transaksi</button>
        </div>
        <div class="setting-row">
          <div class="setting-row__text">
            <h3>Mulai dari awal</h3>
            <p>Menghapus seluruh data: profil, menu, kategori, dan transaksi.</p>
          </div>
          <button type="button" class="btn btn--danger" data-act="reset">${I.get('refresh', 16)} Reset Aplikasi</button>
        </div>
      </section>

      <p class="app-version">Dapur Kita • versi 1.0 • dibuat dengan ❤️ untuk usaha makanan rumahan</p>`;

    bind(root);
  }

  function bind(root) {
    const targetInput = root.querySelector('#setTarget');
    const cashInput = root.querySelector('#setCash');
    U.attachThousand(targetInput);
    U.attachThousand(cashInput);

    root.querySelector('#profileForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      S.updateProfile({
        businessName: f.businessName.value.trim(),
        ownerName: f.ownerName.value.trim(),
        dailyTarget: U.parseNumber(targetInput.value),
        startingCash: U.parseNumber(cashInput.value)
      });
      UI.toast('Profil usaha disimpan', 'success');
      global.App.refreshShell();
    });

    root.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => {
      const mode = btn.dataset.theme;
      S.updateSettings({ theme: mode });
      UI.applyTheme(mode);
      root.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('is-active', b === btn));
      global.Charts.redrawAll();
      global.App.refreshShell();
    }));

    root.querySelector('[data-act=toggle-tips]').addEventListener('click', e => {
      const on = !S.get().settings.showTips;
      S.updateSettings({ showTips: on });
      e.currentTarget.classList.toggle('is-on', on);
      e.currentTarget.setAttribute('aria-checked', String(on));
      if (on) {
        Object.keys(localStorage).forEach(k => {
          if (k.indexOf('dapurku.tip.') === 0) localStorage.removeItem(k);
        });
        UI.toast('Kartu tips ditampilkan kembali', 'success');
      } else {
        UI.toast('Kartu tips disembunyikan', 'info');
      }
    });

    root.querySelector('[data-act=backup]').addEventListener('click', () => {
      const name = (S.get().profile.businessName || 'usaha').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      U.download(`cadangan-${name || 'usaha'}-${U.today()}.json`, S.exportJSON(), 'application/json');
      UI.toast('Cadangan tersimpan. Simpan berkasnya di tempat aman ya.', 'success', 5000);
    });

    const fileInput = root.querySelector('[data-restore-input]');
    root.querySelector('[data-act=restore]').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const ok = await UI.confirm({
        title: 'Pulihkan data dari cadangan?',
        message: 'Seluruh data yang ada sekarang akan digantikan oleh isi berkas cadangan. Pastikan kamu sudah menyimpan cadangan terbaru.',
        danger: true, confirmText: 'Ya, pulihkan'
      });
      if (!ok) { fileInput.value = ''; return; }
      try {
        const text = await file.text();
        S.importJSON(text);
        UI.applyTheme(S.get().settings.theme);
        UI.toast('Data berhasil dipulihkan', 'success');
        global.App.refreshShell();
        render(root);
      } catch (err) {
        console.error(err);
        UI.toast('Berkas tidak bisa dibaca. Pastikan itu berkas cadangan dari aplikasi ini.', 'error', 6000);
      }
      fileInput.value = '';
    });

    root.querySelector('[data-act=csv]').addEventListener('click', () => {
      const st = S.get();
      if (!st.transactions.length) { UI.toast('Belum ada transaksi untuk diekspor', 'warn'); return; }
      const rows = [['Tanggal', 'Jam', 'Jenis', 'Keterangan', 'Kategori/Menu', 'Metode', 'Jumlah']];
      S.sortedDesc(st.transactions).slice().reverse().forEach(t => {
        const isIncome = t.type === 'income';
        rows.push([
          t.date, t.time || '', isIncome ? 'Pemasukan' : 'Pengeluaran', t.note || '',
          isIncome ? (t.items || []).map(it => `${it.name} x${it.qty}`).join(', ') : S.getCategory(t.categoryId).name,
          (S.PAYMENT_METHODS.find(m => m.id === t.method) || {}).name || t.method || '',
          (isIncome ? '' : '-') + t.total
        ]);
      });
      U.download(`semua-transaksi-${U.today()}.csv`, '﻿' + U.toCSV(rows), 'text/csv');
      UI.toast('Seluruh transaksi diekspor ke CSV', 'success');
    });

    root.querySelector('[data-act=demo]').addEventListener('click', async () => {
      if (S.hasDemoData()) {
        const ok = await UI.confirm({
          title: 'Hapus data contoh?',
          message: 'Hanya transaksi contoh yang dihapus. Catatan asli yang kamu buat sendiri tetap aman.',
          confirmText: 'Hapus data contoh'
        });
        if (!ok) return;
        S.clearDemoData();
        UI.toast('Data contoh dihapus', 'success');
      } else {
        const ok = await UI.confirm({
          title: 'Isi dengan data contoh?',
          message: 'Aplikasi akan membuat transaksi contoh selama 21 hari terakhir supaya kamu bisa mencoba grafik dan laporan. Bisa dihapus lagi kapan saja.',
          confirmText: 'Buat data contoh'
        });
        if (!ok) return;
        S.seedDemoTransactions(21);
        UI.toast('Data contoh 21 hari dibuat. Coba buka Laporan!', 'success', 5000);
      }
      render(root);
    });

    root.querySelector('[data-act=clear-trx]').addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Hapus semua transaksi?',
        message: 'Seluruh catatan pemasukan dan pengeluaran akan hilang permanen. Sebaiknya buat cadangan dulu.',
        danger: true, confirmText: 'Hapus semua transaksi'
      });
      if (!ok) return;
      S.clearTransactions();
      UI.toast('Semua transaksi dihapus', 'info');
      render(root);
    });

    root.querySelector('[data-act=reset]').addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Reset seluruh aplikasi?',
        message: 'Semua data akan dihapus dan aplikasi kembali seperti baru dipasang. Tindakan ini tidak bisa dibatalkan.',
        danger: true, confirmText: 'Ya, reset semuanya'
      });
      if (!ok) return;
      S.resetAll();
      UI.applyTheme('auto');
      UI.toast('Aplikasi direset', 'info');
      location.hash = '#/dashboard';
      global.App.refreshShell();
      global.App.checkOnboarding();
    });
  }

  global.Views.pengaturan = render;
})(window);
