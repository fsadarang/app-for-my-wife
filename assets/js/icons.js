/* =========================================================
   Icons — kumpulan ikon SVG (stroke) tanpa library eksternal
   Pakai: Icons.get('wallet', 20)  ->  string <svg>
   ========================================================= */
(function (global) {
  'use strict';

  // Semua path digambar pada viewBox 24x24, stroke mengikuti currentColor.
  const P = {
    // Navigasi
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3.5h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>',
    receipt: '<path d="M6 2.8 7.6 4l1.6-1.2L10.8 4l1.6-1.2L14 4l1.6-1.2L17.2 4l1.6-1.2v17.4L17.2 19l-1.6 1.2L14 19l-1.6 1.2L10.8 19l-1.6 1.2L7.6 19 6 20.2z"/><path d="M9 8h7"/><path d="M9 12h7"/><path d="M9 16h4"/>',
    chart: '<path d="M3 21h18"/><rect x="4" y="12" width="4" height="6" rx="1"/><rect x="10" y="8" width="4" height="10" rx="1"/><rect x="16" y="4" width="4" height="14" rx="1"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 19.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47 1z"/>',

    // Uang
    wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2"/><path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19H19a1 1 0 0 0 1-1v-2"/><path d="M20 9h-4a3 3 0 0 0 0 6h4a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1z"/><circle cx="16.5" cy="12" r=".9" fill="currentColor" stroke="none"/>',
    coins: '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 1.7 2.7 3 6 3s6-1.3 6-3V6"/><path d="M3 11v5c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4"/><circle cx="17" cy="16" r="4.5"/><path d="M17 14.2v3.6M15.8 15.2h2.4M15.8 16.8h2.4"/>',
    piggy: '<path d="M18.5 10.5c.9.6 1.5 1.6 1.5 2.7 0 1.5-.9 2.8-2.3 3.6l-.5 2.4a1 1 0 0 1-1 .8h-1.4a1 1 0 0 1-1-.8l-.2-1h-3l-.2 1a1 1 0 0 1-1 .8H7.9a1 1 0 0 1-1-.8l-.4-2.2A5.6 5.6 0 0 1 4 12.2C4 8.8 7.4 6 11.5 6h2.2l3-2.2v3.1"/><circle cx="16.4" cy="11.4" r=".9" fill="currentColor" stroke="none"/><path d="M3.6 11H2.5"/>',
    trendUp: '<path d="M3 17 9.5 10.5l3.5 3.5L21 6"/><path d="M15.5 6H21v5.5"/>',
    trendDown: '<path d="M3 7 9.5 13.5l3.5-3.5L21 18"/><path d="M15.5 18H21v-5.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',

    // Aksi
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16"/><path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.5 7l.8 12.1a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10.5 11v6M13.5 11v6"/>',
    edit: '<path d="M4 20h4.2L19.5 8.7a2.1 2.1 0 0 0-3-3L5.2 17z"/><path d="M14.5 5.7l3.8 3.8"/><path d="M4 20l1.2-3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    filter: '<path d="M3.5 5.5h17l-6.6 7.6V19l-3.8 2v-7.9z"/>',
    download: '<path d="M12 3.5v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    upload: '<path d="M12 15.5v-11"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    print: '<path d="M7 8V4h10v4"/><path d="M7 18H5.5A2.5 2.5 0 0 1 3 15.5v-4A2.5 2.5 0 0 1 5.5 9h13a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H17"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    save: '<path d="M5 3.5h11L20.5 8v11.5a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M8 3.5v5h7v-5"/><rect x="7.5" y="13" width="9" height="7.5" rx="1"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
    undo: '<path d="M3.5 9h10a5.5 5.5 0 0 1 0 11H8"/><path d="M7 4.5 3 9l4 4.5"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1"/>',

    // Panah / arah
    chevronRight: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    chevronLeft: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevronDown: '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
    chevronUp: '<path d="M5.5 14.5 12 8l6.5 6.5"/>',
    arrowUp: '<path d="M12 20V4"/><path d="M6 10l6-6 6 6"/>',
    arrowDown: '<path d="M12 4v16"/><path d="M6 14l6 6 6-6"/>',
    arrowLeft: '<path d="M20 12H4"/><path d="M10 6l-6 6 6 6"/>',
    arrowRight: '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',

    // Objek
    tag: '<path d="M3.5 11.2V4.8a1.3 1.3 0 0 1 1.3-1.3h6.4a1.3 1.3 0 0 1 .92.38l8.1 8.1a1.3 1.3 0 0 1 0 1.84l-6.4 6.4a1.3 1.3 0 0 1-1.84 0l-8.1-8.1a1.3 1.3 0 0 1-.38-.92z"/><circle cx="7.8" cy="7.8" r="1.4"/>',
    package: '<path d="M12 2.7 21 7v10l-9 4.3L3 17V7z"/><path d="M3 7l9 4.3L21 7"/><path d="M12 11.3V21.3"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.5 4.8a3.5 3.5 0 0 1 0 6.6"/><path d="M18 20a6.2 6.2 0 0 0-2.2-4.7"/>',
    store: '<path d="M3.5 9.5 5 4.5h14l1.5 5"/><path d="M3.5 9.5a2.5 2.5 0 0 0 4.6 1.4 2.5 2.5 0 0 0 4.4 0 2.5 2.5 0 0 0 4.4 0 2.5 2.5 0 0 0 4.6-1.4"/><path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12"/><path d="M9.5 20.5v-5h5v5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    fire: '<path d="M12 21c3.6 0 6.2-2.4 6.2-5.8 0-3.6-2.6-5.4-3.6-8.2-.4-1.2-.4-2.3-.2-3.5-2.4 1-4.6 3.4-4.6 6 0 1 .3 1.8.3 2.4 0 1-.7 1.7-1.5 1.7-1 0-1.7-.9-1.7-2.2v-.6c-.9 1.2-1.4 2.7-1.4 4.4C5.5 18.6 8.2 21 12 21z"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none"/>',
    alert: '<path d="M10.3 3.9 2.6 17.2A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/><path d="M12 9v4"/><circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3A2.5 2.5 0 0 1 14.5 10c0 1.7-2.5 2-2.5 3.6"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
    moon: '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    dots: '<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',
    note: '<path d="M4.5 4.5h15v10.2l-4.8 4.8H4.5z"/><path d="M19.5 14.7h-4.8v4.8"/><path d="M8 9h8M8 12.5h5"/>',
    inbox: '<path d="M3.5 13.5h4l1.2 2.4h6.6l1.2-2.4h4"/><path d="M5.6 5.2h12.8l3.1 8.3v4a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-4z"/>',
    creditCard: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h3"/>',
    qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v3M17.5 20.5h3M14 20.5h.01"/>',
    banknote: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    logout: '<path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M9.5 12H21"/><path d="M17.5 8.5 21 12l-3.5 3.5"/>',
    sparkle: '<path d="m12 3 1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8z"/><path d="M18.5 15.5 19.4 18l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z"/>',
    scale: '<path d="M12 3.5v17"/><path d="M7 20.5h10"/><path d="M4.5 7.5 12 6l7.5 1.5"/><path d="M4.5 7.5 2 14a2.5 2.5 0 0 0 5 0z"/><path d="M19.5 7.5 17 14a2.5 2.5 0 0 0 5 0z"/>'
  };

  /** Emoji makanan siap pakai untuk pemilih ikon menu */
  const FOOD_EMOJI = [
    '🍚', '🍛', '🍜', '🍲', '🍱', '🍙', '🍢', '🥘', '🍝', '🍕',
    '🍔', '🌭', '🥪', '🌮', '🥙', '🍗', '🍖', '🥩', '🍤', '🐟',
    '🥚', '🍳', '🥗', '🥦', '🌽', '🍟', '🥟', '🥠', '🫓', '🥐',
    '🍞', '🥖', '🧁', '🍰', '🎂', '🍮', '🍨', '🍧', '🍪', '🍩',
    '🍫', '🍬', '🥤', '🧋', '☕', '🍵', '🧃', '🥛', '🍺', '🧉'
  ];

  const EXPENSE_EMOJI = [
    '🛒', '🥬', '🍖', '🧂', '🔥', '💡', '💧', '🏠', '👩‍🍳', '🚚',
    '📦', '🧻', '🧼', '📱', '📢', '🛵', '⛽', '🔧', '🧾', '💳'
  ];

  function get(name, size, extraClass) {
    const body = P[name];
    const s = size || 20;
    if (!body) return '';
    return `<svg class="icon ${extraClass || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" ` +
      `fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ` +
      `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  function has(name) { return !!P[name]; }

  global.Icons = { get, has, names: Object.keys(P), FOOD_EMOJI, EXPENSE_EMOJI };
})(window);
