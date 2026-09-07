/* =========================================================
   Store — sumber kebenaran data + penyimpanan lokal (localStorage)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;
  const KEY = 'dapurku.data.v1';
  const SCHEMA = 5;   // 5: penanda waktu perubahan + daftar penghapusan (untuk sinkronisasi)

  // Kelompok catatan yang ikut disinkronkan antar perangkat
  const SYNCED_KEYS = ['transactions', 'products', 'preorders', 'stocks', 'expenseCategories'];
  const LOW_STOCK = 5;   // sisa segini atau kurang dianggap "menipis"

  /* ---------- Data bawaan ---------- */

  const DEFAULT_EXPENSE_CATEGORIES = [
    { id: 'cat_bahan', name: 'Bahan Baku', emoji: '🥬', color: '#f97316', tip: 'Belanja sayur, daging, beras, bumbu.' },
    { id: 'cat_kemasan', name: 'Kemasan', emoji: '📦', color: '#0ea5e9', tip: 'Kotak nasi, plastik, sendok, kantong.' },
    { id: 'cat_gas', name: 'Gas & Listrik', emoji: '🔥', color: '#ef4444', tip: 'Isi gas, token listrik, air.' },
    { id: 'cat_gaji', name: 'Gaji & Upah', emoji: '👩‍🍳', color: '#8b5cf6', tip: 'Upah karyawan atau bantuan harian.' },
    { id: 'cat_sewa', name: 'Sewa Tempat', emoji: '🏠', color: '#14b8a6', tip: 'Sewa kios, lapak, atau dapur.' },
    { id: 'cat_transport', name: 'Transport', emoji: '🛵', color: '#eab308', tip: 'Bensin, ongkir, parkir.' },
    { id: 'cat_promo', name: 'Promosi', emoji: '📢', color: '#ec4899', tip: 'Iklan, spanduk, endorse, diskon.' },
    { id: 'cat_alat', name: 'Peralatan', emoji: '🔧', color: '#64748b', tip: 'Beli/servis wajan, kompor, etalase.' },
    { id: 'cat_lain', name: 'Lain-lain', emoji: '🧾', color: '#94a3b8', tip: 'Pengeluaran yang tidak masuk kategori lain.' }
  ];

  const SAMPLE_PRODUCTS = [
    { name: 'Nasi Goreng Spesial', emoji: '🍚', price: 20000, cost: 9000, group: 'Makanan' },
    { name: 'Mie Ayam Bakso', emoji: '🍜', price: 18000, cost: 8000, group: 'Makanan' },
    { name: 'Ayam Geprek + Nasi', emoji: '🍗', price: 22000, cost: 11000, group: 'Makanan' },
    { name: 'Soto Ayam', emoji: '🍲', price: 17000, cost: 7500, group: 'Makanan' },
    { name: 'Nasi Uduk Komplit', emoji: '🍱', price: 15000, cost: 6500, group: 'Makanan' },
    { name: 'Es Teh Manis', emoji: '🥤', price: 5000, cost: 1500, group: 'Minuman' },
    { name: 'Es Jeruk', emoji: '🧃', price: 7000, cost: 2500, group: 'Minuman' },
    { name: 'Kopi Susu', emoji: '☕', price: 12000, cost: 4500, group: 'Minuman' },
    { name: 'Kerupuk', emoji: '🍘', price: 2000, cost: 700, group: 'Tambahan' },
    { name: 'Telur Ceplok', emoji: '🍳', price: 5000, cost: 2500, group: 'Tambahan' }
  ];

  const PAYMENT_METHODS = [
    { id: 'tunai', name: 'Tunai', emoji: '💵', icon: 'banknote' },
    { id: 'qris', name: 'QRIS', emoji: '📱', icon: 'qr' },
    { id: 'transfer', name: 'Transfer', emoji: '🏦', icon: 'creditCard' },
    { id: 'ojol', name: 'Ojol / Online', emoji: '🛵', icon: 'package' }
  ];

  function defaultState() {
    return {
      schema: SCHEMA,
      profile: {
        businessName: '',
        ownerName: '',
        dailyTarget: 0,
        startingCash: 0,
        logo: '',            // data URI logo usaha, kosong = pakai ikon bawaan
        startDate: U.today()
      },
      settings: {
        theme: 'auto',
        onboarded: false,
        showTips: true
      },
      products: [],
      expenseCategories: U.deepClone(DEFAULT_EXPENSE_CATEGORIES),
      transactions: [],
      preorders: [],
      stocks: [],
      deletions: [],
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dirty: [],        // id yang belum terkirim ke server
        pulledAt: '',     // waktu perubahan terbaru yang sudah diambil dari server
        uid: ''           // akun yang datanya sedang dipegang salinan ini
      }
    };
  }

  /* ---------- State & persistensi ---------- */

  let state = defaultState();
  const listeners = new Set();
  let storageOK = true;

  // Cap waktu tulisan terakhir yang kita ketahui. Dipakai untuk mengenali
  // kalau tab/jendela lain sempat menyimpan sesuatu di belakang kita.
  let lastSeenAt = null;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
      lastSeenAt = (parsed.meta && parsed.meta.updatedAt) || null;
      return true;
    } catch (e) {
      console.error('Gagal memuat data tersimpan:', e);

      // Data yang tidak terbaca disalin dulu ke kunci terpisah supaya masih
      // bisa diselamatkan, baru aplikasi dilanjutkan. Sebelumnya penyimpanan
      // dikunci total di titik ini — akibatnya seluruh pencatatan berikutnya
      // gagal diam-diam padahal layar tetap bilang "tersimpan".
      try {
        if (raw) localStorage.setItem(KEY + '.rusak.' + Date.now(), raw);
      } catch (_) { /* penyimpanan penuh, tidak ada yang bisa dilakukan */ }

      setTimeout(() => {
        if (global.UI && global.UI.toast) {
          global.UI.toast('Data lama tidak terbaca dan sudah diamankan ke salinan terpisah. Aplikasi tetap bisa dipakai — pulihkan dari cadangan bila catatanmu hilang.', 'error', 15000);
        }
      }, 800);
      return false;
    }
  }

  function migrate(data) {
    const base = defaultState();
    const s = Object.assign(base, data || {});
    s.profile = Object.assign(base.profile, data && data.profile);
    s.settings = Object.assign(base.settings, data && data.settings);
    s.meta = Object.assign(base.meta, data && data.meta);
    if (!Array.isArray(s.products)) s.products = [];
    if (!Array.isArray(s.transactions)) s.transactions = [];
    // Skema 2 -> 3: catatan lama belum punya daftar pre-order.
    if (!Array.isArray(s.preorders)) s.preorders = [];
    // Skema 3 -> 4: catatan lama belum punya catatan stok harian.
    if (!Array.isArray(s.stocks)) s.stocks = [];
    // Skema 4 -> 5: daftar penghapusan, dipakai agar catatan yang dihapus
    // di satu perangkat tidak "hidup lagi" saat perangkat lain menyusul.
    if (!Array.isArray(s.deletions)) s.deletions = [];
    if (!Array.isArray(s.meta.dirty)) s.meta.dirty = [];
    if (typeof s.meta.pulledAt !== 'string') s.meta.pulledAt = '';
    if (typeof s.meta.uid !== 'string') s.meta.uid = '';
    if (!Array.isArray(s.expenseCategories) || !s.expenseCategories.length) {
      s.expenseCategories = U.deepClone(DEFAULT_EXPENSE_CATEGORIES);
    }

    // Skema 1 -> 2: transaksi lama belum punya nama pelanggan, uang
    // dibayar, kembalian, atau catatan per item. Diisi nilai kosong agar
    // catatan yang sudah ada tetap utuh dan tetap bisa dibuka.
    s.transactions.forEach(t => {
      if (t.type !== 'income') return;
      if (t.customerName == null) t.customerName = '';
      if (t.cashGiven == null) t.cashGiven = 0;
      if (t.change == null) t.change = 0;
      if (Array.isArray(t.items)) {
        t.items.forEach(it => { if (it.note == null) it.note = ''; });
      }
    });

    s.schema = SCHEMA;
    return s;
  }

  /**
   * Satukan catatan dari tab/jendela lain sebelum menimpa.
   *
   * Aplikasi bisa terbuka lebih dari satu tempat sekaligus (mis. ikon di
   * layar utama dan tab browser). Tiap salinan memegang datanya sendiri di
   * memori, jadi kalau langsung menimpa, penjualan yang baru dicatat di
   * salinan lain akan hilang begitu saja.
   *
   * Penggabungan memakai aturan gabungan-berdasarkan-id: catatan yang ada
   * di penyimpanan tapi tidak ada di memori akan ditambahkan kembali.
   * Untuk buku penjualan, kelebihan satu catatan jauh lebih ringan
   * akibatnya daripada kehilangan penjualan sungguhan.
   */
  function mergeById(mine, theirs, buangan) {
    if (!Array.isArray(mine) || !Array.isArray(theirs)) return 0;
    const known = new Set(mine.map(x => x && x.id));
    let added = 0;
    theirs.forEach(x => {
      if (!x || !x.id || known.has(x.id)) return;
      // Catatan yang sudah sengaja dihapus jangan ditarik kembali.
      if (buangan && buangan.has(x.id)) return;
      mine.push(x);
      added++;
    });
    return added;
  }

  /* ---------- Penanda perubahan (dipakai untuk sinkronisasi) ---------- */

  /**
   * Tiap catatan membawa waktu perubahan terakhirnya. Nanti dipakai untuk
   * menentukan versi mana yang lebih baru kalau satu catatan diubah dari
   * dua perangkat berbeda.
   */
  function stamp(rec) {
    if (!rec) return rec;
    rec.updatedAt = new Date().toISOString();
    markDirty(rec.id);
    return rec;
  }

  /**
   * Tandai satu catatan sebagai "belum terkirim ke server".
   *
   * Daftar ini dipakai sebagai antrean kirim, bukan perbandingan waktu.
   * Alasannya: jam di HP bisa saja salah. Kalau antrean kirim bergantung
   * pada jam, penjualan bisa terlewat tidak terkirim tanpa ketahuan.
   * Dengan daftar tegas seperti ini, sebuah catatan baru hilang dari
   * antrean setelah servernya benar-benar menerima.
   */
  function markDirty(id) {
    if (!id) return;
    if (!Array.isArray(state.meta.dirty)) state.meta.dirty = [];
    if (state.meta.dirty.indexOf(id) < 0) state.meta.dirty.push(id);
  }

  /** Apakah perangkat ini sudah dipakai mencatat, atau masih kosong? */
  function hasUserContent() {
    return !!(state.transactions.length || state.products.length ||
      state.preorders.length || state.stocks.length);
  }

  /**
   * Semua catatan ditandai belum terkirim — dipakai saat pertama kali login.
   *
   * `hanyaYangTersentuh` menutup satu lubang berbahaya. Tiap perangkat baru
   * otomatis punya 9 kategori pengeluaran bawaan dengan id yang SAMA PERSIS
   * seperti di perangkat lama. Kalau tablet yang masih kosong mendorong
   * kategori bawaannya, kategori yang sudah diubah namanya di HP akan
   * tertimpa — padahal tablet itu belum dipakai mencatat apa pun.
   *
   * Jadi: perangkat yang sudah berisi catatan mendorong semuanya (catatan
   * lama hasil migrasi memang belum punya updatedAt, dan tetap harus naik).
   * Perangkat yang masih kosong hanya mendorong yang benar-benar pernah
   * disentuh pengguna — yaitu yang sudah punya updatedAt.
   */
  function markAllDirty(hanyaYangTersentuh) {
    state.meta.dirty = [];
    SYNCED_KEYS.forEach(key => {
      state[key].forEach(x => {
        if (!x || !x.id) return;
        if (hanyaYangTersentuh && !x.updatedAt) return;
        state.meta.dirty.push(x.id);
      });
    });
    state.deletions.forEach(d => markDirty(d.id));
    return state.meta.dirty.length;
  }

  /** Dipanggil setelah server benar-benar menerima catatan-catatan ini */
  function clearDirty(ids) {
    if (!ids || !ids.length) return;
    const selesai = new Set(ids);
    state.meta.dirty = (state.meta.dirty || []).filter(id => !selesai.has(id));
  }

  function dirtyIds() {
    return (state.meta.dirty || []).slice();
  }

  /**
   * Catat bahwa sebuah id dihapus.
   *
   * Tanpa ini, menghapus transaksi di HP tidak ada gunanya: begitu tablet
   * ikut sinkron, transaksi yang sama akan dikirim balik dan muncul lagi.
   * Yang disimpan hanya id dan waktunya — sangat kecil.
   */
  function markDeleted(id) {
    if (!id) return;
    const at = new Date().toISOString();
    const found = state.deletions.find(d => d.id === id);
    if (found) found.at = at;
    else state.deletions.push({ id: id, at: at });
    markDirty(id);   // penghapusan juga harus sampai ke perangkat lain
  }

  /** Batalkan penanda hapus — dipakai tombol "Batalkan" setelah menghapus */
  function unmarkDeleted(id) {
    const i = state.deletions.findIndex(d => d.id === id);
    if (i >= 0) state.deletions.splice(i, 1);
  }

  function deletedIds() {
    return new Set(state.deletions.map(d => d.id));
  }

  function mergeExternalChanges() {
    let raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return 0; }
    if (!raw) return 0;
    let other;
    try { other = JSON.parse(raw); } catch (e) { return 0; }
    const otherAt = other && other.meta && other.meta.updatedAt;
    // Hanya digabung bila penyimpanan memang lebih baru daripada yang
    // terakhir kita baca/tulis sendiri.
    if (!otherAt || (lastSeenAt && otherAt <= lastSeenAt)) return 0;

    // Daftar penghapusan digabung lebih dulu, supaya catatan yang dihapus
    // di jendela lain tidak ikut ditarik masuk pada langkah berikutnya.
    mergeById(state.deletions, other.deletions);
    const buangan = deletedIds();

    const added = mergeById(state.transactions, other.transactions, buangan) +
      mergeById(state.preorders, other.preorders, buangan) +
      mergeById(state.stocks, other.stocks, buangan) +
      mergeById(state.products, other.products, buangan) +
      mergeById(state.expenseCategories, other.expenseCategories, buangan);

    // Catatan yang dihapus di jendela lain ikut dibuang dari salinan ini.
    dropDeletedLocally(buangan);

    lastSeenAt = otherAt;
    return added;
  }

  /** Buang catatan yang idnya sudah masuk daftar penghapusan */
  function dropDeletedLocally(buangan) {
    if (!buangan || !buangan.size) return 0;
    let hilang = 0;
    ['transactions', 'preorders', 'stocks', 'products', 'expenseCategories'].forEach(key => {
      for (let i = state[key].length - 1; i >= 0; i--) {
        // Kategori pengeluaran terakhir tidak boleh ikut hilang — tanpa
        // satu pun kategori, pencatatan pengeluaran jadi tidak bisa dipakai.
        if (key === 'expenseCategories' && state[key].length <= 1) break;
        if (buangan.has(state[key][i].id)) { state[key].splice(i, 1); hilang++; }
      }
    });
    return hilang;
  }

  /**
   * Tulis ke penyimpanan lalu PASTIKAN benar-benar tersimpan.
   * Mengembalikan true hanya kalau datanya terbukti sudah ada di
   * penyimpanan — supaya aplikasi tidak pernah bilang "tersimpan"
   * untuk sesuatu yang sebenarnya gagal.
   */
  function persist() {
    try {
      mergeExternalChanges();
      state.meta.updatedAt = new Date().toISOString();
      const payload = JSON.stringify(state);
      localStorage.setItem(KEY, payload);

      // Baca ulang: pada beberapa peramban ponsel, penulisan bisa gagal
      // atau dibuang tanpa melempar galat apa pun.
      if (localStorage.getItem(KEY) !== payload) {
        throw new Error('Data tidak ditemukan lagi setelah disimpan');
      }
      lastSeenAt = state.meta.updatedAt;
      storageOK = true;
      return true;
    } catch (e) {
      storageOK = false;
      console.error('Gagal menyimpan data:', e);
      if (global.UI && global.UI.toast) {
        global.UI.toast('PENTING: catatan gagal disimpan di perangkat ini. Jangan tutup aplikasi — buka Pengaturan lalu Simpan Cadangan sekarang.', 'error', 15000);
      }
      return false;
    }
  }

  /**
   * Menyimpan langsung, tanpa ditunda.
   *
   * Sebelumnya penulisan ditunda 120 milidetik. Di ponsel, penundaan itu
   * bisa tidak pernah dijalankan bila layar dikunci, aplikasi berpindah,
   * atau tab dibuang peramban karena memori menipis — sehingga penjualan
   * yang sudah dikonfirmasi ke layar tidak pernah sampai ke penyimpanan.
   */
  function commit(silent) {
    const ok = persist();
    if (!silent) emit();
    return ok;
  }

  /** Pastikan sebuah catatan benar-benar ada di penyimpanan */
  function isStored(id) {
    if (!id) return false;
    try {
      const raw = localStorage.getItem(KEY);
      return !!raw && raw.indexOf('"' + id + '"') >= 0;
    } catch (e) { return false; }
  }

  /** Dipanggil saat tab lain mengubah data, agar tampilan ikut menyusul */
  function reloadFromStorage() {
    const added = mergeExternalChanges();
    if (added) emit();
    return added;
  }

  function emit() {
    listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function get() { return state; }
  function isStorageOK() { return storageOK; }

  /**
   * Masukkan catatan yang datang dari server ke salinan lokal.
   *
   * Aturannya:
   * - Catatan yang sudah ditandai dihapus di sini TIDAK ditarik masuk.
   * - Catatan baru langsung ditambahkan.
   * - Catatan yang sudah ada hanya ditimpa kalau versi dari server memang
   *   LEBIH BARU. Kalau versi di sini yang lebih baru, punya kita menang
   *   dan tetap masuk antrean kirim.
   * - Yang masuk dari server tidak ditandai perlu dikirim balik.
   *
   * Mengembalikan ringkasan apa saja yang berubah, untuk ditampilkan
   * dan untuk menentukan apakah layar perlu digambar ulang.
   */
  function applyRemote(masuk, hapusan) {
    const hasil = { baru: 0, diperbarui: 0, dilewati: 0, dihapus: 0 };

    // Penghapusan dari server diproses lebih dulu, supaya catatan yang
    // sudah dibuang di perangkat lain tidak sempat masuk lagi di bawah.
    (hapusan || []).forEach(d => {
      if (!d || !d.id) return;
      const sudahAda = state.deletions.find(x => x.id === d.id);
      if (!sudahAda) state.deletions.push({ id: d.id, at: d.at || new Date().toISOString() });
    });
    const buangan = deletedIds();
    hasil.dihapus = dropDeletedLocally(buangan);

    const perKey = {};
    SYNCED_KEYS.forEach(key => {
      perKey[key] = new Map(state[key].map(x => [x.id, x]));
    });

    (masuk || []).forEach(rec => {
      if (!rec || !rec.id || !rec.__key) return;
      const key = rec.__key;
      if (SYNCED_KEYS.indexOf(key) < 0) return;
      delete rec.__key;

      if (buangan.has(rec.id)) { hasil.dilewati++; return; }

      const punyaKita = perKey[key].get(rec.id);
      if (!punyaKita) {
        state[key].push(rec);
        perKey[key].set(rec.id, rec);
        hasil.baru++;
        return;
      }
      // Bandingkan umur. Tanpa updatedAt (catatan lama), anggap paling tua.
      const kita = punyaKita.updatedAt || '';
      const sana = rec.updatedAt || '';
      if (sana > kita) {
        Object.keys(punyaKita).forEach(k => { delete punyaKita[k]; });
        Object.assign(punyaKita, rec);
        hasil.diperbarui++;
      } else {
        hasil.dilewati++;
      }
    });

    return hasil;
  }

  /* ---------- Profil & pengaturan ---------- */

  function updateProfile(patch) {
    Object.assign(state.profile, patch);
    commit();
  }

  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    commit();
  }

  /* ---------- Produk / Menu ---------- */

  function productGroups() {
    const set = new Set(state.products.map(p => p.group).filter(Boolean));
    ['Makanan', 'Minuman', 'Tambahan'].forEach(g => set.add(g));
    return Array.from(set);
  }

  function addProduct(data) {
    const p = {
      id: U.uid('prd'),
      name: (data.name || 'Menu Baru').trim(),
      emoji: data.emoji || '🍽️',
      price: Math.max(0, Number(data.price) || 0),
      cost: Math.max(0, Number(data.cost) || 0),
      group: data.group || 'Makanan',
      active: data.active !== false,
      createdAt: new Date().toISOString()
    };
    stamp(p);
    state.products.push(p);
    commit();
    return p;
  }

  function updateProduct(id, patch) {
    const p = state.products.find(x => x.id === id);
    if (!p) return null;
    if (patch.name != null) p.name = String(patch.name).trim();
    if (patch.emoji != null) p.emoji = patch.emoji;
    if (patch.price != null) p.price = Math.max(0, Number(patch.price) || 0);
    if (patch.cost != null) p.cost = Math.max(0, Number(patch.cost) || 0);
    if (patch.group != null) p.group = patch.group;
    if (patch.active != null) p.active = !!patch.active;
    stamp(p);
    commit();
    return p;
  }

  function removeProduct(id) {
    const i = state.products.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.products.splice(i, 1);
    markDeleted(removed.id);
    commit();
    return removed;
  }

  function getProduct(id) {
    return state.products.find(x => x.id === id) || null;
  }

  /* ---------- Kategori pengeluaran ---------- */

  function addCategory(data) {
    const c = {
      id: U.uid('cat'),
      name: (data.name || 'Kategori Baru').trim(),
      emoji: data.emoji || '🧾',
      color: data.color || '#94a3b8',
      tip: data.tip || ''
    };
    stamp(c);
    state.expenseCategories.push(c);
    commit();
    return c;
  }

  function updateCategory(id, patch) {
    const c = state.expenseCategories.find(x => x.id === id);
    if (!c) return null;
    Object.assign(c, {
      name: patch.name != null ? String(patch.name).trim() : c.name,
      emoji: patch.emoji != null ? patch.emoji : c.emoji,
      color: patch.color != null ? patch.color : c.color
    });
    stamp(c);
    commit();
    return c;
  }

  function removeCategory(id) {
    if (state.expenseCategories.length <= 1) return null;
    const i = state.expenseCategories.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.expenseCategories.splice(i, 1);
    // Pindahkan transaksi lama ke kategori "Lain-lain" bila ada, atau kategori pertama.
    const fallback = state.expenseCategories.find(c => c.id === 'cat_lain') || state.expenseCategories[0];
    state.transactions.forEach(t => {
      if (t.type === 'expense' && t.categoryId === id) { t.categoryId = fallback.id; stamp(t); }
    });
    markDeleted(removed.id);
    commit();
    return removed;
  }

  function getCategory(id) {
    return state.expenseCategories.find(x => x.id === id) ||
      { id: id, name: 'Tanpa Kategori', emoji: '❓', color: '#94a3b8' };
  }

  /* ---------- Transaksi ---------- */

  function normalizeItems(list) {
    return (list || []).map(it => ({
      productId: it.productId || null,
      name: it.name || 'Item',
      emoji: it.emoji || '🍽️',
      qty: Math.max(1, Number(it.qty) || 1),
      price: Math.max(0, Number(it.price) || 0),
      cost: Math.max(0, Number(it.cost) || 0),
      note: (it.note || '').trim()
    }));
  }

  /**
   * Satu pemasukan = satu pesanan dari satu pelanggan.
   * items: [{ productId, name, emoji, qty, price, cost, note }]
   * Boleh berisi beberapa varian sekaligus; totalnya dijumlahkan.
   */
  function addIncome(data) {
    const items = normalizeItems(data.items);
    const subtotal = U.sum(items, it => it.qty * it.price);
    const discount = Math.max(0, Math.min(subtotal, Number(data.discount) || 0));
    const total = data.total != null && !items.length
      ? Math.max(0, Number(data.total) || 0)
      : subtotal - discount;

    // Kembalian hanya bermakna kalau uang tunai yang diberikan tercatat
    // dan nilainya menutup total belanja.
    const cashGiven = Math.max(0, Number(data.cashGiven) || 0);
    const change = cashGiven > 0 ? Math.max(0, cashGiven - total) : 0;

    const t = {
      id: U.uid('trx'),
      type: 'income',
      date: data.date || U.today(),
      time: data.time || U.nowTime(),
      customerName: (data.customerName || '').trim(),
      items: items,
      subtotal: items.length ? subtotal : total,
      discount: items.length ? discount : 0,
      total: total,
      hpp: U.sum(items, it => it.qty * it.cost),
      method: data.method || 'tunai',
      cashGiven: cashGiven,
      change: change,
      note: (data.note || '').trim(),
      createdAt: new Date().toISOString()
    };
    stamp(t);
    state.transactions.push(t);
    commit();
    return t;
  }

  function addExpense(data) {
    const t = {
      id: U.uid('trx'),
      type: 'expense',
      date: data.date || U.today(),
      time: data.time || U.nowTime(),
      categoryId: data.categoryId || (state.expenseCategories[0] && state.expenseCategories[0].id),
      total: Math.max(0, Number(data.total) || 0),
      method: data.method || 'tunai',
      note: (data.note || '').trim(),
      createdAt: new Date().toISOString()
    };
    stamp(t);
    state.transactions.push(t);
    commit();
    return t;
  }

  function updateTransaction(id, patch) {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return null;
    if (patch.date != null) t.date = patch.date;
    if (patch.time != null) t.time = patch.time;
    if (patch.note != null) t.note = String(patch.note).trim();
    if (patch.method != null) t.method = patch.method;
    if (t.type === 'expense') {
      if (patch.categoryId != null) t.categoryId = patch.categoryId;
      if (patch.total != null) t.total = Math.max(0, Number(patch.total) || 0);
    } else {
      if (patch.customerName != null) t.customerName = String(patch.customerName).trim();
      if (patch.items) {
        t.items = normalizeItems(patch.items);
        t.subtotal = U.sum(t.items, it => it.qty * it.price);
        t.hpp = U.sum(t.items, it => it.qty * it.cost);
      }
      if (patch.discount != null) {
        t.discount = Math.max(0, Math.min(t.subtotal || 0, Number(patch.discount) || 0));
      }
      if (t.items && t.items.length) {
        t.total = Math.max(0, (t.subtotal || 0) - (t.discount || 0));
      } else if (patch.total != null) {
        t.total = Math.max(0, Number(patch.total) || 0);
        t.subtotal = t.total;
      }
      if (patch.cashGiven != null) t.cashGiven = Math.max(0, Number(patch.cashGiven) || 0);
      // Kembalian selalu dihitung ulang, karena total atau uang yang
      // diberikan bisa saja berubah saat transaksi diperbaiki.
      t.change = (t.cashGiven || 0) > 0 ? Math.max(0, t.cashGiven - t.total) : 0;
    }
    stamp(t);
    commit();
    return t;
  }

  function removeTransaction(id) {
    const i = state.transactions.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.transactions.splice(i, 1);
    markDeleted(removed.id);
    commit();
    return { item: removed, index: i };
  }

  /** Kembalikan transaksi yang baru dihapus (fitur "Batalkan") */
  function restoreTransaction(item, index) {
    if (!item) return;
    const at = typeof index === 'number' ? U.clamp(index, 0, state.transactions.length) : state.transactions.length;
    unmarkDeleted(item.id);
    stamp(item);
    state.transactions.splice(at, 0, item);
    commit();
  }

  function getTransaction(id) {
    return state.transactions.find(x => x.id === id) || null;
  }

  /**
   * Hapus beberapa transaksi sekaligus.
   *
   * Sengaja satu penulisan untuk semuanya, bukan sekali per catatan.
   * Menghapus 100 catatan dengan 100 kali tulis-dan-verifikasi akan
   * membuat aplikasi terasa menggantung di HP.
   *
   * Mengembalikan daftar {item, index} untuk tombol "Batalkan".
   */
  function removeTransactions(ids) {
    const cari = new Set(ids || []);
    if (!cari.size) return [];
    const dibuang = [];
    for (let i = state.transactions.length - 1; i >= 0; i--) {
      const t = state.transactions[i];
      if (!cari.has(t.id)) continue;
      state.transactions.splice(i, 1);
      markDeleted(t.id);
      dibuang.push({ item: t, index: i });
    }
    commit();
    return dibuang.reverse();   // urut dari indeks terkecil, agar mudah dikembalikan
  }

  /** Kembalikan sekaligus apa yang baru dihapus borongan */
  function restoreTransactions(dibuang) {
    if (!dibuang || !dibuang.length) return 0;
    dibuang.forEach(x => {
      if (!x || !x.item) return;
      unmarkDeleted(x.item.id);
      stamp(x.item);
      const at = typeof x.index === 'number'
        ? U.clamp(x.index, 0, state.transactions.length) : state.transactions.length;
      state.transactions.splice(at, 0, x.item);
    });
    commit();
    return dibuang.length;
  }

  /* ---------- Pre-order ---------- */

  /**
   * Pre-order = pesanan yang dibuat sekarang untuk diselesaikan pada
   * tanggal lain.
   *
   * Penting: pre-order TIDAK dihitung sebagai pemasukan selama belum
   * diselesaikan. Uangnya memang belum diterima, jadi kalau ikut dihitung,
   * laporan laba dan saldo kas jadi salah. Nilainya baru masuk ke
   * transaksi ketika ditandai selesai.
   */
  function addPreorder(data) {
    const items = normalizeItems(data.items);
    const po = {
      id: U.uid('pre'),
      customerName: (data.customerName || '').trim(),
      phone: (data.phone || '').trim(),
      items: items,
      total: U.sum(items, it => it.qty * it.price),
      hpp: U.sum(items, it => it.qty * it.cost),
      dueDate: data.dueDate || U.addDays(U.today(), 1),
      dueTime: data.dueTime || '',
      note: (data.note || '').trim(),
      status: 'menunggu',          // menunggu | selesai | batal
      createdAt: new Date().toISOString(),
      completedAt: null,
      transactionId: null          // diisi saat pre-order diselesaikan
    };
    stamp(po);
    state.preorders.push(po);
    commit();
    return po;
  }

  function updatePreorder(id, patch) {
    const po = state.preorders.find(x => x.id === id);
    if (!po) return null;
    if (patch.customerName != null) po.customerName = String(patch.customerName).trim();
    if (patch.phone != null) po.phone = String(patch.phone).trim();
    if (patch.dueDate != null) po.dueDate = patch.dueDate;
    if (patch.dueTime != null) po.dueTime = patch.dueTime;
    if (patch.note != null) po.note = String(patch.note).trim();
    if (patch.status != null) po.status = patch.status;
    if (patch.items) {
      po.items = normalizeItems(patch.items);
      po.total = U.sum(po.items, it => it.qty * it.price);
      po.hpp = U.sum(po.items, it => it.qty * it.cost);
    }
    stamp(po);
    commit();
    return po;
  }

  function removePreorder(id) {
    const i = state.preorders.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.preorders.splice(i, 1);
    markDeleted(removed.id);
    commit();
    return { item: removed, index: i };
  }

  function restorePreorder(item, index) {
    if (!item) return;
    const at = typeof index === 'number' ? U.clamp(index, 0, state.preorders.length) : state.preorders.length;
    unmarkDeleted(item.id);
    stamp(item);
    state.preorders.splice(at, 0, item);
    commit();
  }

  function getPreorder(id) {
    return state.preorders.find(x => x.id === id) || null;
  }

  /**
   * Tandai pre-order selesai: barangnya diserahkan dan uangnya diterima.
   * Barulah pada titik ini nilainya dicatat sebagai pemasukan.
   */
  function completePreorder(id, payment) {
    const po = getPreorder(id);
    if (!po || po.status === 'selesai') return null;
    const pay = payment || {};
    const trx = addIncome({
      items: po.items,
      customerName: po.customerName,
      date: pay.date || U.today(),
      time: pay.time || U.nowTime(),
      method: pay.method || 'tunai',
      cashGiven: pay.cashGiven || 0,
      note: ('Pre-order' + (po.note ? ' — ' + po.note : '')).trim()
    });
    po.status = 'selesai';
    po.completedAt = new Date().toISOString();
    po.transactionId = trx.id;
    stamp(po);
    commit();
    return trx;
  }

  /** Batalkan penyelesaian: transaksi terkait ikut dihapus agar tidak dobel */
  function reopenPreorder(id) {
    const po = getPreorder(id);
    if (!po) return null;
    if (po.transactionId) removeTransaction(po.transactionId);
    po.status = 'menunggu';
    po.completedAt = null;
    po.transactionId = null;
    stamp(po);
    commit();
    return po;
  }

  /** Pre-order yang belum selesai, diurutkan dari tenggat terdekat */
  function pendingPreorders() {
    return state.preorders
      .filter(p => p.status === 'menunggu')
      .sort((a, b) => (a.dueDate + (a.dueTime || '')).localeCompare(b.dueDate + (b.dueTime || '')));
  }

  /** Ringkasan untuk lencana dan kartu di Beranda */
  function preorderSummary() {
    const t = U.today();
    const pending = pendingPreorders();
    const late = pending.filter(p => p.dueDate < t);
    const today = pending.filter(p => p.dueDate === t);
    const tomorrow = pending.filter(p => p.dueDate === U.addDays(t, 1));
    return {
      pending, late, today, tomorrow,
      pendingCount: pending.length,
      lateCount: late.length,
      todayCount: today.length,
      tomorrowCount: tomorrow.length,
      pendingValue: U.sum(pending, p => p.total),
      pendingItems: U.sum(pending, p => U.sum(p.items || [], it => it.qty))
    };
  }

  /**
   * Rekap berapa porsi tiap menu yang harus disiapkan untuk suatu
   * tanggal — inilah yang dipakai saat menyiapkan bahan.
   */
  function productionPlan(date) {
    const map = new Map();
    pendingPreorders()
      .filter(p => (date ? p.dueDate === date : true))
      .forEach(p => {
        (p.items || []).forEach(it => {
          const key = it.productId || ('nm:' + it.name);
          if (!map.has(key)) map.set(key, { name: it.name, emoji: it.emoji, qty: 0, total: 0 });
          const row = map.get(key);
          row.qty += it.qty;
          row.total += it.qty * it.price;
        });
      });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }

  /* ---------- Stok harian per varian ---------- */

  /**
   * Stok dicatat sebagai daftar penambahan, bukan satu angka tunggal.
   * Sekali goreng 50 pcs -> satu catatan 50. Nambah 20 lagi -> catatan
   * baru 20. Jumlah yang dibuat hari itu = penjumlahan semua catatan.
   *
   * Cara ini dipilih supaya riwayat penambahan tetap kelihatan dan
   * koreksi cukup dicatat sebagai angka negatif — tidak ada angka yang
   * ditimpa diam-diam.
   */
  function stockEntries(date, productId) {
    return state.stocks
      .filter(s => (!date || s.date === date) && (!productId || s.productId === productId))
      .sort((a, b) => ((a.createdAt || '') < (b.createdAt || '') ? -1 : 1));
  }

  /** Total yang dibuat untuk satu menu pada satu tanggal */
  function stockMade(productId, date) {
    const d = date || U.today();
    return U.sum(state.stocks.filter(s => s.productId === productId && s.date === d), s => s.qty);
  }

  /** Sudah pernah diatur atau belum — beda arti dengan "dibuat = 0" */
  function hasStockRecord(productId, date) {
    const d = date || U.today();
    return state.stocks.some(s => s.productId === productId && s.date === d);
  }

  function addStockEntry(data) {
    const qty = Math.round(Number(data.qty) || 0);
    // qty 0 tetap diterima: itulah cara menandai "hari ini menu ini
    // sengaja tidak dibuat", yang berbeda artinya dari "belum diisi".
    if (!data.productId) return null;
    const s = {
      id: U.uid('stk'),
      productId: data.productId,
      date: data.date || U.today(),
      qty: qty,                       // boleh negatif untuk koreksi
      note: (data.note || '').trim(),
      createdAt: new Date().toISOString()
    };
    stamp(s);
    state.stocks.push(s);
    commit();
    return s;
  }

  /**
   * Setel jumlah yang dibuat menjadi angka tertentu. Yang disimpan tetap
   * selisihnya, jadi catatan penambahan sebelumnya tidak hilang.
   */
  function setStockMade(productId, date, total, note) {
    const d = date || U.today();
    const target = Math.max(0, Math.round(Number(total) || 0));
    const delta = target - stockMade(productId, d);
    // Tidak ada perubahan pada menu yang memang sudah diatur: jangan
    // tambah catatan kosong. Tapi menetapkan 0 pada menu yang belum
    // pernah diatur tetap dicatat, supaya statusnya jelas.
    if (!delta && hasStockRecord(productId, d)) return null;
    return addStockEntry({ productId: productId, date: d, qty: delta, note: note });
  }

  function removeStockEntry(id) {
    const i = state.stocks.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.stocks.splice(i, 1);
    markDeleted(removed.id);
    commit();
    return { item: removed, index: i };
  }

  function restoreStockEntry(item, index) {
    if (!item) return;
    const at = typeof index === 'number' ? U.clamp(index, 0, state.stocks.length) : state.stocks.length;
    unmarkDeleted(item.id);
    stamp(item);
    state.stocks.splice(at, 0, item);
    commit();
  }

  /**
   * Gambaran stok satu hari untuk tiap varian:
   *   dibuat  = total yang disiapkan hari itu
   *   terjual = yang sudah laku (transaksi pemasukan tanggal itu)
   *   dikeep  = disisihkan untuk pre-order yang jatuh tempo tanggal itu
   *   sisa    = dibuat - terjual - dikeep, yaitu yang masih boleh dijual
   *
   * "diatur" dibedakan dari "dibuat = 0" supaya tampilan bisa bilang
   * "belum diatur" alih-alih memajang angka nol yang menyesatkan.
   */
  function stockOverview(date) {
    const d = date || U.today();
    const rows = new Map();
    const byName = new Map();

    state.products.forEach(p => {
      rows.set(p.id, {
        productId: p.id,
        name: p.name,
        emoji: p.emoji,
        group: p.group || '',
        price: p.price || 0,
        active: p.active !== false,
        hilang: false,
        dibuat: 0, terjual: 0, dikeep: 0, sisa: 0, diatur: false
      });
      byName.set(String(p.name || '').trim().toLowerCase(), p.id);
    });

    // Item lama bisa saja tidak punya productId, atau menunya sudah
    // dihapus. Angkanya tetap harus kelihatan, bukan hilang diam-diam.
    function rowFor(item) {
      let id = item.productId;
      if (!id || !rows.has(id)) id = byName.get(String(item.name || '').trim().toLowerCase()) || null;
      if (id && rows.has(id)) return rows.get(id);
      const key = 'nm:' + String(item.name || 'Item').trim().toLowerCase();
      if (!rows.has(key)) {
        rows.set(key, {
          productId: null,
          name: item.name || 'Item',
          emoji: item.emoji || '🍽️',
          group: '',
          price: item.price || 0,
          active: false,
          hilang: true,
          dibuat: 0, terjual: 0, dikeep: 0, sisa: 0, diatur: false
        });
      }
      return rows.get(key);
    }

    state.stocks.forEach(s => {
      if (s.date !== d) return;
      const row = rows.get(s.productId);
      if (!row) return;                 // menunya sudah dihapus
      row.dibuat += s.qty;
      row.diatur = true;
    });

    state.transactions.forEach(t => {
      if (t.type !== 'income' || t.date !== d) return;
      (t.items || []).forEach(it => { rowFor(it).terjual += it.qty; });
    });

    state.preorders.forEach(p => {
      if (p.status !== 'menunggu' || p.dueDate !== d) return;
      (p.items || []).forEach(it => { rowFor(it).dikeep += it.qty; });
    });

    return Array.from(rows.values())
      .map(r => {
        r.sisa = r.dibuat - r.terjual - r.dikeep;
        // Perkiraan uang yang masih bisa didapat kalau sisanya habis terjual.
        // Sisa minus tidak bisa menghasilkan uang, jadi dihitung nol.
        r.nilaiSisa = Math.max(0, r.sisa) * (r.price || 0);
        return r;
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.group !== b.group) return String(a.group).localeCompare(String(b.group));
        return String(a.name).localeCompare(String(b.name));
      });
  }

  /** Ringkasan stok untuk kartu Beranda dan lencana */
  function stockSummary(date) {
    const d = date || U.today();
    const rows = stockOverview(d).filter(r => r.active || r.diatur || r.terjual || r.dikeep);
    const diatur = rows.filter(r => r.diatur);
    return {
      date: d,
      rows: rows,
      diatur: diatur,
      diaturCount: diatur.length,
      dibuat: U.sum(rows, r => r.dibuat),
      terjual: U.sum(rows, r => r.terjual),
      dikeep: U.sum(rows, r => r.dikeep),
      // Sisa hanya dijumlahkan dari menu yang stoknya memang diatur,
      // supaya penjualan menu tanpa catatan stok tidak bikin angka minus.
      sisa: U.sum(diatur, r => r.sisa),
      // Perkiraan pemasukan kalau seluruh sisa habis terjual. Ini memakai
      // harga jual saat ini dan belum memperhitungkan diskon, jadi angkanya
      // perkiraan — bukan uang yang sudah di tangan.
      nilaiSisa: U.sum(diatur, r => r.nilaiSisa),
      habis: diatur.filter(r => r.sisa <= 0).length,
      menipis: diatur.filter(r => r.sisa > 0 && r.sisa <= LOW_STOCK).length
    };
  }

  /* ---------- Query & ringkasan ---------- */

  function inRange(from, to) {
    return state.transactions.filter(t => t.date >= from && t.date <= to);
  }

  function sortedDesc(list) {
    return list.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const at = a.time || '00:00', bt = b.time || '00:00';
      if (at !== bt) return at < bt ? 1 : -1;
      return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1;
    });
  }

  /** Ringkasan periode: pendapatan, pengeluaran, laba, hpp, transaksi */
  function summary(from, to) {
    const list = inRange(from, to);
    const incomes = list.filter(t => t.type === 'income');
    const expenses = list.filter(t => t.type === 'expense');
    const income = U.sum(incomes, t => t.total);
    const expense = U.sum(expenses, t => t.total);
    const hpp = U.sum(incomes, t => t.hpp || 0);
    const itemsSold = U.sum(incomes, t => U.sum(t.items || [], it => it.qty));
    return {
      from, to,
      income, expense,
      profit: income - expense,
      hpp,
      grossProfit: income - hpp,
      margin: income ? ((income - expense) / income) * 100 : 0,
      orderCount: incomes.length,
      // Satu pesanan = satu pelanggan yang membeli.
      customerCount: incomes.length,
      namedCustomers: new Set(incomes.map(t => (t.customerName || '').trim().toLowerCase())
        .filter(Boolean)).size,
      expenseCount: expenses.length,
      itemsSold,
      avgOrder: incomes.length ? income / incomes.length : 0,
      transactions: list
    };
  }

  /**
   * Catatan pelanggan per hari: berapa orang yang membeli dan apa saja
   * yang mereka beli. Dipakai halaman Pelanggan dan rekap harian.
   */
  function customersByDay(from, to) {
    const byDate = U.groupBy(inRange(from, to).filter(t => t.type === 'income'), t => t.date);
    return Array.from(byDate.keys()).sort().reverse().map(date => {
      const orders = sortedDesc(byDate.get(date));
      return {
        date,
        orders,
        customerCount: orders.length,
        itemsSold: U.sum(orders, t => U.sum(t.items || [], it => it.qty)),
        total: U.sum(orders, t => t.total),
        avg: orders.length ? U.sum(orders, t => t.total) / orders.length : 0
      };
    });
  }

  /** Saldo kas estimasi = modal awal + seluruh pemasukan - seluruh pengeluaran */
  function cashBalance() {
    const income = U.sum(state.transactions.filter(t => t.type === 'income'), t => t.total);
    const expense = U.sum(state.transactions.filter(t => t.type === 'expense'), t => t.total);
    return (Number(state.profile.startingCash) || 0) + income - expense;
  }

  /**
   * Saldo dipisah menurut cara pembayaran.
   *
   * Uang QRIS, transfer, dan ojol TIDAK ada di laci — uangnya di rekening,
   * atau masih ditahan aplikasi ojol dan baru cair belakangan. Menjumlahkan
   * semuanya jadi satu angka membuat "Saldo Kas" tidak akan pernah cocok
   * saat uang di laci benar-benar dihitung.
   *
   * Modal awal dianggap uang tunai, karena memang uang yang sudah ada di
   * laci sebelum mulai mencatat.
   *
   * Jumlah seluruh saldo di sini selalu sama dengan cashBalance().
   */
  function balanceByMethod() {
    const peta = new Map();
    const ambil = id => {
      const m = PAYMENT_METHODS.find(x => x.id === id) || PAYMENT_METHODS[0];
      if (!peta.has(m.id)) {
        peta.set(m.id, {
          id: m.id, name: m.name, emoji: m.emoji, icon: m.icon,
          modalAwal: 0, masuk: 0, keluar: 0, saldo: 0, jumlahTransaksi: 0
        });
      }
      return peta.get(m.id);
    };
    // Semua cara bayar selalu ditampilkan, dengan urutan tetap.
    PAYMENT_METHODS.forEach(m => ambil(m.id));

    ambil('tunai').modalAwal = Number(state.profile.startingCash) || 0;

    state.transactions.forEach(t => {
      const row = ambil(t.method);
      row.jumlahTransaksi += 1;
      if (t.type === 'income') row.masuk += t.total;
      else row.keluar += t.total;
    });

    return Array.from(peta.values()).map(r => {
      r.saldo = r.modalAwal + r.masuk - r.keluar;
      return r;
    });
  }

  /** Saldo untuk satu cara bayar saja */
  function balanceOfMethod(id) {
    const row = balanceByMethod().find(r => r.id === (id || 'tunai'));
    return row ? row.saldo : 0;
  }

  /** Deret harian untuk grafik */
  function dailySeries(from, to) {
    const byDate = U.groupBy(inRange(from, to), t => t.date);
    return U.dateRangeList(from, to).map(date => {
      const list = byDate.get(date) || [];
      const income = U.sum(list.filter(t => t.type === 'income'), t => t.total);
      const expense = U.sum(list.filter(t => t.type === 'expense'), t => t.total);
      return { date, income, expense, profit: income - expense, count: list.length };
    });
  }

  /** Peringkat menu terlaris dalam periode */
  function topProducts(from, to, limit) {
    const map = new Map();
    inRange(from, to).filter(t => t.type === 'income').forEach(t => {
      (t.items || []).forEach(it => {
        const key = it.productId || ('nm:' + it.name);
        if (!map.has(key)) {
          map.set(key, { key, name: it.name, emoji: it.emoji, qty: 0, revenue: 0, cost: 0 });
        }
        const row = map.get(key);
        row.qty += it.qty;
        row.revenue += it.qty * it.price;
        row.cost += it.qty * it.cost;
      });
    });
    const rows = Array.from(map.values()).map(r => Object.assign(r, { profit: r.revenue - r.cost }));
    rows.sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
    return limit ? rows.slice(0, limit) : rows;
  }

  /** Rincian pengeluaran per kategori */
  function expenseByCategory(from, to) {
    const map = new Map();
    inRange(from, to).filter(t => t.type === 'expense').forEach(t => {
      const c = getCategory(t.categoryId);
      if (!map.has(c.id)) map.set(c.id, { id: c.id, name: c.name, emoji: c.emoji, color: c.color, total: 0, count: 0 });
      const row = map.get(c.id);
      row.total += t.total;
      row.count += 1;
    });
    const rows = Array.from(map.values());
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }

  /** Rincian pemasukan per metode pembayaran */
  function incomeByMethod(from, to) {
    const map = new Map();
    inRange(from, to).filter(t => t.type === 'income').forEach(t => {
      const m = PAYMENT_METHODS.find(x => x.id === t.method) || { id: t.method, name: t.method, emoji: '💰' };
      if (!map.has(m.id)) map.set(m.id, { id: m.id, name: m.name, emoji: m.emoji, total: 0, count: 0 });
      const row = map.get(m.id);
      row.total += t.total;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  /** Tanggal transaksi paling awal (untuk batas filter) */
  function firstDate() {
    if (!state.transactions.length) return U.today();
    return state.transactions.reduce((min, t) => (t.date < min ? t.date : min), state.transactions[0].date);
  }

  /* ---------- Data contoh / reset / backup ---------- */

  function seedProducts() {
    SAMPLE_PRODUCTS.forEach(p => {
      if (!state.products.some(x => x.name.toLowerCase() === p.name.toLowerCase())) {
        state.products.push(stamp({
          id: U.uid('prd'),
          name: p.name, emoji: p.emoji, price: p.price, cost: p.cost,
          group: p.group, active: true, createdAt: new Date().toISOString()
        }));
      }
    });
    commit();
  }

  /** Buat riwayat contoh 21 hari agar grafik & laporan langsung terasa hidup */
  function seedDemoTransactions(days) {
    if (!state.products.length) seedProducts();
    const n = days || 21;
    const products = state.products.filter(p => p.active);
    const methods = ['tunai', 'tunai', 'tunai', 'qris', 'qris', 'ojol', 'transfer'];
    let seed = 20260804;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let d = n - 1; d >= 0; d--) {
      const date = U.addDays(U.today(), -d);
      const dow = U.fromISODate(date).getDay();
      const weekend = dow === 0 || dow === 6;
      const orders = Math.round((weekend ? 14 : 9) + rnd() * 8);

      for (let o = 0; o < orders; o++) {
        const itemCount = 1 + Math.floor(rnd() * 3);
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          const p = products[Math.floor(rnd() * products.length)];
          if (!p) continue;
          const existing = items.find(x => x.productId === p.id);
          if (existing) { existing.qty += 1; continue; }
          items.push({ productId: p.id, name: p.name, emoji: p.emoji, qty: 1 + Math.floor(rnd() * 2), price: p.price, cost: p.cost });
        }
        if (!items.length) continue;
        const hour = 8 + Math.floor(rnd() * 12);
        const minute = Math.floor(rnd() * 60);
        addIncomeSilent({
          items,
          date,
          time: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
          method: methods[Math.floor(rnd() * methods.length)],
          customerName: rnd() > 0.25 ? DEMO_NAMES[Math.floor(rnd() * DEMO_NAMES.length)] : ''
        });
      }

      // Belanja bahan tiap hari + biaya lain sesekali
      addExpenseSilent({
        date, time: '07:1' + Math.floor(rnd() * 9),
        categoryId: 'cat_bahan',
        total: Math.round((180000 + rnd() * 120000) / 500) * 500,
        note: 'Belanja pasar'
      });
      if (rnd() > 0.7) {
        addExpenseSilent({
          date, time: '10:30', categoryId: 'cat_gas',
          total: 22000, note: 'Isi gas 3kg'
        });
      }
      if (rnd() > 0.85) {
        addExpenseSilent({
          date, time: '16:00', categoryId: 'cat_kemasan',
          total: Math.round((35000 + rnd() * 40000) / 500) * 500, note: 'Kotak & plastik'
        });
      }
      if (dow === 1) {
        addExpenseSilent({ date, time: '09:00', categoryId: 'cat_gaji', total: 350000, note: 'Upah mingguan' });
      }
    }
    commit();
  }

  const DEMO_NAMES = [
    'Bu Ani', 'Pak Budi', 'Mbak Sari', 'Mas Dedi', 'Bu Rina', 'Pak Joko',
    'Dek Nisa', 'Bu Tuti', 'Pak Hendra', 'Mbak Lia', 'Bu Yanti', 'Mas Agus',
    'Pelanggan Ojol', 'Bu Dewi', 'Pak Rahmat'
  ];

  function addIncomeSilent(data) {
    const items = data.items.map(it => ({
      productId: it.productId, name: it.name, emoji: it.emoji,
      qty: it.qty, price: it.price, cost: it.cost, note: ''
    }));
    const subtotal = U.sum(items, it => it.qty * it.price);
    const method = data.method || 'tunai';
    // Pada pembayaran tunai, uang biasanya dibulatkan ke atas.
    const cashGiven = method === 'tunai' ? Math.ceil(subtotal / 5000) * 5000 : 0;
    state.transactions.push(stamp({
      id: U.uid('trx'), type: 'income', date: data.date, time: data.time,
      customerName: data.customerName || '',
      items, subtotal, discount: 0, total: subtotal,
      hpp: U.sum(items, it => it.qty * it.cost),
      method: method,
      cashGiven: cashGiven,
      change: cashGiven > 0 ? Math.max(0, cashGiven - subtotal) : 0,
      note: data.note || '',
      createdAt: new Date().toISOString(), demo: true
    }));
  }

  function addExpenseSilent(data) {
    state.transactions.push(stamp({
      id: U.uid('trx'), type: 'expense', date: data.date, time: data.time,
      categoryId: data.categoryId, total: data.total, method: 'tunai',
      note: data.note || '', createdAt: new Date().toISOString(), demo: true
    }));
  }

  function hasDemoData() {
    return state.transactions.some(t => t.demo);
  }

  // Penghapusan borongan wajib ikut dicatat satu per satu. Kalau tidak,
  // begitu perangkat lain menyusul sinkron, semua yang barusan dibuang
  // akan dikirim balik dan muncul lagi.

  function clearDemoData() {
    state.transactions.forEach(t => { if (t.demo) markDeleted(t.id); });
    state.transactions = state.transactions.filter(t => !t.demo);
    commit();
  }

  function resetAll() {
    // Penanda hapus dikumpulkan dulu, lalu dibawa ke keadaan baru, supaya
    // "mulai dari nol" juga berlaku di perangkat lain — bukan cuma di sini.
    const sebelumnya = [];
    ['transactions', 'preorders', 'stocks', 'products', 'expenseCategories'].forEach(key => {
      state[key].forEach(x => { if (x && x.id) sebelumnya.push(x.id); });
    });
    const at = new Date().toISOString();
    const lama = state.deletions.slice();

    state = defaultState();
    state.settings.onboarded = false;
    state.deletions = lama.concat(sebelumnya.map(id => ({ id: id, at: at })));
    commit();
  }

  function clearTransactions() {
    state.transactions.forEach(t => markDeleted(t.id));
    // Catatan stok ikut dibersihkan: tanpa transaksinya, angka
    // "dibuat 70, terjual 0" hanya akan membingungkan.
    state.stocks.forEach(s => markDeleted(s.id));
    state.transactions = [];
    state.stocks = [];
    commit();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
      throw new Error('Format file tidak dikenali.');
    }
    state = migrate(parsed);
    state.settings.onboarded = true;
    // Seluruh isi cadangan ditandai baru saja berubah. Memulihkan cadangan
    // artinya "yang ini yang benar", jadi harus menang atas versi lama yang
    // mungkin masih ada di server.
    ['transactions', 'preorders', 'stocks', 'products', 'expenseCategories']
      .forEach(key => state[key].forEach(stamp));
    commit();
    return state;
  }

  global.Store = {
    KEY, SCHEMA, LOW_STOCK, PAYMENT_METHODS, DEFAULT_EXPENSE_CATEGORIES,
    load, get, subscribe, commit, persist, isStorageOK, isStored, reloadFromStorage,
    updateProfile, updateSettings,
    productGroups, addProduct, updateProduct, removeProduct, getProduct,
    addCategory, updateCategory, removeCategory, getCategory,
    addIncome, addExpense, updateTransaction, removeTransaction, restoreTransaction, getTransaction,
    removeTransactions, restoreTransactions,
    addPreorder, updatePreorder, removePreorder, restorePreorder, getPreorder,
    completePreorder, reopenPreorder, pendingPreorders, preorderSummary, productionPlan,
    stockEntries, stockMade, hasStockRecord, addStockEntry, setStockMade,
    removeStockEntry, restoreStockEntry, stockOverview, stockSummary,
    stamp, markDeleted, unmarkDeleted, deletedIds, dropDeletedLocally,
    SYNCED_KEYS, markDirty, markAllDirty, clearDirty, dirtyIds, applyRemote, hasUserContent,
    inRange, sortedDesc, summary, cashBalance, balanceByMethod, balanceOfMethod,
    dailySeries, topProducts,
    expenseByCategory, incomeByMethod, firstDate, customersByDay,
    seedProducts, seedDemoTransactions, hasDemoData, clearDemoData,
    resetAll, clearTransactions, exportJSON, importJSON
  };
})(window);
