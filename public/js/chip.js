import { t, reduced, svg, html, views } from './util.js';

// Llama 3 70B in 16 bits against 80 GB cards.
const MODEL_GB = 141;
const CARD_GB = 80;
const SPLITS = [1, 2, 4, 8];
const N = 16;

// 4.1 One weight matrix cut into column slices, one slice per card.
export function shard(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('text', { class: 'fig-label', x: 40, y: 40 }, root).textContent = t('ONE WEIGHT MATRIX', '一个权重矩阵');
  const cells = Array.from({ length: N * N }, (_, i) => svg('rect', { class: 'mcell', x: 40 + (i % N) * 15, y: 56 + Math.floor(i / N) * 15, width: 13, height: 13 }, root));
  const cards = svg('g', {}, root);
  const big = svg('text', { class: 'big-number', x: 330, y: 120 }, root);
  const note = svg('text', { class: 'fig-note', x: 330, y: 148 }, root);
  const comm = svg('text', { class: 'fig-note comm', x: 330, y: 172 }, root);

  return views(scene, SPLITS.map(n => t(`${n} card${n > 1 ? 's' : ''}`, `${n} 块卡`)), i => {
    const n = SPLITS[i], per = MODEL_GB / n, fits = per <= CARD_GB;
    cells.forEach((cell, j) => cell.setAttribute('data-card', Math.floor((j % N) / (N / n)) % 8));
    cards.replaceChildren();
    for (let c = 0; c < n; c++) {
      const w = 260 / n - 6, x = 330 + c * (260 / n);
      svg('rect', { class: 'card', 'data-card': c, x, y: 210, width: w, height: 90 }, cards);
      svg('rect', { class: `card-fill${fits ? '' : ' over'}`, 'data-card': c, x, y: 300 - Math.min(1, per / CARD_GB) * 90, width: w, height: Math.min(1, per / CARD_GB) * 90 }, cards);
    }
    svg('text', { class: 'fig-note', x: 330, y: 322 }, cards).textContent = t(`each card: ${per.toFixed(1)} of ${CARD_GB} GB`, `每块卡：${per.toFixed(1)} / ${CARD_GB} GB`);
    big.textContent = fits ? t(`${n} cards, ${per.toFixed(0)} GB each`, `${n} 块卡，每块 ${per.toFixed(0)} GB`) : t('does not fit', '装不下');
    big.classList.toggle('bad', !fits);
    note.textContent = fits ? t('each card holds one slice of every matrix', '每块卡拿着每个矩阵的一片') : t(`${MODEL_GB} GB > ${CARD_GB} GB on a single card`, `${MODEL_GB} GB 大于单卡的 ${CARD_GB} GB`);
    comm.textContent = n > 1 && fits ? t('cards swap results after every layer', '每算完一层，卡之间就要交换一次结果') : '';
    caption(fits
      ? t('More cards: less memory each, but more talking between them.', '卡越多，每块的负担越小，彼此之间的通信也越多。')
      : t('Llama 3 70B in 16 bits is about 141 GB. One 80 GB card cannot hold it.', 'Llama 3 70B 用 16 位存约 141 GB，一块 80 GB 的卡装不下。'));
  });
}

// [name, exponent bits, mantissa bits, largest finite value]
const FORMATS = [
  ['FP32', 8, 23, '3.4 × 10³⁸'],
  ['BF16', 8, 7, '3.4 × 10³⁸'],
  ['FP16', 5, 10, '65,504'],
  ['FP8 E4M3', 4, 3, '448'],
  ['FP4 E2M1', 2, 1, '6'],
];

// Round a positive normal number to the nearest value with this many exponent and mantissa bits.
function encode(x, E, M) {
  let e = Math.floor(Math.log2(x));
  let m = Math.round((x / 2 ** e - 1) * 2 ** M);
  if (m === 2 ** M) { e++; m = 0; }
  const bits = (v, n) => v.toString(2).padStart(n, '0');
  return { value: (1 + m / 2 ** M) * 2 ** e, bits: '0' + bits(e + 2 ** (E - 1) - 1, E) + bits(m, M) };
}

