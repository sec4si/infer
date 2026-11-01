import { zh, t, reduced, html } from './util.js';

// Each step: the word the model emitted, and the candidates it weighed. Probabilities are schematic.
export const STEPS = zh ? [
  ['因为', [['因为', .71], ['这是', .14], ['天空', .08], ['主要', .04]]],
  ['阳光', [['阳光', .52], ['太阳光', .31], ['光', .09], ['空气', .05]]],
  ['里', [['中', .47], ['里', .38], ['包含', .08], ['进入', .04]]],
  ['的', [['的', .93], ['面', .03], ['有', .02]]],
  ['蓝光', [['蓝光', .64], ['蓝色', .21], ['短波', .08], ['各种', .04]]],
  ['波长', [['波长', .88], ['频率', .06], ['能量', .03]]],
  ['更短', [['更短', .69], ['较短', .24], ['短', .05]]],
  ['，', [['，', .82], ['所以', .09], ['、', .06]]],
  ['更', [['更', .44], ['在', .21], ['所以', .18], ['容易', .12]]],
  ['容易', [['容易', .91], ['多地', .05], ['会', .02]]],
  ['被', [['被', .97], ['在', .02]]],
  ['空气', [['空气', .58], ['大气', .33], ['空气分子', .07]]],
  ['散射', [['散射', .95], ['反射', .03], ['吸收', .01]]],
  ['到', [['到', .62], ['向', .29], ['开', .06]]],
  ['四面八方', [['四面八方', .83], ['整个天空', .12], ['各处', .04]]],
  ['。', [['。', .96], ['，', .03]]],
] : [
  ['Because', [['Because', .68], ['The', .17], ['Sunlight', .09], ['It', .04]]],
  [' blue', [['blue', .55], ['sunlight', .22], ['light', .14], ['shorter', .05]]],
  [' light', [['light', .91], ['wavelengths', .06], ['photons', .02]]],
  [' in', [['in', .41], ['has', .37], ['from', .15], ['travels', .04]]],
  [' sunlight', [['sunlight', .86], ['the', .09], ['white', .03]]],
  [' has', [['has', .89], ['is', .06], ['travels', .03]]],
  [' a', [['a', .97], ['shorter', .02]]],
  [' shorter', [['shorter', .93], ['short', .04], ['higher', .02]]],
  [' wavelength', [['wavelength', .95], ['wave', .03]]],
  [',', [[',', .78], ['and', .14], ['so', .06]]],
  [' air', [['air', .46], ['it', .31], ['the', .19], ['molecules', .03]]],
  [' scatters', [['scatters', .92], ['bends', .04], ['spreads', .03]]],
  [' it', [['it', .94], ['blue', .04]]],
  [' far', [['more', .48], ['far', .36], ['much', .12], ['across', .03]]],
  [' more', [['more', .96], ['better', .02]]],
  ['.', [['.', .97], [',', .02]]],
];

export function stream(root) {
  const line = root.querySelector('.stream');
  const panel = root.querySelector('.choice');
  const tokens = STEPS.map(([word]) => {
    const tok = html('span', 'tok', line);
    tok.textContent = word;
    return tok;
  });
  const caret = html('span', 'caret', line);
  let shown = 0, current = -1, manual = false, visible = false, timer = 0;

  const show = i => {
    if (i === current) return;
    tokens[current]?.classList.remove('on');
    current = i;
    tokens[i].classList.add('on');
    const [word, candidates] = STEPS[i];
    panel.replaceChildren();
    html('div', 'choice-head', panel).textContent = t(`STEP ${i + 1} · CANDIDATES FOR THE NEXT WORD`, `第 ${i + 1} 步 · 下一个词的候选`);
    for (const [candidate, p] of candidates) {
      const row = html('div', `choice-row${candidate === word.trim() ? ' picked' : ''}`, panel);
      html('span', 'choice-word', row).textContent = candidate;
      html('span', 'choice-bar', row).style.setProperty('--p', p);
      html('span', 'choice-p', row).textContent = `${Math.round(p * 100)}%`;
    }
    if (candidates[0][0] !== word.trim()) html('div', 'choice-note', panel).textContent = t('Drawn by chance, not the top score.', '按概率抽中的，不是最高分。');
  };
  const reveal = n => {
    shown = n;
    tokens.forEach((tok, i) => tok.classList.toggle('shown', i < n));
    root.classList.toggle('done', n === tokens.length);
  };
  const tick = () => {
    if (shown < tokens.length) {
      reveal(shown + 1);
      if (!manual) show(shown - 1);
      return;
    }
    if (!manual) show((current + 1) % tokens.length);
  };
  const sync = () => {
    clearTimeout(timer);
    if (reduced.matches) {
      reveal(tokens.length);
      if (!manual) show(tokens.length - 1);
    } else if (visible && !document.hidden) {
      const loop = () => { tick(); timer = setTimeout(loop, shown < tokens.length ? 300 : 1900); };
      timer = setTimeout(loop, shown ? 1900 : 500);
    }
  };
  const pick = target => {
    const i = tokens.indexOf(target);
    if (i < 0 || i >= shown) return;
    manual = true;
    show(i);
  };

  line.addEventListener('pointerover', event => pick(event.target));
  line.addEventListener('click', event => pick(event.target));
  root.addEventListener('pointerleave', () => { manual = false; });
  root.addEventListener('keydown', event => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step || !shown) return;
    event.preventDefault();
    manual = true;
    show((current + step + shown) % shown);
  });
  root.addEventListener('blur', () => { manual = false; });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(root);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  caret.setAttribute('aria-hidden', 'true');
  sync();
}
