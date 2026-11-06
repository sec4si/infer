import { t, svg, views } from '/js/util.js';

const C = { base: '#8490a1', good: '#6cb8ff', bad: '#ff9a8a', warn: '#f3c070', ice: '#a8ecff', dim: '#4d6b8f', mint: '#86e0c8' };
const RUNS = {
  engram: [t('Hashed, 1M rows per head', '哈希，每头 100 万行'), C.bad],
  hash200k: [t('Hashed, 200k rows per head', '哈希，每头 20 万行'), C.warn],
  dict50: [t('Codebook, seen ≥ 50 times', '码表，出现 ≥ 50 次'), C.good],
  dict20: [t('Codebook, seen ≥ 20 times', '码表，出现 ≥ 20 次'), C.dim],
  dict20_lr5: [t('Codebook ≥ 20, 5× row learning rate', '码表 ≥ 20，表学习率 ×5'), C.base],
  lora8: ['LoRA r = 8', C.ice],
  p2_heavy_dict: [t('Codebook repair', '码表修复'), C.good],
  p2_heavy_lora: [t('LoRA repair', 'LoRA 修复'), C.ice],
  p2_mid_dict: [t('Codebook repair', '码表修复'), C.good],
  p2_mid_lora: [t('LoRA repair', 'LoRA 修复'), C.ice],
  p3_mean: [t('Counted table, no training', '统计表，不训练'), C.warn],
  p3_mean_lora: [t('Counted table + LoRA', '统计表 + LoRA'), C.mint],
};

function text(root, attrs, content) {
  svg('text', attrs, root).textContent = content;
}

// ---------- held-out perplexity during training; each view lists the runs it shows ----------

