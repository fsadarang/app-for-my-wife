/* =========================================================
   View: Pre-Order — pesanan untuk tanggal mendatang
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.Utils, I = global.Icons, S = global.Store, UI = global.UI;
  global.Views = global.Views || {};

  let tab = 'menunggu';   // menunggu | selesai

  /** Label & warna berdasarkan seberapa dekat tenggatnya */
  function dueInfo(dueDate) {
    const t = U.today();
    const selisih = U.diffDays(t, dueDate);
    if (selisih < 0) return { tone: 'late', label: `Terlambat ${Math.abs(selisih)} hari`, icon: 'alert' };
    if (selisih === 0) return { tone: 'today', label: 'Hari ini', icon: 'fire' };
    if (selisih === 1) return { tone: 'soon', label: 'Besok', icon: 'clock' };
    return { tone: 'later', label: `${selisih} hari lagi`, icon: 'calendar' };
  }

  function poCard(po) {
    const d = dueInfo(po.dueDate);
    const porsi = U.sum(po.items || [], it => it.qty);
    const done = po.status === 'selesai';
    return `
      <article class="po-card po-card--${done ? 'done' : d.tone}" data-po="${po.id}">
        <div class="po-card__head">
          <div class="po-card__who">
            <h3>${U.escapeHtml(po.customerName || 'Tanpa nama')}</h3>
            ${po.phone ? `<a class="po-card__phone" href="tel:${U.escapeHtml(po.phone)}" title="Hubungi">
              ${I.get('users', 13)} ${U.escapeHtml(po.phone)}</a>` : ''}
          </div>
          ${done
            ? `<span class="po-badge po-badge--done">${I.get('check', 13)} Selesai</span>`
            : `<span class="po-badge po-badge--${d.tone}">${I.get(d.icon, 13)} ${d.label}</span>`}
        </div>

        <ul class="po-card__items">
          ${(po.items || []).map(it => `
            <li><span class="po-card__qty">${it.qty}×</span> ${it.emoji || '🍽️'} ${U.escapeHtml(it.name)}</li>`).join('')}
        </ul>

        <div class="po-card__meta">
          <span>${I.get('calendar', 14)} ${U.formatDate(po.dueDate, true)}${po.dueTime ? ' • ' + po.dueTime : ''}</span>
          <span>${I.get('package', 14)} ${U.number(porsi)} porsi</span>
          <span class="po-card__total">${U.rupiah(po.total)}</span>
        </div>
        ${po.note ? `<p class="po-card__note">${I.get('note', 13)} ${U.escapeHtml(po.note)}</p>` : ''}

        <div class="po-card__actions">
          ${done ? `
            <button type="button" class="btn btn--ghost btn--sm" data-reopen="${po.id}">
              ${I.get('undo', 16)} Batalkan penyelesaian</button>`
          : `
            <button type="button" class="btn btn--soft btn--sm" data-edit="${po.id}">${I.get('edit', 16)} Ubah</button>
            <button type="button" class="btn btn--income btn--sm" data-complete="${po.id}">
              ${I.get('check', 16)} Selesai</button>`}
        </div>
      </article>`;
  }

  function render(root, params) {
    if (params && params.tab) tab = params.tab;
    const st = S.get();
    const sum = S.preorderSummary();
    const all = st.preorders || [];
    const done = all.filter(p => p.status === 'selesai')
      .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    const list = tab === 'selesai' ? done : sum.pending;

    // Rekap produksi: untuk hari ini dan besok, berapa porsi yang harus dibuat
    const planToday = S.productionPlan(U.today());
    const planTomorrow = S.productionPlan(U.addDays(U.today(), 1));

    root.innerHTML = `
      <section class="page-head">
        <div>
          <h1 class="page-title">${I.get('calendar', 22)} Pre-Order</h1>
          <p class="page-sub">Pesanan yang harus disiapkan untuk tanggal mendatang.</p>
        </div>
        <div class="page-head__actions">
          <button type="button" class="btn btn--primary" data-act="add">${I.get('plus', 18)} Pre-Order Baru</button>
        </div>
      </section>

      ${sum.lateCount ? `
        <div class="callout callout--late">
          <span class="callout__emoji">⏰</span>
          <div>
            <h3>${sum.lateCount} pre-order lewat tenggat</h3>
            <p>Pesanan di bawah ini tanggalnya sudah lewat tapi belum ditandai selesai.</p>
          </div>
        </div>` : ''}

      <section class="summary-strip summary-strip--po">
        <div class="summary-strip__item">
          <span class="summary-strip__label">${I.get('clock', 14)} Belum selesai</span>
          <strong>${sum.pendingCount}</strong>
        </div>
        <div class="summary-strip__item ${sum.todayCount ? 'is-expense' : ''}">
          <span class="summary-strip__label">${I.get('fire', 14)} Hari ini</span>
          <strong>${sum.todayCount}</strong>
        </div>
        <div class="summary-strip__item">
          <span class="summary-strip__label">${I.get('calendar', 14)} Besok</span>
          <strong>${sum.tomorrowCount}</strong>
        </div>
        <div class="summary-strip__item">
          <span class="summary-strip__label">${I.get('package', 14)} Porsi</span>
          <strong>${U.number(sum.pendingItems)}</strong>
        </div>
        <div class="summary-strip__item is-profit">
          <span class="summary-strip__label">${I.get('coins', 14)} Nilai</span>
          <strong>${U.rupiah(sum.pendingValue)}</strong>
        </div>
      </section>

      ${(planToday.length || planTomorrow.length) ? `
        <section class="card">
          <div class="card__head">
            <div>
              <h2 class="card__title">${I.get('scale', 18)} Yang Harus Disiapkan</h2>
              <p class="card__sub">Jumlah porsi dari seluruh pre-order</p>
            </div>
          </div>
          <div class="grid grid--1-1">
            ${[['Hari ini', planToday], ['Besok', planTomorrow]].map(([label, plan]) => `
              <div class="plan">
                <h3 class="plan__title">${U.escapeHtml(label)}</h3>
                ${plan.length ? `<ul class="plan__list">
                  ${plan.map(r => `<li>
                    <span class="plan__qty">${U.number(r.qty)}</span>
                    <span class="plan__name">${r.emoji || '🍽️'} ${U.escapeHtml(r.name)}</span>
                  </li>`).join('')}
                </ul>` : `<p class="plan__empty">Tidak ada pesanan.</p>`}
              </div>`).join('')}
          </div>
        </section>` : ''}

      <div class="seg seg--wide seg--tabs" role="tablist">
        <button type="button" class="seg__btn${tab === 'menunggu' ? ' is-active' : ''}" data-tab="menunggu" role="tab">
          ${I.get('clock', 16)} Belum Selesai${sum.pendingCount ? ` (${sum.pendingCount})` : ''}
        </button>
        <button type="button" class="seg__btn${tab === 'selesai' ? ' is-active' : ''}" data-tab="selesai" role="tab">
          ${I.get('check', 16)} Sudah Selesai${done.length ? ` (${done.length})` : ''}
        </button>
      </div>

      <section class="po-list">
        ${list.length ? list.map(poCard).join('') : UI.emptyState({
          emoji: tab === 'selesai' ? '📦' : '🗓️',
          title: tab === 'selesai' ? 'Belum ada pre-order selesai' : 'Belum ada pre-order',
          text: tab === 'selesai'
            ? 'Pre-order yang sudah diselesaikan akan tersimpan di sini sebagai riwayat.'
            : 'Catat pesanan yang harus dikerjakan besok atau tanggal lain, supaya tidak terlewat.',
          actionLabel: tab === 'selesai' ? '' : 'Buat Pre-Order'
        })}
      </section>`;

    /* --- Interaksi --- */
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      render(root);
    }));

    const openNew = () => global.Forms.preorderModal(null, () => { render(root); global.App.refreshShell(); });
    root.querySelector('[data-act=add]').addEventListener('click', openNew);
    const emptyBtn = root.querySelector('[data-empty-action]');
    if (emptyBtn) emptyBtn.addEventListener('click', openNew);

    UI.on(root, 'click', '[data-edit]', (e, node) => {
      const po = S.getPreorder(node.dataset.edit);
      if (po) global.Forms.preorderModal(po, () => { render(root); global.App.refreshShell(); });
    }, 'PoEdit');

    UI.on(root, 'click', '[data-complete]', (e, node) => {
      const po = S.getPreorder(node.dataset.complete);
      if (po) global.Forms.completePreorderModal(po, () => { render(root); global.App.refreshShell(); });
    }, 'PoComplete');

    UI.on(root, 'click', '[data-reopen]', async (e, node) => {
      const po = S.getPreorder(node.dataset.reopen);
      if (!po) return;
      const ok = await UI.confirm({
        title: 'Batalkan penyelesaian?',
        message: 'Pre-order kembali ke daftar belum selesai, dan pemasukan yang tercatat dari pesanan ini akan dihapus agar tidak terhitung dua kali.',
        danger: true, confirmText: 'Ya, batalkan'
      });
      if (!ok) return;
      S.reopenPreorder(po.id);
      UI.toast('Pre-order dikembalikan ke daftar belum selesai', 'info');
      render(root);
      global.App.refreshShell();
    }, 'PoReopen');
  }

  global.Views.preorder = render;
  global.Views.preorderDueInfo = dueInfo;
})(window);
