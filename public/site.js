(() => {
  const field = document.getElementById('field-lines');
  if (!field) return;
  const glyphs = '01 .:+-*/=<>[]{}()|:;~^#%&@';
  let seed = 1741;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const line = () => Array.from({ length: 100 }, () => glyphs[Math.floor(rand() * glyphs.length)]).join('');
  const rows = Array.from({ length: 29 }, () => { const row = document.createElement('div'); row.className = 'field-line'; row.textContent = line(); field.append(row); return row; });
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  const sync = () => {
    clearInterval(timer);
    if (!document.hidden && !preference.matches) timer = setInterval(() => { rows[Math.floor(rand() * rows.length)].textContent = line(); }, 230);
  };
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  sync();
})();