export function drift(viewList, { lo = 14.9, hi = 16.7, ticks = [15, 15.5, 16, 16.5], steps = [1000, 4000, 7000, 10000], baseName = t('no table', '不装表') } = {}) {
  return (scene, caption, data) => {
    const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
    const box = { x: 70, y: 46, w: 470, h: 224 };
    const first = steps[0], last = steps.at(-1);
    const xOf = step => box.x + box.w * (step - first) / (last - first);
    const yOf = v => box.y + box.h * (hi - v) / (hi - lo);
    svg('path', { class: 'axis', d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}` }, root);
    ticks.forEach(v => text(root, { class: 'fig-note', x: box.x - 8, y: yOf(v) + 4, 'text-anchor': 'end' }, v.toFixed(1)));
    steps.forEach(s => text(root, { class: 'fig-note', x: xOf(s), y: box.y + box.h + 20, 'text-anchor': 'middle' }, s.toLocaleString('en')));
    text(root, { class: 'fig-note', x: box.x, y: box.y - 18 }, t('held-out perplexity (lower is better)', '留出集困惑度（越低越好）'));
    text(root, { class: 'fig-note', x: box.x + box.w, y: box.y + box.h + 40, 'text-anchor': 'end' }, t('training step', '训练步数'));
    const base = data.base.held256;
    svg('path', { d: `M${box.x} ${yOf(base)}H${box.x + box.w}`, stroke: C.base, 'stroke-dasharray': '5 5', fill: 'none' }, root);
    text(root, { class: 'fig-note', x: box.x + 6, y: yOf(base) - 6 }, `${baseName} ${base.toFixed(2)}`);
    const layer = svg('g', {}, root);
    return views(scene, viewList.map(v => v.label), i => {
      layer.replaceChildren();
      const ends = [];
      viewList[i].runs.forEach((name, j) => {
        const [label, color] = RUNS[name];
        const curve = data.runs[name].curve;
        svg('path', { d: curve.map(([s, v], k) => `${k ? 'L' : 'M'}${xOf(s)} ${yOf(v)}`).join(''), stroke: color, 'stroke-width': 2, fill: 'none' }, layer);
        ends.push({ y: yOf(curve.at(-1)[1]) + 4, v: curve.at(-1)[1], color });
        const lx = box.x + (j % 2) * 250, ly = box.y + box.h + 62 + Math.floor(j / 2) * 18;
        svg('path', { d: `M${lx} ${ly}h22`, stroke: color, 'stroke-width': 2 }, layer);
        text(layer, { class: 'fig-note', x: lx + 30, y: ly + 4 }, label);
      });
      // End values, pushed apart so close curves keep readable labels.
      ends.sort((a, b) => a.y - b.y).forEach((e, k) => {
        if (k) e.y = Math.max(e.y, ends[k - 1].y + 13);
        text(layer, { class: 'fig-note', x: box.x + box.w + 8, y: e.y, style: `fill:${e.color}` }, e.v.toFixed(2));
      });
      caption(viewList[i].caption);
    });
  };
}

// ---------- final scores against the plain model: left of centre is better, right is worse ----------

const METRICS = [
  { key: 'heldout', label: t('held-out perplexity', '留出集困惑度'), ppl: true },
  { key: 'wiki', label: t('WikiText perplexity', 'WikiText 困惑度'), ppl: true },
  { key: 'trivia', label: 'TriviaQA', ppl: false },
];
const NOISE = 0.9; // standard error of one TriviaQA score in points (2,000 questions); context, not a threshold

export function scores(rows, captions, { byRun = false, baseName = t('no table', '不装表') } = {}) {
  return (scene, caption, data) => {
    const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
    const x0 = 390, half = 160, top = 96, gap = Math.min(80, 230 / rows.length);
    const layer = svg('g', {}, root);
    return views(scene, METRICS.map(m => m.label), i => {
      const m = METRICS[i], base = data.base[m.key];
      const value = row => data.runs[row.run][row.random ? 'random' : 'final'][m.key];
      // How much worse than the plain model: percent for perplexity, points for TriviaQA.
      const harm = v => (m.ppl ? (v / base - 1) * 100 : (base - v) * 100);
      const span = Math.max(3, ...rows.map(r => Math.abs(harm(value(r))) * 1.15));
      const xOf = h => x0 + half * h / span;
      layer.replaceChildren();
      text(layer, { class: 'fig-label', x: 40, y: 40 }, m.ppl ? t('CHANGE IN PERPLEXITY, %', '困惑度变化，%') : t('CHANGE IN ACCURACY, POINTS', '准确率变化，百分点'));
      text(layer, { class: 'fig-note', x: x0 - half, y: 66 }, t('← better', '← 更好'));
      text(layer, { class: 'fig-note', x: x0 + half, y: 66, 'text-anchor': 'end' }, t('worse →', '更差 →'));
      const bottom = top + gap * (rows.length - 1) + 30;
      if (!m.ppl) {
        svg('rect', { x: xOf(-NOISE), y: top - 26, width: xOf(NOISE) - xOf(-NOISE), height: bottom - top + 26, fill: '#ffffff0d' }, layer);
        text(layer, { class: 'fig-note', x: x0, y: bottom + 18, 'text-anchor': 'middle' }, t(`±1 standard error of one score (${NOISE} points)`, `单项得分 ±1 个标准误（${NOISE} 个百分点）`));
      }
      svg('path', { d: `M${x0} ${top - 26}V${bottom}`, stroke: C.base, 'stroke-dasharray': '4 4' }, layer);
      const fmt = v => (m.ppl ? v.toFixed(2) : `${(v * 100).toFixed(2)}%`);
      text(layer, { class: 'fig-note', x: x0, y: bottom + (m.ppl ? 18 : 36), 'text-anchor': 'middle' }, `${baseName}: ${fmt(base)}`);
      rows.forEach((row, j) => {
        const y = top + j * gap, h = harm(value(row));
        const color = byRun ? (row.random ? C.bad : RUNS[row.run][1]) : h < 0 ? C.good : C.bad;
        const [name] = RUNS[row.run];
        text(layer, { class: 'bar-label', x: 40, y: y + 4 }, row.random ? t('…same, random rows', '……同上，随机行') : name);
        svg('path', { d: `M${x0} ${y}H${xOf(h)}`, stroke: color, 'stroke-width': 3 }, layer);
        svg('circle', { cx: xOf(h), cy: y, r: 5, fill: color }, layer);
        const d = m.ppl ? h : -h; // the actual change: percent of perplexity, or points of accuracy
        text(layer, { class: 'fig-note', x: xOf(h), y: y - 12, 'text-anchor': 'middle', style: `fill:${color}` },
          `${fmt(value(row))} (${d > 0 ? '+' : ''}${d.toFixed(1)}${m.ppl ? '%' : ''})`);
      });
      caption(captions[i]);
    });
  };
}

// ---------- 2.1 how much text the frequent n-grams cover ----------

export function coverage(scene, caption, data) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const x0 = 40, w = 440, CHOSEN = 50;
  text(root, { class: 'fig-label', x: x0, y: 40 }, t('FIRST 100M TRAINING TOKENS', '训练数据前 1 亿个 TOKEN'));
  const rows = [0, 1, 2, 3].map(i => {
    const y = 78 + i * 70;
    return {
      label: svg('text', { class: 'bar-label', x: x0, y }, root),
      track: svg('rect', { class: 'bar-track', x: x0, y: y + 10, width: w, height: 22 }, root),
      bar: svg('rect', { class: 'bar-fill tier', x: x0, y: y + 10, width: 0, height: 22 }, root),
      value: svg('text', { class: 'bar-value', y: y + 27 }, root),
    };
  });
  text(root, { class: 'fig-note', x: x0, y: 372 }, t('share of positions in the text whose n-gram has a row', '文本中查得到行的位置所占比例'));
  return views(scene, [t('2-word n-grams', '两词 n-gram'), t('3-word n-grams', '三词 n-gram')], v => {
    data.ngram[v + 2].forEach(([threshold, count, share], i) => {
      const { label, bar, value } = rows[i];
      label.textContent = t(`seen ≥ ${threshold} times · ${count.toLocaleString('en')} n-grams`, `出现 ≥ ${threshold} 次 · ${count.toLocaleString('en')} 条`);
      bar.setAttribute('width', w * share / 100);
      bar.classList.toggle('dim', threshold !== CHOSEN);
      value.setAttribute('x', x0 + w * share / 100 + 8);
      value.textContent = `${share}%`;
    });
    caption(v
      ? t('Three-word phrases repeat less: the 139,547 seen at least 50 times cover 26.5% of positions.', '三词短语重复得少：出现至少 50 次的 139,547 条，覆盖 26.5% 的位置。')
      : t('The 227,808 two-word n-grams seen at least 50 times cover 71.6% of positions.', '出现至少 50 次的 227,808 条两词 n-gram，覆盖了 71.6% 的位置。'));
  });
}

// ---------- 3.1 perplexity after removing one block's feed-forward layer ----------

export function ffnDrop(scene, caption, data) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const box = { x: 70, y: 50, w: 540, h: 260 };
  const rows = data.ffn_drop.single, base = data.ffn_drop.base, REMOVED = [3, 4, 5, 6];
  const bw = box.w / rows.length;
  svg('path', { class: 'axis', d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}` }, root);
  text(root, { class: 'fig-note', x: box.x, y: box.y - 22 }, t('perplexity with that block’s feed-forward layer removed', '拿掉这一块的前馈层后的困惑度'));
  text(root, { class: 'fig-note', x: box.x + box.w, y: box.y + box.h + 40, 'text-anchor': 'end' }, t('block, counting from 1', '块号（从 1 数）'));
  rows.forEach(([i], k) => {
    if ((i + 1) % 4 === 0 || i === 1) text(root, { class: 'fig-note', x: box.x + bw * (k + 0.5), y: box.y + box.h + 18, 'text-anchor': 'middle' }, i + 1);
  });
  const layer = svg('g', {}, root);
  const VIEWS = [
    { label: t('log scale', '对数刻度'), lo: 10, hi: 10000, log: true },
    { label: t('zoom: from block 4', '放大：第 4 块起'), lo: 12, hi: 24, log: false },
  ];
  return views(scene, VIEWS.map(v => v.label), vi => {
    const v = VIEWS[vi];
    const f = x => (v.log ? Math.log10(x) : x);
    const yOf = x => box.y + box.h * (1 - (f(Math.min(Math.max(x, v.lo), v.hi)) - f(v.lo)) / (f(v.hi) - f(v.lo)));
    layer.replaceChildren();
    (v.log ? [10, 100, 1000, 10000] : [12, 16, 20, 24]).forEach(y => text(layer, { class: 'fig-note', x: box.x - 8, y: yOf(y) + 4, 'text-anchor': 'end' }, y.toLocaleString('en')));
    rows.forEach(([i, ppl], k) => {
      const color = i <= 2 ? C.bad : REMOVED.includes(i) ? C.warn : C.dim;
      svg('rect', { x: box.x + bw * k + 2, y: yOf(ppl), width: bw - 4, height: box.y + box.h - yOf(ppl), style: `fill:${color}` }, layer);
      if (ppl > v.hi) text(layer, { class: 'fig-note', x: box.x + bw * (k + 0.5), y: box.y - (k % 2 ? 6 : 18), 'text-anchor': 'middle', style: `fill:${color}` }, Math.round(ppl).toLocaleString('en'));
    });
    svg('path', { d: `M${box.x} ${yOf(base)}H${box.x + box.w}`, stroke: C.base, 'stroke-dasharray': '5 5' }, layer);
    text(layer, { class: 'fig-note', x: box.x + box.w, y: yOf(base) - 6, 'text-anchor': 'end' }, t(`nothing removed ${base.toFixed(2)}`, `不拿掉 ${base.toFixed(2)}`));
    caption(vi
      ? t('Blocks 4 and 5 cost about 28%; the cost dips to about 9% in the middle and climbs again at the end, to 79% for the last block.', '第 4、5 块的代价约 28%；往中间降到 9% 左右，到末尾又升上去，最后一块是 79%。')
      : t('Removing block 2’s or block 3’s feed-forward layer breaks the model.', '拿掉第 2 块或第 3 块的前馈层，模型直接崩溃。'));
  });
}