// 4.2 The same number, π, stored in five formats.
export function formats(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const strip = svg('g', {}, root);
  const legend = svg('g', {}, root);
  for (const [i, [kind, label]] of [['sign', t('sign', '符号')], ['exp', t('exponent: how big', '指数：多大')], ['man', t('mantissa: how exact', '尾数：多精确')]].entries()) {
    svg('rect', { class: `bitbox ${kind}`, x: 40 + i * 190, y: 150, width: 12, height: 12 }, legend);
    svg('text', { class: 'fig-note', x: 58 + i * 190, y: 160 }, legend).textContent = label;
  }
  const lines = [220, 256, 292, 328].map(y => svg('text', { class: 'fmt-line', x: 40, y }, root));
  const big = svg('text', { class: 'big-number', x: 40, y: 380 }, root);

  return views(scene, FORMATS.map(([name]) => name), i => {
    const [name, E, M, max] = FORMATS[i];
    const { value, bits } = encode(Math.PI, E, M);
    const size = Math.min(16, 560 / bits.length - 2);
    strip.replaceChildren();
    [...bits].forEach((b, j) => {
      const kind = j === 0 ? 'sign' : j <= E ? 'exp' : 'man';
      const x = 40 + j * (size + 2);
      svg('rect', { class: `bitbox ${kind}`, x, y: 70, width: size, height: size + 14 }, strip);
      svg('text', { class: 'bit-text', x: x + size / 2, y: 70 + (size + 14) / 2 + 4, 'text-anchor': 'middle' }, strip).textContent = b;
    });
    svg('text', { class: 'fig-label', x: 40, y: 52 }, strip).textContent = t(`${name} · ${bits.length} BITS`, `${name} · ${bits.length} 位`);
    const error = Math.abs(value - Math.PI) / Math.PI * 100;
    lines[0].textContent = 'π = 3.14159265…';
    lines[1].textContent = t(`stored as ${+value.toPrecision(9)}`, `存进去变成 ${+value.toPrecision(9)}`);
    lines[2].textContent = t(`off by ${error < 0.001 ? '< 0.001' : error.toFixed(2)}%`, `误差 ${error < 0.001 ? '< 0.001' : error.toFixed(2)}%`);
    lines[3].textContent = t(`largest number it can hold: ${max}`, `能存的最大数：${max}`);
    big.textContent = t(`${bits.length / 8} byte${bits.length > 8 ? 's' : ''} per weight`, `每个权重 ${bits.length / 8} 字节`);
    caption([
      t('Training’s classic format: plenty of range and detail.', '训练时的经典格式：范围和细节都很充足。'),
      t('BF16 keeps FP32’s range and cuts the detail.', 'BF16 保留 FP32 的范围，砍掉细节。'),
      t('FP16 keeps more detail, but nothing above 65,504 fits.', 'FP16 细节多一些，但超过 65,504 就存不下了。'),
      t('8 bits: still close to π, at a quarter of the size of FP32.', '8 位：离 π 还算近，大小只有 FP32 的四分之一。'),
      t('4 bits: only 16 values in total. π becomes 3.', '4 位：总共只能表示 16 个值，π 变成了 3。'),
    ][i]);
  });
}

const OPS = [t('matmul', '矩阵乘'), t('scale', '缩放'), t('mask', '掩码'), 'softmax', t('matmul', '矩阵乘')];

