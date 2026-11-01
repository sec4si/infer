import { zh } from './util.js';

// Figures are built once in the current language, so switching reloads the page.
document.querySelector('.lang-switch').addEventListener('click', () => {
  try { localStorage.setItem('lang', zh ? 'en' : 'zh'); } catch {}
  location.reload();
});