// ---------- 4.1 how much of each FFN's output the n-gram ending at that position explains ----------

export function rsqBars(scene, caption, data) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const box = { x: 70, y: 60, w: 540, h: 240 };
  const layers = data.rsq.layers, bw = box.w / layers.length;
  const yOf = v => box.y + box.h * (1 - v / 0.8);
  svg('path', { class: 'axis', d: `M${box.x} ${box.y}V${box.y + box.h}H${box.x + box.w}` }, root);
  [0, 0.2, 0.4, 0.6, 0.8].forEach(v => text(root, { class: 'fig-note', x: box.x - 8, y: yOf(v) + 4, 'text-anchor': 'end' }, `${Math.round(v * 100)}%`));
  text(root, { class: 'fig-note', x: box.x, y: box.y - 30 }, t('share of the FFN output’s variance explained, on held-out text', '在留出文本上，FFN 输出的方差被解释的比例'));
  text(root, { class: 'fig-note', x: box.x + box.w, y: box.y + box.h + 40, 'text-anchor': 'end' }, t('block, counting from 1', '块号（从 1 数）'));
  const PARTS = [['token', t('current token', '当前词'), C.dim], ['bigram', t('+ two words', '+ 两词'), C.good], ['trigram', t('+ three words', '+ 三词'), C.ice]];
  PARTS.forEach(([, label, color], j) => {
    svg('rect', { x: box.x + j * 150, y: box.y - 22, width: 12, height: 12, style: `fill:${color}` }, root);
    text(root, { class: 'fig-note', x: box.x + j * 150 + 18, y: box.y - 12 }, label);
  });
  layers.forEach((l, k) => {
    const r = data.rsq.r2[l], x = box.x + bw * k + 6;
    let below = 0;
    PARTS.forEach(([key, , color]) => {
      const top = Math.max(r[key], below);
      if (top > below) svg('rect', { x, y: yOf(top), width: bw - 12, height: yOf(below) - yOf(top), style: `fill:${color}` }, root);
      below = top;
    });
    text(root, { class: 'fig-note', x: x + (bw - 12) / 2, y: yOf(Math.max(r.trigram, 0)) - 6, 'text-anchor': 'middle' }, `${Math.round(Math.max(r.trigram, 0) * 100)}%`);
    text(root, { class: 'fig-note', x: x + (bw - 12) / 2, y: box.y + box.h + 18, 'text-anchor': 'middle' }, l + 1);
  });
  return {
    enter() { caption(t('In early blocks, 63–72% of the FFN output is explained by the last few words; deeper, 20–40%. Block 3 is the exception.', '浅层块里，FFN 输出有 63–72% 能被最后几个词解释；往深处只有 20–40%。第 3 块是个例外。')); },
    leave() {},
  };
}