// 4.3 Attention as five separate kernels versus one fused kernel: count the memory round trips.
export function fusion(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'fusion' }, scene);
  svg('rect', { class: 'chip-area', x: 40, y: 50, width: 560, height: 110 }, root);
  svg('text', { class: 'fig-label', x: 52, y: 70 }, root).textContent = t('ON THE CHIP · FAST', '芯片上 · 快');
  svg('rect', { class: 'hbm-area', x: 40, y: 260, width: 560, height: 70 }, root);
  svg('text', { class: 'fig-label alt', x: 52, y: 280 }, root).textContent = t('GPU MEMORY (HBM) · SLOW', '显存（HBM）· 慢');
  const ops = OPS.map((label, i) => {
    const g = svg('g', { class: 'op' }, root);
    svg('rect', { x: 62 + i * 106, y: 92, width: 92, height: 44 }, g);
    svg('text', { x: 108 + i * 106, y: 119, 'text-anchor': 'middle' }, g).textContent = label;
    return g;
  });
  svg('rect', { class: 'fused-box', x: 54, y: 84, width: 532, height: 60 }, root);
  const trips = svg('g', {}, root);
  const count = svg('text', { class: 'big-number', x: 40, y: 380 }, root);

  let view = 0, timer = 0, n = 0;
  const plan = () => (view === 0 ? OPS.flatMap((_, i) => [[i, 'up'], [i, 'down']]) : [[0, 'up'], [4, 'down']]);
  const step = () => {
    const moves = plan();
    if (n >= moves.length) { n = 0; trips.replaceChildren(); }
    const [i, dir] = moves[n++];
    const x = 108 + i * 106 + (dir === 'up' ? -14 : 14);
    svg('path', { class: `trip ${dir}`, d: dir === 'up' ? `M${x} 258V140` : `M${x} 140V258` }, trips);
    ops.forEach((op, j) => op.classList.toggle('on', view === 1 || j === i));
    count.textContent = t(`${n} memory trip${n > 1 ? 's' : ''}`, `来回搬了 ${n} 趟`);
  };
  const v = views(scene, [t('one kernel each', '逐个算子'), t('fused', '融合成一个')], i => {
    view = i;
    root.dataset.view = i;
    n = 0;
    trips.replaceChildren();
    step();
    caption(i
      ? t('Fused, as in FlashAttention: read once, work on the chip, write once.', '融合之后，像 FlashAttention 那样：读一次，在芯片上做完，写一次。')
      : t('Separate kernels: every step reads from memory and writes back.', '分开跑：每一步都要从显存读、再写回显存。'));
  });
  return {
    enter() { v.enter(); if (!reduced.matches) timer = setInterval(step, 600); else while (n < plan().length) step(); },
    leave() { v.leave(); clearInterval(timer); },
  };
}

// H100 SXM memory layers, fastest first; sizes from NVIDIA's Hopper deep dive, bandwidth from the product page.
const LAYERS = [
  [t('Registers', '寄存器'), t('256 KB per SM × 132', '每个 SM 256 KB × 132'), t('right next to the Tensor Cores', '紧挨着 Tensor Core')],
  [t('Shared memory / L1', '共享内存 / L1'), t('up to 228 KB per SM × 132', '每个 SM 最多 228 KB × 132'), t('where a good kernel keeps its working tiles', '好的算子把正在算的数据块放在这里')],
  [t('L2 cache', 'L2 缓存'), '50 MB', t('shared by the whole chip', '整块芯片共用')],
  [t('HBM (GPU memory)', 'HBM（显存）'), '80 GB · 3.35 TB/s', t('holds the weights and the KV cache; every word reads it', '放权重和 KV cache；每出一个词都要读它')],
];

