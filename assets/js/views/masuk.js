/* =========================================================
   View: Masuk / Daftar akun

   Login di sini sifatnya OPSIONAL. Tanpa masuk, aplikasi berjalan persis
   seperti sebelumnya — semua catatan tersimpan di HP. Masuk hanya
   menambahkan satu hal: salinan catatan ikut naik ke akun, supaya HP dan
   tablet melihat data yang sama.
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  const C = global.Cloud, Sy = global.Sync;
  global.Views = global.Views || {};

  let mode = 'masuk';   // masuk | daftar

  function render(root, params) {
    if (params && params.mode) mode = params.mode;

    // Sudah masuk? Halaman ini tidak perlu ditampilkan lagi.
    if (C.currentUser()) { UI.navigate('pengaturan'); return; }

    if (!C.isConfigured()) {
      root.innerHTML = `
        <section class="page-head">
          <div><h1 class="page-title">${I.get('users', 22)} Masuk</h1></div>
        </section>
        <div class="notice notice--warn">
          ${I.get('alert', 18)}
          <div>
            <b>Fitur akun belum disiapkan</b>
            <span>Aplikasi tetap bisa dipakai seperti biasa. Semua catatan tersimpan di HP ini.</span>
          </div>
        </div>`;
      return;
    }

    const daftar = mode === 'daftar';
    const punyaData = S.get().transactions.length;

    root.innerHTML = `
      <div class="order-start">
        <div class="order-start__card auth-card">
          <span class="order-start__step">${I.get('users', 15)} Akun Dapur Kita</span>
          <h1 class="order-start__title">${daftar ? 'Buat Akun Baru' : 'Masuk ke Akun'}</h1>
          <p class="order-start__lead">${daftar
            ? 'Sekali buat, lalu bisa dipakai di HP dan tablet sekaligus.'
            : 'Catatanmu akan muncul di semua perangkat yang memakai akun ini.'}</p>

          <div class="seg seg--wide seg--tabs" role="tablist">
            <button type="button" class="seg__btn${!daftar ? ' is-active' : ''}" data-mode="masuk" role="tab">Masuk</button>
            <button type="button" class="seg__btn${daftar ? ' is-active' : ''}" data-mode="daftar" role="tab">Daftar Baru</button>
          </div>

          <form class="form" id="authForm" novalidate>
            <label class="field">
              <span class="field__label">Email</span>
              <input type="email" name="email" autocomplete="email" inputmode="email"
                     data-autofocus placeholder="nama@email.com">
            </label>
            <label class="field">
              <span class="field__label">Kata Sandi ${daftar ? '<span class="field__hint">minimal 6 huruf/angka</span>' : ''}</span>
              <div class="pass-input">
                <input type="password" name="password" autocomplete="${daftar ? 'new-password' : 'current-password'}"
                       placeholder="••••••">
                <button type="button" class="pass-input__eye" data-act="lihat" aria-label="Tampilkan kata sandi">
                  ${I.get('search', 16)}
                </button>
              </div>
            </label>

            <div class="auth-msg" data-msg hidden></div>

            <button type="submit" class="btn btn--primary btn--lg btn--block" data-act="kirim">
              ${daftar ? I.get('plus', 18) + ' Buat Akun' : I.get('check', 18) + ' Masuk'}
            </button>
            ${!daftar ? `<button type="button" class="btn btn--ghost btn--block" data-act="lupa">Lupa kata sandi?</button>` : ''}
          </form>

          ${daftar && punyaData ? `
            <div class="notice notice--info auth-note">
              ${I.get('info', 18)}
              <div>
                <b>${punyaData} catatan di HP ini akan ikut naik ke akun barumu.</b>
                <span>Tidak ada yang dihapus. Catatan yang sudah ada tetap utuh dan langsung tersedia di perangkat lain.</span>
              </div>
            </div>` : ''}

          <button type="button" class="btn btn--ghost btn--block" data-act="lewati">
            Nanti saja — pakai tanpa akun
          </button>
        </div>
      </div>`;

    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; render(root);
    }));
    root.querySelector('[data-act=lewati]').addEventListener('click', () => UI.navigate('dashboard'));

    const form = root.querySelector('#authForm');
    const msg = root.querySelector('[data-msg]');
    const tombol = root.querySelector('[data-act=kirim]');
    const pass = form.password;

    root.querySelector('[data-act=lihat]').addEventListener('click', e => {
      const buka = pass.type === 'password';
      pass.type = buka ? 'text' : 'password';
      e.currentTarget.classList.toggle('is-on', buka);
    });

    function tampilkan(teks, jenis) {
      msg.hidden = false;
      msg.className = 'auth-msg is-' + (jenis || 'bad');
      msg.innerHTML = `${I.get(jenis === 'good' ? 'check' : 'alert', 15)} ${U.escapeHtml(teks)}`;
    }
    function sibuk(on, teks) {
      tombol.disabled = on;
      tombol.innerHTML = on
        ? `${I.get('refresh', 18)} ${U.escapeHtml(teks || 'Sebentar…')}`
        : (daftar ? I.get('plus', 18) + ' Buat Akun' : I.get('check', 18) + ' Masuk');
    }

    const lupa = root.querySelector('[data-act=lupa]');
    if (lupa) lupa.addEventListener('click', async () => {
      const email = form.email.value.trim();
      if (!email) { tampilkan('Isi dulu emailnya, lalu tekan "Lupa kata sandi?" lagi.'); form.email.focus(); return; }
      try {
        await C.resetPassword(email);
        tampilkan('Tautan penggantian kata sandi dikirim ke ' + email + '. Cek kotak masuk (dan folder spam).', 'good');
      } catch (err) {
        tampilkan(err.message || 'Gagal mengirim tautan.');
      }
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = form.email.value.trim();
      const sandi = form.password.value;
      if (!email) { tampilkan('Email belum diisi.'); form.email.focus(); return; }
      if (!sandi) { tampilkan('Kata sandi belum diisi.'); pass.focus(); return; }
      if (daftar && sandi.length < 6) { tampilkan('Kata sandi minimal 6 huruf/angka.'); pass.focus(); return; }

      sibuk(true, daftar ? 'Membuat akun…' : 'Memeriksa…');
      msg.hidden = true;

      let user;
      try {
        user = daftar ? await C.signUp(email, sandi) : await C.signIn(email, sandi);
      } catch (err) {
        sibuk(false);
        tampilkan(err.message || 'Gagal masuk.');
        return;
      }

      sibuk(true, 'Menyamakan catatan…');
      const hasil = await Sy.mulaiUntukAkun(user.uid);

      if (!hasil.ok && hasil.alasan === 'akun-berbeda') {
        sibuk(false);
        C.signOut();
        akunBerbedaModal(root);
        return;
      }

      Sy.mulaiBerkala();
      UI.navigate('dashboard');

      if (hasil.ok && hasil.pertamaKali && hasil.diunggah) {
        UI.toast(`Berhasil masuk. ${hasil.diunggah} catatan dari HP ini ikut naik ke akunmu 🎉`, 'success', 8000);
      } else if (hasil.ok) {
        UI.toast('Berhasil masuk. Catatan sudah disamakan.', 'success', 5000);
      } else {
        UI.toast('Berhasil masuk, tapi belum tersambung ke server. Catatan tetap aman di HP dan akan menyusul otomatis.', 'warn', 9000);
      }
    });
  }

  /** Perangkat ini sudah berisi data akun lain */
  function akunBerbedaModal(root) {
    UI.modal({
      title: 'Data di HP ini milik akun lain',
      subtitle: 'Perlu dipilih dulu sebelum lanjut',
      icon: 'alert',
      size: 'sm',
      body: `
        <p class="confirm__text">
          HP ini sebelumnya dipakai dengan akun yang berbeda, dan catatannya masih ada di sini.
          Menggabungkan catatan dua akun akan mencampur data yang tidak seharusnya bercampur.
        </p>
        <p class="confirm__text" style="margin-top:10px">
          Kalau kamu memang mau memakai akun baru di HP ini, <b>simpan cadangan dulu</b>,
          lalu kosongkan data HP ini dan ambil ulang dari akun barunya.
        </p>`,
      footer: `<span class="spacer"></span>
        <button type="button" class="btn btn--ghost" data-act="batal">Batal</button>
        <button type="button" class="btn btn--soft" data-act="cadangan">${I.get('download', 16)} Simpan Cadangan</button>`,
      onMount: h => {
        h.root.querySelector('[data-act=batal]').addEventListener('click', () => h.close());
        h.root.querySelector('[data-act=cadangan]').addEventListener('click', () => {
          U.download('dapur-kita-cadangan-' + U.today() + '.json', S.exportJSON(), 'application/json');
        });
      }
    });
  }

  global.Views.masuk = render;
})(window);
