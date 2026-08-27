/* =========================================================
   Sync — menyatukan catatan antar perangkat

   ATURAN YANG TIDAK BOLEH DILANGGAR
   Mencatat penjualan TIDAK PERNAH menunggu jaringan. Store menyimpan ke
   HP lebih dulu dan langsung selesai; berkas ini hanya menyusulkan
   salinannya ke server belakangan. Kalau sinyal hilang di lapak, aplikasi
   harus tetap bisa dipakai persis seperti tanpa login.

   Cara kerjanya:
   1. DORONG dulu, baru TARIK. Kalau urutannya dibalik, catatan lokal yang
      belum terkirim bisa ditimpa versi lama dari server.
   2. Yang didorong diambil dari antrean `dirty` — daftar tegas, bukan
      perbandingan jam. Jam HP bisa salah; daftar tidak.
   3. Antrean baru dikosongkan SETELAH server benar-benar menerima.
   ========================================================= */
(function (global) {
  'use strict';

  const S = global.Store;
  const C = global.Cloud;

  let jalan = false;         // sedang menyinkronkan
  let antreLagi = false;     // ada permintaan baru saat masih berjalan
  let timer = null;
  let statusTerakhir = { keadaan: 'mati', pesan: '', waktu: null };
  const pendengar = [];

  const JEDA = 20000;        // sinkron berkala tiap 20 detik

  /** Mundurkan sebuah waktu ISO sekian milidetik */
  function mundurkan(iso, ms) {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (isNaN(t)) return '';
    return new Date(t - ms).toISOString();
  }

  function onStatus(fn) {
    pendengar.push(fn);
    return () => {
      const i = pendengar.indexOf(fn);
      if (i >= 0) pendengar.splice(i, 1);
    };
  }

  function setStatus(keadaan, pesan) {
    statusTerakhir = { keadaan: keadaan, pesan: pesan || '', waktu: new Date().toISOString() };
    pendengar.forEach(fn => { try { fn(statusTerakhir); } catch (e) { console.error(e); } });
  }

  function status() {
    const st = S.get();
    return {
      keadaan: statusTerakhir.keadaan,
      pesan: statusTerakhir.pesan,
      waktu: statusTerakhir.waktu,
      masuk: !!(C.currentUser()),
      email: C.currentUser() ? C.currentUser().email : '',
      belumTerkirim: (st.meta.dirty || []).length,
      terakhirSinkron: st.meta.syncedAt || ''
    };
  }

  /** Kumpulkan catatan yang belum terkirim, lengkap dengan kelompoknya */
  function kumpulkanDorongan() {
    const st = S.get();
    const antre = new Set(st.meta.dirty || []);
    if (!antre.size) return { records: [], deletions: [], ids: [] };

    const records = [];
    const ids = [];
    S.SYNCED_KEYS.forEach(key => {
      st[key].forEach(rec => {
        if (!rec || !rec.id || !antre.has(rec.id)) return;
        const salinan = Object.assign({}, rec);
        salinan.__key = key;
        records.push(salinan);
        ids.push(rec.id);
      });
    });

    // Penghapusan: idnya ada di antrean tapi catatannya sudah tidak ada
    const adaDiCatatan = new Set(ids);
    const deletions = [];
    st.deletions.forEach(d => {
      if (!antre.has(d.id) || adaDiCatatan.has(d.id)) return;
      deletions.push(d);
      ids.push(d.id);
    });

    return { records: records, deletions: deletions, ids: ids };
  }

  /**
   * Satu putaran sinkronisasi.
   * Mengembalikan { ok, alasan, ringkasan } — tidak pernah melempar galat
   * ke pemanggil, supaya kegagalan jaringan tidak pernah mengganggu
   * pemakaian aplikasi.
   */
  async function sekarang(opts) {
    const o = opts || {};
    if (!C.isConfigured() || !C.currentUser()) return { ok: false, alasan: 'belum-masuk' };
    if (jalan) { antreLagi = true; return { ok: false, alasan: 'sedang-jalan' }; }

    jalan = true;
    setStatus('sinkron', 'Menyamakan catatan…');
    let ringkasan = { terkirim: 0, baru: 0, diperbarui: 0, dihapus: 0 };

    try {
      /* --- 1. DORONG --- */
      const dorongan = kumpulkanDorongan();
      if (dorongan.ids.length) {
        await C.dorong(dorongan.records, dorongan.deletions);
        // Baru dikosongkan sekarang, setelah server menerima.
        S.clearDirty(dorongan.ids);
        ringkasan.terkirim = dorongan.ids.length;
      }

      // Profil & pengaturan ikut didorong kalau lebih baru
      const st = S.get();
      if (o.dorongProfil !== false) {
        await C.dorongProfil(st.profile, st.settings, st.meta.updatedAt);
      }

      /* --- 2. TARIK --- */
      // Penandanya sengaja dimundurkan sedikit. Sebuah catatan bisa saja
      // tercatat di server tepat pada detik yang sama dengan tarikan
      // sebelumnya dan luput terbawa. Mundur satu menit membuat beberapa
      // catatan terbaca ulang — dan itu tidak apa-apa, karena catatan yang
      // sudah sama tidak akan menimpa apa pun.
      const masuk = await C.tarik(mundurkan(st.meta.pulledAt, 60000));
      if (masuk.records.length || masuk.deletions.length) {
        const hasil = S.applyRemote(masuk.records, masuk.deletions);
        ringkasan.baru = hasil.baru;
        ringkasan.diperbarui = hasil.diperbarui;
        ringkasan.dihapus = hasil.dihapus;
      }
      // Penanda "sudah sampai mana" memakai jam SERVER (field serverAt),
      // bukan jam perangkat. Jam perangkat yang meleset — atau catatan yang
      // tiba tidak berurutan saat banyak perangkat mengirim bersamaan —
      // bisa membuat penanda melompat terlalu jauh, dan catatan perangkat
      // lain tidak akan pernah terlihat lagi.
      if (masuk.terbaru && masuk.terbaru > (S.get().meta.pulledAt || '')) {
        S.get().meta.pulledAt = masuk.terbaru;
      }
      S.get().meta.syncedAt = new Date().toISOString();
      S.commit();

      const berubah = ringkasan.baru + ringkasan.diperbarui + ringkasan.dihapus;
      setStatus('siap', berubah ? (berubah + ' catatan diperbarui') : 'Semua sudah sama');
      return { ok: true, ringkasan: ringkasan, berubah: berubah };

    } catch (err) {
      console.error('Sinkronisasi gagal:', err);
      if (err && err.perluMasukUlang) {
        setStatus('keluar', 'Sesi berakhir — silakan masuk lagi');
        return { ok: false, alasan: 'sesi-habis', error: err };
      }
      if (C.isNetworkError(err)) {
        setStatus('luring', 'Belum tersambung — catatan aman di HP');
        return { ok: false, alasan: 'jaringan', error: err };
      }
      setStatus('galat', err && err.message ? err.message : 'Gagal menyinkronkan');
      return { ok: false, alasan: 'galat', error: err };

    } finally {
      jalan = false;
      if (antreLagi) { antreLagi = false; setTimeout(() => sekarang({ dorongProfil: false }), 300); }
    }
  }

  /**
   * Login pertama pada perangkat ini: catatan yang SUDAH ADA di HP harus
   * ikut naik ke akun, bukan tertimpa akun kosong.
   *
   * Ini bagian paling berbahaya dari seluruh fitur. Yang dilakukan hanya
   * MENANDAI semua catatan lokal sebagai belum terkirim, lalu menjalankan
   * sinkronisasi biasa: dorong dulu, tarik belakangan. Tidak ada satu pun
   * catatan yang dihapus dalam proses ini.
   */
  async function mulaiUntukAkun(uid) {
    const st = S.get();
    const akunSebelumnya = st.meta.uid || '';

    if (akunSebelumnya && akunSebelumnya !== uid) {
      // Perangkat ini sebelumnya dipakai akun lain. Menggabungkan data dua
      // usaha yang berbeda jelas salah, jadi kasus ini ditolak di lapisan
      // tampilan (pengguna diminta keluar dan mulai dari data kosong).
      return { ok: false, alasan: 'akun-berbeda', akunSebelumnya: akunSebelumnya };
    }

    if (!akunSebelumnya) {
      // Pertama kali akun ini dipakai di sini: apa yang ada di perangkat
      // dijadikan antrean kirim. Perangkat yang masih kosong hanya mengirim
      // yang benar-benar pernah disentuh, supaya bawaan pabrik miliknya
      // tidak menimpa data sungguhan di perangkat lain.
      const jumlah = S.markAllDirty(!S.hasUserContent());
      st.meta.uid = uid;
      st.meta.pulledAt = '';
      S.commit();
      const hasil = await sekarang();
      return Object.assign({ ok: hasil.ok, pertamaKali: true, diunggah: jumlah }, hasil);
    }

    return await sekarang();
  }

  /* ---------- Penjadwalan ---------- */

  function mulaiBerkala() {
    berhentiBerkala();
    timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      sekarang({ dorongProfil: false });
    }, JEDA);
  }

  function berhentiBerkala() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function pasangPemicu() {
    // Kembali ke aplikasi, atau internet nyambung lagi -> segera samakan.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sekarang({ dorongProfil: false });
    });
    window.addEventListener('online', () => sekarang({ dorongProfil: false }));
  }

  /** Bersihkan jejak akun di perangkat ini setelah keluar */
  function lupakanAkun() {
    const st = S.get();
    st.meta.uid = '';
    st.meta.pulledAt = '';
    st.meta.syncedAt = '';
    S.commit();
  }

  global.Sync = {
    sekarang, mulaiUntukAkun, status, onStatus,
    mulaiBerkala, berhentiBerkala, pasangPemicu, lupakanAkun,
    kumpulkanDorongan
  };
})(window);
