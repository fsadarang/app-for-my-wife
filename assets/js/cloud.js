/* =========================================================
   Cloud — sambungan ke Firebase lewat REST

   Sengaja TANPA pustaka Firebase. Aplikasi ini tidak memakai fitur berat
   Firestore (pendengar waktu-nyata, simpanan luring bawaan) karena catatan
   tetap disimpan di HP lebih dulu lewat Store. Yang dibutuhkan hanya dua:
   masuk-akun, dan baca/tulis dokumen. Keduanya cukup lewat REST biasa,
   jadi aplikasi tetap tanpa ketergantungan luar dan tetap ringan.

   Tiap catatan disimpan sebagai satu dokumen berisi:
     { id, updatedAt, isi }   <- "isi" adalah catatan aslinya dalam JSON
   Menyimpan sebagai satu teks JSON membuat penyandian nilai Firestore
   tidak perlu rumit, dan tidak ada risiko salah menerjemahkan angka,
   larik, atau catatan bersarang.
   ========================================================= */
(function (global) {
  'use strict';

  const CFG = global.FIREBASE_CONFIG || {};
  const TOKEN_KEY = 'dapurku.auth.v1';

  const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token';
  const DB_URL = 'https://firestore.googleapis.com/v1/projects/' +
    CFG.projectId + '/databases/(default)/documents';

  // Nama kelompok di Firestore untuk tiap kelompok catatan di aplikasi
  const COLLECTION = {
    transactions: 'transaksi',
    products: 'menu',
    preorders: 'preorder',
    stocks: 'stok',
    expenseCategories: 'kategori'
  };
  const KEY_OF = {};
  Object.keys(COLLECTION).forEach(k => { KEY_OF[COLLECTION[k]] = k; });

  let session = null;      // { idToken, refreshToken, uid, email, expiresAt }
  const listeners = [];

  /* ---------- Sesi ---------- */

  function loadSession() {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      session = raw ? JSON.parse(raw) : null;
    } catch (e) { session = null; }
    return session;
  }

  function saveSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* penyimpanan penuh — sesi tetap jalan sampai tab ditutup */ }
    listeners.forEach(fn => { try { fn(s); } catch (e) { console.error(e); } });
  }

  function onAuthChanged(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function currentUser() {
    return session ? { uid: session.uid, email: session.email } : null;
  }

  function isConfigured() {
    return !!(CFG.apiKey && CFG.projectId);
  }

  /* ---------- Pesan galat dalam bahasa yang bisa dimengerti ---------- */

  const PESAN = {
    EMAIL_EXISTS: 'Email ini sudah terdaftar. Coba Masuk saja.',
    EMAIL_NOT_FOUND: 'Email ini belum terdaftar.',
    INVALID_PASSWORD: 'Kata sandi salah.',
    INVALID_LOGIN_CREDENTIALS: 'Email atau kata sandi salah.',
    INVALID_EMAIL: 'Alamat email tidak benar.',
    MISSING_PASSWORD: 'Kata sandi belum diisi.',
    WEAK_PASSWORD: 'Kata sandi terlalu pendek — minimal 6 huruf/angka.',
    USER_DISABLED: 'Akun ini dinonaktifkan.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
    OPERATION_NOT_ALLOWED: 'Masuk dengan email belum diaktifkan di proyek Firebase.',
    TOKEN_EXPIRED: 'Sesi berakhir. Silakan masuk lagi.',
    USER_NOT_FOUND: 'Akun tidak ditemukan. Silakan masuk lagi.'
  };

  function terjemahkan(kode) {
    if (!kode) return 'Terjadi gangguan. Coba lagi.';
    const bersih = String(kode).split(' : ')[0].trim();
    if (PESAN[bersih]) return PESAN[bersih];
    if (bersih.indexOf('WEAK_PASSWORD') === 0) return PESAN.WEAK_PASSWORD;
    if (bersih.indexOf('TOO_MANY_ATTEMPTS') === 0) return PESAN.TOO_MANY_ATTEMPTS_TRY_LATER;
    return 'Gagal: ' + bersih;
  }

  /** Galat yang berarti "jaringan bermasalah", bukan "data/akun salah" */
  function isNetworkError(err) {
    return !!(err && err.jaringan);
  }

  async function minta(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      const err = new Error('Tidak ada sambungan internet.');
      err.jaringan = true;
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const kode = data && data.error && data.error.message;
      const err = new Error(terjemahkan(kode));
      err.kode = kode;
      // 5xx = servernya yang bermasalah, layak dicoba lagi nanti
      if (res.status >= 500) err.jaringan = true;
      throw err;
    }
    return data;
  }

  /* ---------- Masuk & daftar ---------- */

  function simpanHasilAuth(d) {
    saveSession({
      idToken: d.idToken,
      refreshToken: d.refreshToken,
      uid: d.localId,
      email: d.email,
      expiresAt: Date.now() + (Number(d.expiresIn || 3600) - 60) * 1000
    });
    return currentUser();
  }

  async function signUp(email, password) {
    const d = await minta(AUTH_URL + 'signUp?key=' + CFG.apiKey,
      { email: email, password: password, returnSecureToken: true });
    return simpanHasilAuth(d);
  }

  async function signIn(email, password) {
    const d = await minta(AUTH_URL + 'signInWithPassword?key=' + CFG.apiKey,
      { email: email, password: password, returnSecureToken: true });
    return simpanHasilAuth(d);
  }

  async function resetPassword(email) {
    await minta(AUTH_URL + 'sendOobCode?key=' + CFG.apiKey,
      { requestType: 'PASSWORD_RESET', email: email });
    return true;
  }

  function signOut() {
    saveSession(null);
  }

  /**
   * Pastikan token masih berlaku. Token hanya hidup satu jam, jadi
   * diperbarui memakai refresh token yang berumur panjang.
   */
  async function segarkanToken() {
    if (!session) throw new Error('Belum masuk.');
    if (Date.now() < session.expiresAt) return session.idToken;

    let res;
    try {
      res = await fetch(REFRESH_URL + '?key=' + CFG.apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(session.refreshToken)
      });
    } catch (e) {
      const err = new Error('Tidak ada sambungan internet.');
      err.jaringan = true;
      throw err;
    }
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Refresh token ditolak = sesi benar-benar sudah tidak berlaku.
      // Bedakan dari gangguan jaringan: yang ini harus masuk ulang.
      if (res.status >= 500) {
        const err = new Error('Server sedang bermasalah.');
        err.jaringan = true;
        throw err;
      }
      saveSession(null);
      const err = new Error('Sesi berakhir. Silakan masuk lagi.');
      err.perluMasukUlang = true;
      throw err;
    }
    saveSession({
      idToken: d.id_token,
      refreshToken: d.refresh_token,
      uid: d.user_id,
      email: session.email,
      expiresAt: Date.now() + (Number(d.expires_in || 3600) - 60) * 1000
    });
    return session.idToken;
  }

  /* ---------- Firestore ---------- */

  async function db(path, opts) {
    const token = await segarkanToken();
    const o = opts || {};
    let res;
    try {
      res = await fetch(DB_URL + path, {
        method: o.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: o.body ? JSON.stringify(o.body) : undefined
      });
    } catch (e) {
      const err = new Error('Tidak ada sambungan internet.');
      err.jaringan = true;
      throw err;
    }
    if (res.status === 404 && (o.method || 'GET') === 'GET') return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const kode = data && data.error && data.error.message;
      const err = new Error(kode || ('Gagal menghubungi server (' + res.status + ')'));
      err.kode = kode;
      if (res.status >= 500 || res.status === 429) err.jaringan = true;
      if (res.status === 401 || res.status === 403) err.perluMasukUlang = res.status === 401;
      throw err;
    }
    return data;
  }

  const akar = () => '/pengguna/' + session.uid;

  /**
   * Satu catatan -> satu dokumen Firestore.
   *
   * Ada DUA tanda waktu, dan bedanya penting:
   * - `updatedAt` : jam PERANGKAT. Dipakai hanya untuk menentukan versi
   *                 mana yang menang kalau satu catatan disunting dari
   *                 dua tempat.
   * - `serverAt`  : jam SERVER, diisi Firestore sendiri saat menerima.
   *                 Dipakai sebagai penanda "sudah sampai mana" waktu
   *                 menarik. Tidak boleh memakai jam perangkat di sini:
   *                 jam yang meleset, atau catatan yang tiba tidak
   *                 berurutan, bisa membuat penanda melompat terlalu jauh
   *                 sehingga catatan perangkat lain tidak pernah terlihat.
   */
  function keDokumen(rec) {
    return {
      fields: {
        id: { stringValue: String(rec.id) },
        updatedAt: { stringValue: String(rec.updatedAt || new Date().toISOString()) },
        isi: { stringValue: JSON.stringify(rec) }
      }
    };
  }

  const TRANSFORM_SERVER = [{ fieldPath: 'serverAt', setToServerValue: 'REQUEST_TIME' }];

  function docPath(sisa) {
    return 'projects/' + CFG.projectId + '/databases/(default)/documents' + akar() + '/' + sisa;
  }

  function dariDokumen(doc) {
    const f = doc && doc.fields;
    if (!f || !f.isi || typeof f.isi.stringValue !== 'string') return null;
    try {
      const rec = JSON.parse(f.isi.stringValue);
      if (f.updatedAt && f.updatedAt.stringValue) rec.updatedAt = f.updatedAt.stringValue;
      return rec;
    } catch (e) { return null; }
  }

  /**
   * Ambil catatan yang berubah setelah `sejak`.
   * Firestore bisa membandingkan teks, dan format waktu ISO berurut secara
   * abjad, jadi perbandingan biasa sudah tepat.
   */
  /**
   * Ambil semua yang tiba di server setelah `sejak` (waktu server).
   * Penyaringan dan pengurutan memakai `serverAt`, bukan jam perangkat.
   */
  async function tarik(sejak) {
    const keluar = { records: [], deletions: [], terbaru: sejak || '' };

    function bikinQuery(nama, batas) {
      const q = {
        structuredQuery: {
          from: [{ collectionId: nama }],
          orderBy: [{ field: { fieldPath: 'serverAt' }, direction: 'ASCENDING' }],
          limit: batas
        }
      };
      if (sejak) {
        q.structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: 'serverAt' },
            op: 'GREATER_THAN',
            value: { timestampValue: sejak }
          }
        };
      }
      return q;
    }

    function catatServerAt(doc) {
      const f = doc.fields || {};
      const s = f.serverAt && f.serverAt.timestampValue;
      if (s && s > keluar.terbaru) keluar.terbaru = s;
      return s;
    }

    for (const key of Object.keys(COLLECTION)) {
      const hasil = await db(akar() + ':runQuery', { method: 'POST', body: bikinQuery(COLLECTION[key], 2000) });
      (hasil || []).forEach(baris => {
        if (!baris.document) return;
        const rec = dariDokumen(baris.document);
        if (!rec) return;
        rec.__key = key;
        keluar.records.push(rec);
        catatServerAt(baris.document);
      });
    }

    const hasilHapus = await db(akar() + ':runQuery', { method: 'POST', body: bikinQuery('dihapus', 5000) });
    (hasilHapus || []).forEach(baris => {
      if (!baris.document) return;
      const f = baris.document.fields || {};
      const id = f.id && f.id.stringValue;
      if (!id) return;
      keluar.deletions.push({ id: id, at: (f.updatedAt && f.updatedAt.stringValue) || '' });
      catatServerAt(baris.document);
    });

    return keluar;
  }

  /**
   * Kirim catatan dan penghapusan ke server dalam satu tulisan berkelompok.
   * Firestore membatasi 500 tulisan per kelompok, jadi dipecah.
   */
  async function dorong(records, deletions) {
    const writes = [];

    (records || []).forEach(rec => {
      const nama = COLLECTION[rec.__key];
      if (!nama) return;
      const salinan = Object.assign({}, rec);
      delete salinan.__key;
      writes.push({
        update: Object.assign({ name: docPath(nama + '/' + rec.id) }, keDokumen(salinan)),
        updateTransforms: TRANSFORM_SERVER
      });
    });

    (deletions || []).forEach(d => {
      writes.push({
        update: {
          name: docPath('dihapus/' + d.id),
          fields: {
            id: { stringValue: String(d.id) },
            updatedAt: { stringValue: String(d.at || new Date().toISOString()) }
          }
        },
        updateTransforms: TRANSFORM_SERVER
      });
    });

    if (!writes.length) return 0;

    for (let i = 0; i < writes.length; i += 400) {
      await db(':commit', { method: 'POST', body: { writes: writes.slice(i, i + 400) } });
    }
    return writes.length;
  }

  /** Profil & pengaturan disimpan terpisah — satu dokumen saja */
  async function tarikProfil() {
    const doc = await db(akar() + '/pengaturan/utama');
    if (!doc) return null;
    return dariDokumen(doc);
  }

  async function dorongProfil(profile, settings, updatedAt) {
    const isi = { profile: profile, settings: settings, updatedAt: updatedAt };
    await db(akar() + '/pengaturan/utama?updateMask.fieldPaths=id' +
      '&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=isi', {
      method: 'PATCH',
      body: keDokumen(Object.assign({ id: 'utama' }, isi))
    });
    return true;
  }

  global.Cloud = {
    isConfigured, loadSession, currentUser, onAuthChanged,
    signUp, signIn, signOut, resetPassword,
    tarik, dorong, tarikProfil, dorongProfil,
    isNetworkError, COLLECTION, KEY_OF, TOKEN_KEY
  };
})(window);