// 4.4 The GPU memory hierarchy, from tiny and fast to large and slow.
export function hierarchy(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const tc = svg('g', { class: 'tensor-core' }, root);
  svg('rect', { x: 250, y: 24, width: 140, height: 36 }, tc);
  svg('text', { x: 320, y: 47, 'text-anchor': 'middle' }, tc).textContent = 'Tensor Core';
  const rows = LAYERS.map(([name, size], i) => {
    const g = svg('g', { class: 'mem-row' }, root);
    const w = 150 + i * 105, y = 80 + i * 72;
    svg('rect', { x: 320 - w / 2, y, width: w, height: 56 }, g);
    svg('text', { class: 'bar-label', x: 320, y: y + 24, 'text-anchor': 'middle' }, g).textContent = name;
    svg('text', { class: 'fig-note', x: 320, y: y + 43, 'text-anchor': 'middle' }, g).textContent = size;
    return g;
  });
  svg('text', { class: 'fig-note', x: 24, y: 112 }, root).textContent = t('faster ↑', '更快 ↑');
  svg('text', { class: 'fig-note', x: 24, y: 330 }, root).textContent = t('larger ↓', '更大 ↓');

  let current = -1, timer = 0, hovering = false;
  const select = i => {
    rows[current]?.classList.remove('on');
    current = i;
    rows[i].classList.add('on');
    caption(`${LAYERS[i][0]}: ${LAYERS[i][2]}`);
  };
  rows.forEach((g, i) => {
    g.addEventListener('pointerenter', () => { hovering = true; select(i); });
    g.addEventListener('pointerleave', () => { hovering = false; });
    g.addEventListener('click', () => select(i));
  });
  return {
    enter() {
      select(Math.max(current, 0));
      if (!reduced.matches) timer = setInterval(() => hovering || select((current + 1) % rows.length), 2400);
    },
    leave() { clearInterval(timer); },
  };
}

const GENERATIONS = [
  ['2007', 'CUDA', t('A way to program GPUs for general computing. Every later kernel and library is built on it.', '让 GPU 可以做通用计算的编程方式。之后的算子和库，几乎都建在它上面。')],
  ['2017', 'Volta · V100', t('The first Tensor Cores: hardware just for matrix multiplication, in FP16.', '第一代 Tensor Core：专做矩阵乘的硬件，用 FP16 计算。')],
  ['2018', 'Turing', t('Tensor Cores learn INT8 and INT4.', 'Tensor Core 支持了 INT8 和 INT4。')],
  ['2020', 'Ampere · A100', t('TF32 and BF16 arrive, plus hardware for sparse weights.', '加入 TF32 和 BF16，以及处理稀疏权重的硬件。')],
  ['2022', 'Hopper · H100', t('FP8, with a Transformer Engine that picks the precision layer by layer.', '加入 FP8，配上逐层挑选精度的 Transformer Engine。')],
  ['2024', 'Blackwell', t('FP4 (NVFP4): small blocks of numbers share one scale factor.', '加入 FP4（NVFP4）：一小组数字共用一个缩放系数。')],
];

// A clickable timeline of [year, title, text] that steps forward on its own.
export const timeline = (items, line) => (scene, caption) => {
  const box = html('div', 'gens', scene);
  const track = html('div', 'gens-track mono', box);
  const card = html('div', 'gens-card', box);
  let current = 0, timer = 0;
  const select = i => {
    current = i;
    buttons.forEach((b, j) => { b.classList.toggle('on', j <= i); b.setAttribute('aria-current', j === i); });
    const [year, name, text] = items[i];
    card.replaceChildren();
    html('div', 'gens-meta mono', card).textContent = year;
    html('h4', '', card).textContent = name;
    html('p', '', card).textContent = text;
    caption(line);
  };
  const buttons = items.map(([year], i) => {
    const button = html('button', '', track);
    button.type = 'button';
    button.textContent = year;
    button.addEventListener('click', () => { clearInterval(timer); select(i); });
    button.addEventListener('pointerenter', () => { clearInterval(timer); select(i); });
    return button;
  });
  return {
    enter() {
      select(current);
      if (!reduced.matches) timer = setInterval(() => select((current + 1) % items.length), 2600);
    },
    leave() { clearInterval(timer); },
  };
};

// 4.5 NVIDIA generations and the number formats each one added.
export const generations = timeline(GENERATIONS, t('Each generation adds a smaller number format and the hardware to compute in it.', '每一代都加进一种更小的数字格式，以及直接用它计算的硬件。'));