// ---------- 4.2 perplexity with FFNs replaced: zeros, one fixed vector, or a lookup ----------

export function swapBars(scene, caption, data) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const x0 = 200, w = 340, lo = 10, hi = 20000;
  const xOf = v => x0 + w * Math.log10(v / lo) / Math.log10(hi / lo);
  text(root, { class: 'fig-label', x: 40, y: 40 }, t('PERPLEXITY, LOG SCALE', '困惑度，对数刻度'));
  const SCHEMES = [['zero', t('removed (zeros)', '拿掉（全零）'), C.bad], ['global', t('one fixed vector', '一个固定向量'), C.base],
    ['token', t('lookup: current token', '查表：当前词'), C.dim], ['trigram', t('lookup: up to three words', '查表：最多三词'), C.good]];
  const rows = SCHEMES.map(([, label], i) => {
    const y = 80 + i * 66;
    text(root, { class: 'bar-label', x: 40, y: y + 25 }, label);
    svg('rect', { class: 'bar-track', x: x0, y: y + 10, width: w, height: 22 }, root);
    const style = `fill:${SCHEMES[i][2]}`;
    return { bar: svg('rect', { class: 'bar-fill', x: x0, y: y + 10, width: 0, height: 22, style }, root), value: svg('text', { class: 'bar-value', y: y + 27, style }, root) };
  });
  const intact = data.swap.intact;
  svg('path', { d: `M${xOf(intact)} 66V${80 + 4 * 66}`, stroke: C.base, 'stroke-dasharray': '4 4' }, root);
  text(root, { class: 'fig-note', x: xOf(intact), y: 80 + 4 * 66 + 18, 'text-anchor': 'middle' }, t(`intact ${intact.toFixed(2)}`, `完整模型 ${intact.toFixed(2)}`));
  const SETS = [['[1]', t('block 2', '第 2 块')], ['[3]', t('block 4', '第 4 块')], ['[3, 4]', t('blocks 4–5', '第 4–5 块')], ['[3, 4, 5, 6]', t('blocks 4–7', '第 4–7 块')]];
  return views(scene, SETS.map(([, label]) => label), i => {
    const set = data.swap[SETS[i][0]];
    SCHEMES.forEach(([key], j) => {
      const v = set[key];
      rows[j].bar.setAttribute('width', xOf(v) - x0);
      rows[j].value.setAttribute('x', xOf(v) + 8);
      rows[j].value.textContent = v >= 100 ? Math.round(v).toLocaleString('en') : v.toFixed(2);
    });
    caption([
      t('Block 2’s FFN cannot be removed, yet a lookup stands in for most of it: 16.88 against 15.75 intact.', '第 2 块的前馈层拿掉就崩，换成查表却顶住了大部分：16.88，完整模型是 15.75。'),
      t('Block 4 alone: the lookup brings perplexity from 19.13 back to 16.75.', '只换第 4 块：查表把困惑度从 19.13 拉回到 16.75。'),
      t('Blocks 4–5: from 36.80 to 17.80, with no training.', '换第 4–5 块：从 36.80 到 17.80，没有任何训练。'),
      t('Blocks 4–7: from 85.73 to 20.31, as good as the codebook we trained.', '换第 4–7 块：从 85.73 到 20.31，和我们训练出来的码表一样好。'),
    ][i]);
  });
}
