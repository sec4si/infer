import { t, reduced, svg, html, views, random } from './util.js';

// H100 SXM memory bandwidth and Llama 3 8B in 16 bits: one user's ceiling is one full read per word.
const BANDWIDTH = 3.35e12;
const SMALL = 8.03e9 * 2;
const PER_USER = Math.round(BANDWIDTH / SMALL);
const LANES = 8, SLOTS = 18;

// 3.1 Each read of the weights yields one word per user; batching and guessing ahead make each read count for more.
export function speed(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('rect', { class: 'weights', x: 30, y: 110, width: 130, height: 190 }, root);
  svg('text', { class: 'bar-label', x: 44, y: 136 }, root).textContent = t('GPU memory', '显存');
  svg('text', { class: 'fig-note', x: 44, y: 158 }, root).textContent = t('model: 16 GB', '模型：16 GB');
  const pipe = svg('path', { class: 'wire', d: 'M160 205H250' }, root);
  svg('text', { class: 'fig-note', x: 205, y: 250, 'text-anchor': 'middle' }, root).textContent = t('read all', '整个读');
  svg('rect', { class: 'compute', x: 250, y: 175, width: 90, height: 60 }, root);
  svg('text', { class: 'bar-label', x: 295, y: 210, 'text-anchor': 'middle' }, root).textContent = t('compute', '计算');
  const pulse = svg('circle', { class: 'pulse', r: 4, cx: 160, cy: 205 }, root);
  const lanes = Array.from({ length: LANES }, (_, i) => {
    const g = svg('g', { class: 'lane' }, root);
    svg('text', { class: 'fig-note', x: 350, y: 102 + i * 26 }, g).textContent = t(`user ${i + 1}`, `用户 ${i + 1}`);
    return { g, words: svg('g', {}, g), n: 0, y: 92 + i * 26 };
  });
  const big = svg('text', { class: 'big-number', x: 30, y: 352 }, root);
  const note = svg('text', { class: 'fig-note', x: 30, y: 380 }, root);
  pipe.setAttribute('pathLength', 1);

  let view = 0, timer = 0;
  const word = (lane, kind) => {
    if (lane.n >= SLOTS) { lane.words.replaceChildren(); lane.n = 0; }
    const rect = svg('rect', { class: `word ${kind}`, x: 412 + lane.n * 11.5, y: lane.y, width: 9, height: 14 }, lane.words);
    lane.n++;
    if (kind === 'reject') setTimeout(() => { rect.remove(); lane.n--; }, 380);
  };
  const read = () => {
    pulse.classList.remove('go'); void pulse.getBBox(); pulse.classList.add('go');
    if (view === 1) lanes.forEach(lane => word(lane, 'ok'));
    else if (view === 2) { word(lanes[0], 'ok'); word(lanes[0], 'ok'); word(lanes[0], 'ok'); word(lanes[0], 'reject'); }
    else word(lanes[0], 'ok');
  };
  const LINES = [
    [t(`One user: ~${PER_USER} words/s`, `一个人：每秒约 ${PER_USER} 个词`), t('ceiling = 3.35 TB/s ÷ 16 GB (H100, 8B model, 16 bits)', '上限 = 3.35 TB/s ÷ 16 GB（H100，8B 模型，16 位）'), t('Every word costs one full read of the model.', '每出一个词，都要把模型整个读一遍。')],
    [t(`64 users: ~${(PER_USER * 64).toLocaleString('en')} words/s`, `64 人一起：每秒约 ${(PER_USER * 64 / 10000).toFixed(1)} 万个词`), t('one read gives every user a word; 8 of the 64 are drawn', '读一遍，每个人各得一个词；图里只画了其中 8 人'), t('Same read, many users. This is batching.', '同一次读取，服务很多人。这叫批处理（batching）。')],
    [t('Guess ahead: 2–3× faster', '先猜后验：同一个人，快 2～3 倍'), t('a small model guesses 4 words; one read checks them all', '小模型先猜 4 个词，大模型读一遍全部检查'), t('Right guesses are kept, the first wrong one is thrown away.', '猜对的留下，第一个猜错的扔掉，从那里接着写。')],
  ];
  const v = views(scene, [t('one user', '一个人'), t('a batch', '一批人'), t('guess ahead', '先猜后验')], i => {
    view = i;
    lanes.forEach((lane, j) => { lane.words.replaceChildren(); lane.n = 0; lane.g.classList.toggle('gone', i !== 1 && j > 0); });
    big.textContent = LINES[i][0];
    note.textContent = LINES[i][1];
    caption(LINES[i][2]);
  });
  return {
    enter() { v.enter(); if (!reduced.matches) timer = setInterval(read, 650); else read(); },
    leave() { v.leave(); clearInterval(timer); },
  };
}

