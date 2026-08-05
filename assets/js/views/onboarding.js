/* =========================================================
   Onboarding — panduan awal saat aplikasi pertama kali dibuka
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  const draft = { businessName: '', ownerName: '', dailyTarget: 0, startingCash: 0, seedMenu: true, seedDemo: false };
  let step = 0;
  let overlay = null;

  const STEPS = [
    { key: 'welcome', title: 'Selamat datang' },
    { key: 'profile', title: 'Kenalan dulu' },
    { key: 'target', title: 'Target & modal' },
    { key: 'menu', title: 'Daftar menu' },
    { key: 'done', title: 'Siap dipakai' }
  ];

  function start() {
    step = 0;
    overlay = UI.el(`
      <div class="onb" role="dialog" aria-modal="true" aria-label="Panduan awal">
        <div class="onb__card">
          <div class="onb__progress" data-progress></div>
          <div class="onb__body" data-body></div>
          <div class="onb__foot" data-foot></div>
        </div>
      </div>`);
    document.body.appendChild(overlay);
    document.body.classList.add('is-modal-open');
    requestAnimationFrame(() => overlay.classList.add('is-in'));
    renderStep();
  }

  function finish(withDemo) {
    S.updateProfile({
      businessName: draft.businessName.trim(),
      ownerName: draft.ownerName.trim(),
      dailyTarget: draft.dailyTarget,
      startingCash: draft.startingCash,
      startDate: U.today()
    });
    if (draft.seedMenu) S.seedProducts();
    if (withDemo || draft.seedDemo) S.seedDemoTransactions(21);
    S.updateSettings({ onboarded: true });

    overlay.classList.remove('is-in');
    document.body.classList.remove('is-modal-open');
    setTimeout(() => { overlay.remove(); overlay = null; }, 250);

    global.App.refreshShell();
    UI.navigate('dashboard');
    setTimeout(() => {
      UI.toast(`Selamat datang${draft.ownerName ? ', ' + draft.ownerName : ''}! Aplikasi siap dipakai 🎉`, 'success', 5000);
    }, 400);
  }

  function renderStep() {
    const body = overlay.querySelector('[data-body]');
    const foot = overlay.querySelector('[data-foot]');
    const prog = overlay.querySelector('[data-progress]');

    prog.innerHTML = STEPS.map((s, i) => `
      <span class="onb__dot${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}" title="${s.title}"></span>`).join('');

    const view = STEPS[step].key;
    if (view === 'welcome') {
      body.innerHTML = `
        <div class="onb__hero">🍜</div>
        <h1 class="onb__title">Catat jualan, tahu untungnya</h1>
        <p class="onb__lead">Aplikasi sederhana untuk mencatat pemasukan dan pengeluaran usaha makanan. Tidak perlu pengalaman akuntansi.</p>
        <ul class="onb__features">
          <li><span>🧾</span><div><b>Sekali ketuk</b><p>Pilih menu yang dibeli, penjualan langsung tercatat.</p></div></li>
          <li><span>💸</span><div><b>Belanja tercatat rapi</b><p>Kelompokkan pengeluaran: bahan baku, gas, kemasan, dan lainnya.</p></div></li>
          <li><span>📊</span><div><b>Laporan otomatis</b><p>Lihat laba, menu terlaris, dan ke mana uang paling banyak habis.</p></div></li>
          <li><span>🔒</span><div><b>Data milikmu sendiri</b><p>Tersimpan di perangkat ini, tidak dikirim ke mana pun.</p></div></li>
        </ul>`;
      foot.innerHTML = `
        <button type="button" class="btn btn--ghost" data-act="skip">Lewati panduan</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn--primary btn--lg" data-act="next">Mulai ${I.get('arrowRight', 18)}</button>`;
    }

    if (view === 'profile') {
      body.innerHTML = `
        <div class="onb__hero onb__hero--sm">🏪</div>
        <h1 class="onb__title">Kenalan dulu yuk</h1>
        <p class="onb__lead">Nama ini akan tampil di beranda dan di struk penjualan.</p>
        <form class="form" id="onbProfile">
          <label class="field">
            <span class="field__label">Nama Usaha</span>
            <input type="text" name="businessName" maxlength="60" data-autofocus autocomplete="off"
                   placeholder="Misal: Warung Bu Sri" value="${U.escapeHtml(draft.businessName)}">
          </label>
          <label class="field">
            <span class="field__label">Nama Panggilan Kamu <span class="field__hint">opsional</span></span>
            <input type="text" name="ownerName" maxlength="40" autocomplete="off"
                   placeholder="Misal: Bu Sri" value="${U.escapeHtml(draft.ownerName)}">
          </label>
        </form>`;
      foot.innerHTML = navButtons('Lanjut');
      const form = body.querySelector('#onbProfile');
      form.addEventListener('submit', e => e.preventDefault());
      setTimeout(() => form.businessName.focus(), 80);
    }

    if (view === 'target') {
      body.innerHTML = `
        <div class="onb__hero onb__hero--sm">🎯</div>
        <h1 class="onb__title">Target dan modal awal</h1>
        <p class="onb__lead">Keduanya boleh dikosongkan dan diisi nanti di halaman Pengaturan.</p>
        <form class="form" id="onbTarget">
          <label class="field">
            <span class="field__label">Target penjualan per hari</span>
            <div class="amount-input"><span class="amount-input__prefix">Rp</span>
              <input type="text" id="onbTargetAmt" inputmode="numeric" placeholder="0"
                     value="${draft.dailyTarget ? U.number(draft.dailyTarget) : ''}"></div>
            <span class="field__note">Beranda akan menunjukkan seberapa dekat penjualan hari ini dengan targetmu.</span>
          </label>
          <label class="field">
            <span class="field__label">Uang kas yang ada sekarang</span>
            <div class="amount-input"><span class="amount-input__prefix">Rp</span>
              <input type="text" id="onbCashAmt" inputmode="numeric" placeholder="0"
                     value="${draft.startingCash ? U.number(draft.startingCash) : ''}"></div>
            <span class="field__note">Jadi titik awal perhitungan Saldo Kas.</span>
          </label>
        </form>`;
      foot.innerHTML = navButtons('Lanjut');
      U.attachThousand(body.querySelector('#onbTargetAmt'));
      U.attachThousand(body.querySelector('#onbCashAmt'));
      body.querySelector('#onbTarget').addEventListener('submit', e => e.preventDefault());
    }

    if (view === 'menu') {
      body.innerHTML = `
        <div class="onb__hero onb__hero--sm">📖</div>
        <h1 class="onb__title">Daftar menu jualanmu</h1>
        <p class="onb__lead">Mau mulai dari contoh menu, atau isi sendiri dari nol?</p>
        <div class="onb__choices">
          <button type="button" class="onb-choice${draft.seedMenu ? ' is-active' : ''}" data-seed="1">
            <span class="onb-choice__emoji">✨</span>
            <b>Pakai contoh menu</b>
            <p>10 menu warung umum (nasi goreng, mie ayam, es teh, dll). Bisa diubah atau dihapus kapan saja.</p>
          </button>
          <button type="button" class="onb-choice${!draft.seedMenu ? ' is-active' : ''}" data-seed="0">
            <span class="onb-choice__emoji">✍️</span>
            <b>Isi sendiri</b>
            <p>Mulai dari daftar kosong, lalu tambahkan menu satu per satu sesuai jualanmu.</p>
          </button>
        </div>
        <label class="check check--card">
          <input type="checkbox" id="onbDemo" ${draft.seedDemo ? 'checked' : ''}>
          <span><b>Isi juga dengan transaksi contoh 21 hari</b><br>
            <small>Berguna untuk melihat cara kerja grafik dan laporan sebelum kamu mulai mencatat sungguhan. Bisa dihapus lewat Pengaturan.</small></span>
        </label>`;
      foot.innerHTML = navButtons('Lanjut');
      body.querySelectorAll('[data-seed]').forEach(btn => btn.addEventListener('click', () => {
        draft.seedMenu = btn.dataset.seed === '1';
        body.querySelectorAll('[data-seed]').forEach(b => b.classList.toggle('is-active', b === btn));
        const demo = body.querySelector('#onbDemo');
        if (!draft.seedMenu && demo.checked) { demo.checked = false; draft.seedDemo = false; }
      }));
      body.querySelector('#onbDemo').addEventListener('change', e => {
        draft.seedDemo = e.target.checked;
        if (draft.seedDemo && !draft.seedMenu) {
          draft.seedMenu = true;
          body.querySelectorAll('[data-seed]').forEach(b => b.classList.toggle('is-active', b.dataset.seed === '1'));
          UI.toast('Contoh menu ikut ditambahkan agar transaksi contoh punya menu', 'info', 4000);
        }
      });
    }

    if (view === 'done') {
      body.innerHTML = `
        <div class="onb__hero">🎉</div>
        <h1 class="onb__title">Semua siap${draft.ownerName ? ', ' + U.escapeHtml(draft.ownerName) : ''}!</h1>
        <p class="onb__lead">Begini cara pakainya sehari-hari:</p>
        <ol class="onb__steps">
          <li><span class="onb__num">1</span><div><b>Ada pembeli?</b><p>Buka <b>Kasir</b>, ketuk menu yang dibeli, tekan Simpan Penjualan.</p></div></li>
          <li><span class="onb__num">2</span><div><b>Belanja atau bayar sesuatu?</b><p>Tekan tombol <b>Catat Pengeluaran</b>, isi jumlahnya, pilih kategori.</p></div></li>
          <li><span class="onb__num">3</span><div><b>Akhir hari</b><p>Lihat <b>Beranda</b> untuk laba hari ini, atau <b>Laporan</b> untuk gambaran menyeluruh.</p></div></li>
        </ol>
        <div class="onb__note">${I.get('info', 16)} Catatanmu tersimpan di <b>HP ini saja</b> dan tidak berpindah sendiri ke HP lain.
          Sesekali buka Pengaturan → <b>Simpan Cadangan</b>, dan kalau ganti HP pakai <b>Pindah ke HP Lain</b>.</div>`;
      foot.innerHTML = `
        <button type="button" class="btn btn--ghost" data-act="back">${I.get('arrowLeft', 18)} Kembali</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn--primary btn--lg" data-act="finish">${I.get('check', 18)} Mulai Pakai</button>`;
    }

    bindFoot();
  }

  function navButtons(nextLabel) {
    return `
      <button type="button" class="btn btn--ghost" data-act="back">${I.get('arrowLeft', 18)} Kembali</button>
      <span class="spacer"></span>
      <button type="button" class="btn btn--primary btn--lg" data-act="next">${U.escapeHtml(nextLabel)} ${I.get('arrowRight', 18)}</button>`;
  }

  function captureStep() {
    const body = overlay.querySelector('[data-body]');
    const view = STEPS[step].key;
    if (view === 'profile') {
      const f = body.querySelector('#onbProfile');
      draft.businessName = f.businessName.value;
      draft.ownerName = f.ownerName.value;
    }
    if (view === 'target') {
      draft.dailyTarget = U.parseNumber(body.querySelector('#onbTargetAmt').value);
      draft.startingCash = U.parseNumber(body.querySelector('#onbCashAmt').value);
    }
  }

  function bindFoot() {
    const foot = overlay.querySelector('[data-foot]');
    const next = foot.querySelector('[data-act=next]');
    const back = foot.querySelector('[data-act=back]');
    const skip = foot.querySelector('[data-act=skip]');
    const fin = foot.querySelector('[data-act=finish]');

    if (next) next.addEventListener('click', () => { captureStep(); step = Math.min(STEPS.length - 1, step + 1); renderStep(); });
    if (back) back.addEventListener('click', () => { captureStep(); step = Math.max(0, step - 1); renderStep(); });
    if (fin) fin.addEventListener('click', () => finish(false));
    if (skip) skip.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Lewati panduan?',
        message: 'Aplikasi akan langsung terbuka dengan daftar menu kosong. Kamu tetap bisa mengaturnya lewat halaman Pengaturan.',
        confirmText: 'Ya, lewati'
      });
      if (!ok) return;
      draft.seedMenu = false;
      finish(false);
    });
  }

  global.Views.onboarding = { start };
})(window);
