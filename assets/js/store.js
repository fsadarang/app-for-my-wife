/* =========================================================
   Store — sumber kebenaran data + penyimpanan lokal (localStorage)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils;
  const KEY = 'dapurku.data.v1';
  const SCHEMA = 1;

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
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    };
  }

  /* ---------- State & persistensi ---------- */

  let state = defaultState();
  const listeners = new Set();
  let saveTimer = null;
  let storageOK = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      state = migrate(parsed);
      return true;
    } catch (e) {
      console.warn('Gagal memuat data:', e);
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
    if (!Array.isArray(s.expenseCategories) || !s.expenseCategories.length) {
      s.expenseCategories = U.deepClone(DEFAULT_EXPENSE_CATEGORIES);
    }
    s.schema = SCHEMA;
    return s;
  }

  function persist() {
    try {
      state.meta.updatedAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(state));
      storageOK = true;
    } catch (e) {
      storageOK = false;
      console.error('Gagal menyimpan data:', e);
      if (global.UI && global.UI.toast) {
        global.UI.toast('Data gagal disimpan di perangkat ini. Coba backup manual lewat menu Pengaturan.', 'error', 6000);
      }
    }
  }

  function commit(silent) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 120);
    if (!silent) emit();
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
    commit();
    return p;
  }

  function removeProduct(id) {
    const i = state.products.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.products.splice(i, 1);
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
      if (t.type === 'expense' && t.categoryId === id) t.categoryId = fallback.id;
    });
    commit();
    return removed;
  }

  function getCategory(id) {
    return state.expenseCategories.find(x => x.id === id) ||
      { id: id, name: 'Tanpa Kategori', emoji: '❓', color: '#94a3b8' };
  }

  /* ---------- Transaksi ---------- */

  /**
   * Pemasukan.
   * items: [{ productId, name, emoji, qty, price, cost }]
   */
  function addIncome(data) {
    const items = (data.items || []).map(it => ({
      productId: it.productId || null,
      name: it.name || 'Item',
      emoji: it.emoji || '🍽️',
      qty: Math.max(1, Number(it.qty) || 1),
      price: Math.max(0, Number(it.price) || 0),
      cost: Math.max(0, Number(it.cost) || 0)
    }));
    const subtotal = U.sum(items, it => it.qty * it.price);
    const discount = Math.max(0, Math.min(subtotal, Number(data.discount) || 0));
    const total = data.total != null && !items.length
      ? Math.max(0, Number(data.total) || 0)
      : subtotal - discount;

    const t = {
      id: U.uid('trx'),
      type: 'income',
      date: data.date || U.today(),
      time: data.time || U.nowTime(),
      items: items,
      subtotal: items.length ? subtotal : total,
      discount: items.length ? discount : 0,
      total: total,
      hpp: U.sum(items, it => it.qty * it.cost),
      method: data.method || 'tunai',
      note: (data.note || '').trim(),
      createdAt: new Date().toISOString()
    };
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
      if (patch.items) {
        t.items = patch.items.map(it => ({
          productId: it.productId || null,
          name: it.name || 'Item',
          emoji: it.emoji || '🍽️',
          qty: Math.max(1, Number(it.qty) || 1),
          price: Math.max(0, Number(it.price) || 0),
          cost: Math.max(0, Number(it.cost) || 0)
        }));
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
    }
    commit();
    return t;
  }

  function removeTransaction(id) {
    const i = state.transactions.findIndex(x => x.id === id);
    if (i < 0) return null;
    const [removed] = state.transactions.splice(i, 1);
    commit();
    return { item: removed, index: i };
  }

  /** Kembalikan transaksi yang baru dihapus (fitur "Batalkan") */
  function restoreTransaction(item, index) {
    if (!item) return;
    const at = typeof index === 'number' ? U.clamp(index, 0, state.transactions.length) : state.transactions.length;
    state.transactions.splice(at, 0, item);
    commit();
  }

  function getTransaction(id) {
    return state.transactions.find(x => x.id === id) || null;
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
      expenseCount: expenses.length,
      itemsSold,
      avgOrder: incomes.length ? income / incomes.length : 0,
      transactions: list
    };
  }

  /** Saldo kas estimasi = modal awal + seluruh pemasukan - seluruh pengeluaran */
  function cashBalance() {
    const income = U.sum(state.transactions.filter(t => t.type === 'income'), t => t.total);
    const expense = U.sum(state.transactions.filter(t => t.type === 'expense'), t => t.total);
    return (Number(state.profile.startingCash) || 0) + income - expense;
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
        state.products.push({
          id: U.uid('prd'),
          name: p.name, emoji: p.emoji, price: p.price, cost: p.cost,
          group: p.group, active: true, createdAt: new Date().toISOString()
        });
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
          method: methods[Math.floor(rnd() * methods.length)]
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

  function addIncomeSilent(data) {
    const items = data.items.map(it => ({
      productId: it.productId, name: it.name, emoji: it.emoji,
      qty: it.qty, price: it.price, cost: it.cost
    }));
    const subtotal = U.sum(items, it => it.qty * it.price);
    state.transactions.push({
      id: U.uid('trx'), type: 'income', date: data.date, time: data.time,
      items, subtotal, discount: 0, total: subtotal,
      hpp: U.sum(items, it => it.qty * it.cost),
      method: data.method || 'tunai', note: data.note || '',
      createdAt: new Date().toISOString(), demo: true
    });
  }

  function addExpenseSilent(data) {
    state.transactions.push({
      id: U.uid('trx'), type: 'expense', date: data.date, time: data.time,
      categoryId: data.categoryId, total: data.total, method: 'tunai',
      note: data.note || '', createdAt: new Date().toISOString(), demo: true
    });
  }

  function hasDemoData() {
    return state.transactions.some(t => t.demo);
  }

  function clearDemoData() {
    state.transactions = state.transactions.filter(t => !t.demo);
    commit();
  }

  function resetAll() {
    state = defaultState();
    state.settings.onboarded = false;
    commit();
  }

  function clearTransactions() {
    state.transactions = [];
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
    commit();
    return state;
  }

  global.Store = {
    KEY, SCHEMA, PAYMENT_METHODS, DEFAULT_EXPENSE_CATEGORIES,
    load, get, subscribe, commit, persist, isStorageOK,
    updateProfile, updateSettings,
    productGroups, addProduct, updateProduct, removeProduct, getProduct,
    addCategory, updateCategory, removeCategory, getCategory,
    addIncome, addExpense, updateTransaction, removeTransaction, restoreTransaction, getTransaction,
    inRange, sortedDesc, summary, cashBalance, dailySeries, topProducts,
    expenseByCategory, incomeByMethod, firstDate,
    seedProducts, seedDemoTransactions, hasDemoData, clearDemoData,
    resetAll, clearTransactions, exportJSON, importJSON
  };
})(window);