// Llama 3 70B at 16, 8 and 4 bits against 80 GB H100s.
const BIG = 70.6;
const CARD = 80, PX = 3.4;

// 3.2 Fewer bits per weight: fewer cards, less to move.
export function quant(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('text', { class: 'fig-label', x: 40, y: 46 }, root).textContent = t('BITS PER WEIGHT', '每个权重占的位数');
  const bits = Array.from({ length: 16 }, (_, i) => svg('rect', { class: 'bit', x: 40 + i * 22, y: 60, width: 18, height: 18 }, root));
  svg('text', { class: 'fig-label', x: 40, y: 134 }, root).textContent = t('LLAMA 3 70B ON 80 GB H100 CARDS', 'LLAMA 3 70B 放进 80 GB 的 H100');
  const cards = [40, 330].map(x => {
    svg('rect', { class: 'gpu', x, y: 150, width: CARD * PX, height: 60 }, root);
    return svg('rect', { class: 'weights', x, y: 150, height: 60 }, root);
  });
  const big = svg('text', { class: 'big-number', x: 40, y: 280 }, root);
  const note = svg('text', { class: 'fig-note', x: 40, y: 310 }, root);
  const cost = svg('text', { class: 'cost-note', x: 40, y: 340 }, root);

  const LEVELS = [
    [16, t('2 cards needed', '需要 2 块卡'), t('a single card cannot hold it', '一块卡装不下'), t('Full precision: the reference everything else is measured against.', '完整精度：其他做法都拿它当基准。')],
    [8, t('1 card, nearly full', '1 块卡，几乎塞满'), t('little room left for the KV cache', '留给 KV cache 的空间很少'), t('8 bits: careful 8-bit formats lose almost nothing.', '8 位：做得好的 8 位格式，几乎不损失准确度。')],
    [4, t('1 card, half free', '1 块卡，还空一半'), t('the rest can hold KV cache for many users', '剩下的空间可以装很多人的 KV cache'), t('4 bits: compressing only the weights comes surprisingly close to 8 bits.', '4 位：只压缩权重的 4 位格式，表现出乎意料地接近 8 位。')],
  ];
  return views(scene, LEVELS.map(([b]) => t(`${b} bits`, `${b} 位`)), i => {
    const [b, line, sub, say] = LEVELS[i];
    const size = BIG * b / 8;
    bits.forEach((bit, j) => bit.classList.toggle('on', j < b));
    cards[0].setAttribute('width', Math.min(size, CARD) * PX);
    cards[1].setAttribute('width', Math.max(0, size - CARD) * PX);
    big.textContent = line;
    note.textContent = t(`model ${size.toFixed(1)} GB · ${sub}`, `模型 ${size.toFixed(1)} GB · ${sub}`);
    cost.textContent = t(`speed ceiling ×${16 / b} (less to move for every word)`, `速度上限 ×${16 / b}（每个词要搬的数据少了）`);
    caption(say);
  });
}

// Thinking Machines, 2025: Qwen3-235B, "Tell me about Richard Feynman", 1000 runs at temperature 0.
// Every run agreed on the first 102 tokens, then split here.
const RUNS = 1000;
const SPLIT = [['Queens, New York', 992, 1000], ['New York City', 8, 0]];

// 3.3 The same prompt, a thousand runs, more than one answer; batch-invariant kernels make them identical.
export function repeat(scene, caption) {
  const box = html('div', 'runs', scene);
  html('p', 'chat-prompt mono', box).textContent = t('“Tell me about Richard Feynman” · temperature 0 · 1000 runs', '“Tell me about Richard Feynman” · 温度 0 · 跑 1000 次');
  html('p', 'runs-prefix', box).textContent = 'Feynman was born on May 11, 1918, in …';
  const list = html('div', 'runs-list mono', box);
  const rows = SPLIT.map(([label]) => {
    const row = html('div', 'choice-row', list);
    html('span', 'choice-word', row).textContent = label;
    return [html('span', 'choice-bar', row), html('span', 'choice-p', row)];
  });
  const counter = html('p', 'runs-count', box);
  let timer = 0, done = 0, view = 0;
  const render = () => {
    rows.forEach(([bar, n], i) => {
      const c = Math.round(SPLIT[i][view + 1] * done / RUNS);
      bar.style.setProperty('--p', c / RUNS);
      n.textContent = c;
    });
    counter.textContent = done < RUNS
      ? t(`${done} runs`, `已跑 ${done} 次`)
      : view ? t('All 1000 completions identical.', '1000 次，完全一样。') : t('80 different full answers; the most common appears only 78 times.', '完整回答有 80 种，最常见的一种也只出现 78 次。');
  };
  const run = () => {
    clearInterval(timer);
    if (reduced.matches) { done = RUNS; return render(); }
    done = 0;
    timer = setInterval(() => { done = Math.min(RUNS, done + 25); render(); if (done === RUNS) clearInterval(timer); }, 40);
  };
  const v = views(scene, [t('ordinary serving', '普通推理'), t('batch-invariant kernels', '批次不变的算子')], i => {
    view = i;
    run();
    caption(i
      ? t('Rewrite the kernels so the order of additions never depends on the batch, and the answers stop drifting.', '把算子改写成加法顺序不随批次变化，答案就不再漂移。')
      : t('No sampling, no compression. The answer still depends on what else is in the batch.', '没有抽样，也没有压缩。答案仍然取决于同一批里还有谁。'));
  });
  return { enter: v.enter, leave() { v.leave(); clearInterval(timer); } };
}

// DeepSeek-V3: 256 routed experts, 8 chosen per word, plus one shared expert.
const EXPERTS = 256, ACTIVE = 8;

// 3.4 Dense versus mixture-of-experts versus splitting prefill from decode.
export function arch(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'arch' }, scene);
  const grid = svg('g', { class: 'experts' }, root);
  const cells = Array.from({ length: EXPERTS }, (_, i) => svg('rect', { class: 'expert', x: 150 + (i % 16) * 21, y: 60 + Math.floor(i / 16) * 17, width: 17, height: 13 }, grid));
  const shared = svg('g', { class: 'moe-only' }, grid);
  svg('rect', { class: 'expert on shared', x: 150, y: 340, width: 38, height: 13 }, shared);
  svg('text', { class: 'fig-note', x: 198, y: 351 }, shared).textContent = t('shared expert, always on', '共享专家，每次都用');
  const gridNote = svg('text', { class: 'fig-note grid-note', x: 150, y: 44 }, grid);

  const split = svg('g', { class: 'split-only' }, root);
  for (const [x, title, line, limit, kind] of [
    [60, t('Prefill: read the question', '预填充：读题'), t('the whole prompt at once', '整段提问一次算完'), t('limited by compute', '瓶颈在算力'), 'prefill'],
    [360, t('Decode: write the answer', '解码：写答案'), t('one word at a time', '一个字一个字写'), t('limited by bandwidth', '瓶颈在带宽'), 'decode'],
  ]) {
    svg('rect', { class: `pool ${kind}`, x, y: 120, width: 220, height: 140 }, split);
    svg('text', { class: 'bar-label', x: x + 16, y: 150 }, split).textContent = title;
    svg('text', { class: 'fig-note', x: x + 16, y: 172 }, split).textContent = line;
    svg('text', { class: `fig-note limit ${kind}`, x: x + 16, y: 192 }, split).textContent = limit;
    for (let g = 0; g < 4; g++) svg('rect', { class: 'chip-gpu', x: x + 16 + g * 50, y: 208, width: 40, height: 36 }, split);
  }
  svg('path', { class: 'handoff', d: 'M280 226C320 226 320 260 320 262M320 262C320 260 320 226 360 226' }, split);
  svg('text', { class: 'fig-note', x: 320, y: 280, 'text-anchor': 'middle' }, split).textContent = t('KV cache handed over', '交接 KV cache');

  const next = random(671);
  let view = 0, timer = 0;
  const pick = () => {
    const chosen = new Set();
    while (chosen.size < ACTIVE) chosen.add(Math.floor(next() * EXPERTS));
    cells.forEach((cell, i) => cell.classList.toggle('on', view === 0 || chosen.has(i)));
  };
  const LINES = [
    [t('every parameter, for every word', '每个字，都用上全部参数'), t('Dense: the whole model works on every word.', '稠密模型：每个字都动用整个模型。')],
    [t('256 experts, 8 chosen per word', '256 个专家，每个字只选 8 个'), t('DeepSeek-V3: 671B parameters in total, about 37B used for each word.', 'DeepSeek-V3：总共 6710 亿参数，每个字只用约 370 亿。')],
    ['', t('The two halves need different hardware, so they get different machines.', '两半的瓶颈不同，就交给不同的机器。')],
  ];
  const v = views(scene, [t('dense', '稠密'), t('mixture of experts', '混合专家'), t('split the work', '拆开部署')], i => {
    view = i;
    root.dataset.view = i;
    gridNote.textContent = LINES[i][0];
    pick();
    caption(LINES[i][1]);
  });
  return {
    enter() { v.enter(); if (!reduced.matches) timer = setInterval(() => view === 1 && pick(), 900); },
    leave() { v.leave(); clearInterval(timer); },
  };
}

const CHIPS = [t('NVIDIA', '英伟达'), 'AMD', t('Huawei Ascend', '华为昇腾')];
const ENGINES = ['vLLM', 'SGLang', 'TensorRT-LLM', 'MindIE'];
// [state, note] per chip × engine, from each project's documentation (2026).
const SUPPORT = [
  [['native', 'CUDA'], ['native', 'CUDA'], ['native', t('NVIDIA only', '只支持英伟达')], ['none', '']],
  [['native', 'ROCm'], ['native', 'ROCm'], ['none', ''], ['none', '']],
  [['plugin', t('vllm-ascend, community-maintained, recommended by vLLM', 'vllm-ascend，社区维护，vLLM 推荐')], ['native', 'Ascend NPU'], ['none', ''], ['native', t('Huawei’s own engine, Ascend only', '华为自家引擎，只支持昇腾')]],
];
const STATE = { native: t('supported', '支持'), plugin: t('via plugin', '插件支持'), none: t('no', '不支持') };

// 3.5 Which engines run on which chips.
export function fit(scene, caption) {
  const box = html('div', 'fit', scene);
  const grid = html('div', 'fit-grid mono', box);
  html('span', '', grid);
  ENGINES.forEach(name => { html('span', 'fit-head', grid).textContent = name; });
  const cells = [];
  CHIPS.forEach((chipName, r) => {
    html('span', 'fit-chip', grid).textContent = chipName;
    ENGINES.forEach((engine, c) => {
      const [state, note] = SUPPORT[r]?.[c] ?? ['none', ''];
      const cell = html('button', `fit-cell ${state}`, grid);
      cell.type = 'button';
      cell.textContent = STATE[state];
      cell.addEventListener('pointerenter', () => { hovering = true; select(cells.indexOf(cell)); });
      cell.addEventListener('pointerleave', () => { hovering = false; });
      cell.addEventListener('click', () => select(cells.indexOf(cell)));
      cells.push({ cell, line: `${chipName} × ${engine}：${STATE[state]}${note ? ` · ${note}` : ''}` });
    });
  });
  html('p', 'fit-note mono', box).textContent = t('Supported is not the same as fast. How fast each cell runs is what we measure next.', '“支持”不等于“跑得好”。每一格到底多快，正是我们接下来要测的。');

  let current = -1, hovering = false, timer = 0;
  const select = i => {
    cells[current]?.cell.classList.remove('sel');
    current = i;
    cells[i].cell.classList.add('sel');
    caption(cells[i].line);
  };
  return {
    enter() {
      select(Math.max(current, 0));
      if (!reduced.matches) timer = setInterval(() => hovering || select((current + 1) % cells.length), 2000);
    },
    leave() { clearInterval(timer); },
  };
}
