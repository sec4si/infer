import '/js/page.js';
import { t, reduced, svg, html, views, random } from '/js/util.js';
import { scrolly } from '/js/scrolly.js';
import { timeline } from '/js/chip.js';

document.title = t('Heterogeneous inference — Infer', '异构推理 — Infer');
await document.fonts.ready;

const fmtBytes = b => (b >= 1e12 ? `${+(b / 1e12).toFixed(1)} TB` : b >= 1e9 ? `${+(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${+(b / 1e6).toFixed(1)} MB` : `${+(b / 1e3).toFixed(1)} KB`);

// An example machine: one H100, a 12-channel DDR5-6400 server, one PCIe 5.0 SSD. Bandwidth in GB/s; null where the vendor does not publish it.
const TIERS = [
  [t('On-chip SRAM', '片上 SRAM'), 132 * 228e3, null, t('228 KB per SM × 132', '每个 SM 228 KB × 132')],
  [t('L2 cache', 'L2 缓存'), 50e6, null, 'H100'],
  [t('GPU memory (HBM)', '显存（HBM）'), 80e9, 3350, 'H100'],
  ['RAM (DDR5)', 512e9, 614, t('12 channels × DDR5-6400', '12 通道 DDR5-6400')],
  [t('SSD (PCIe 5.0)', '固态硬盘（PCIe 5.0）'), 4e12, 14.8, '9100 PRO'],
];

// 1.1 The storage ladder, by capacity or by bandwidth, on a log scale.
function ladder(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const x0 = 40, w = 400;
  svg('text', { class: 'fig-label', x: 40, y: 40 }, root).textContent = t('EXAMPLE MACHINE · LOG SCALE', '示例机器 · 对数刻度');
  const rows = TIERS.map(([name, , , note], i) => {
    const y = 66 + i * 62;
    svg('text', { class: 'bar-label', x: x0, y }, root).textContent = `${name} · ${note}`;
    svg('rect', { class: 'bar-track', x: x0, y: y + 10, width: w, height: 22 }, root);
    return { bar: svg('rect', { class: 'bar-fill tier', x: x0, y: y + 10, width: 0, height: 22 }, root), value: svg('text', { class: 'bar-value', y: y + 27 }, root) };
  });
  return views(scene, [t('capacity', '容量'), t('bandwidth', '带宽')], v => {
    TIERS.forEach(([, cap, bw], i) => {
      const { bar, value } = rows[i];
      const n = v ? bw : cap;
      const k = n == null ? 0 : v ? Math.log10(n) / Math.log10(5000) : (Math.log10(n) - 6) / (Math.log10(5e12) - 6);
      bar.setAttribute('width', w * Math.max(0.02, k));
      value.setAttribute('x', x0 + w * Math.max(0.02, k) + 8);
      value.textContent = n == null ? t('faster, not published', '更快，厂商未公布') : v ? `${n.toLocaleString('en')} GB/s` : fmtBytes(n);
    });
    caption(v
      ? t('Each step down delivers far less per second.', '每往下一级，每秒能送出的数据少得多。')
      : t('Each step down holds far more.', '每往下一级，能装的多得多。'));
  });
}

// colibri, GLM-5.2 int4: four reported machines. [machine, fast tier, share of expert reads served fast, tok/s, issue]
const MACHINES = [
  [t('laptop-class · 24 GB RAM', '笔记本级 · 24 GB 内存'), t('RAM', '内存'), 3.5, '0.07', '#2'],
  [t('Framework 13 · 128 GB', 'Framework 13 · 128 GB'), t('RAM', '内存'), 66, '0.37', '#12'],
  [t('EPYC server · 430 GB', 'EPYC 服务器 · 430 GB'), t('RAM', '内存'), 98, '1.00', '#104'],
  [t('6 × RTX 5090 · 251 GB', '6 × RTX 5090 · 251 GB'), t('GPU memory + RAM', '显存 + 内存'), 95, '5.8–6.8', ''],
];

// 1.2 The same model on four machines: where expert reads are served from, and the speed that follows.
function kitchens(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('text', { class: 'fig-label', x: 40, y: 40 }, root).textContent = t('GLM-5.2 · 744B · SAME ENGINE, SAME FILE', 'GLM-5.2 · 744B · 同一个引擎、同一份文件');
  const name = svg('text', { class: 'bar-label', x: 40, y: 92 }, root);
  svg('text', { class: 'fig-note', x: 40, y: 140 }, root).textContent = t('where each expert read is served from', '每次读专家，从哪一层读到');
  svg('rect', { class: 'bar-track', x: 40, y: 152, width: 560, height: 40 }, root);
  const fast = svg('rect', { class: 'bar-fill fast', x: 40, y: 152, width: 0, height: 40 }, root);
  const fastLabel = svg('text', { class: 'bar-label on-bar', x: 52, y: 177 }, root);
  const diskLabel = svg('text', { class: 'bar-label', x: 588, y: 177, 'text-anchor': 'end' }, root);
  const speed = svg('text', { class: 'big-number', x: 40, y: 290 }, root);
  const source = svg('text', { class: 'fig-note', x: 40, y: 318 }, root);
  return views(scene, MACHINES.map((m, i) => `${i + 1}`), i => {
    const [machine, tier, hit, tok, issue] = MACHINES[i];
    name.textContent = machine;
    fast.setAttribute('width', 560 * hit / 100);
    fastLabel.textContent = hit > 20 ? `${tier} ${i === 3 ? '89–100' : hit}%` : '';
    diskLabel.textContent = hit < 90 ? t(`disk ${Math.round(100 - hit)}%`, `硬盘 ${Math.round(100 - hit)}%`) : '';
    speed.textContent = t(`${tok} words/s`, `每秒 ${tok} 个词`);
    source.textContent = issue ? t(`reported in colibri issue ${issue}`, `数据见 colibri issue ${issue}`) : t('author’s rig, full residency', '作者的机器，专家全部常驻');
    caption(i === 0
      ? t('Almost every expert comes from disk.', '几乎每个专家都要从硬盘读。')
      : i === 3 ? t('Every expert fits in GPU memory and RAM; the disk drops out.', '专家全部放进显存和内存，硬盘退出了计算。') : t('More of the hot experts stay in RAM, and the speed follows.', '更多常用专家留在内存里，速度跟着上去。'));
  });
}

// 1.3 Expert heat follows a long tail; pinning the hottest beats keeping an arbitrary set. Grid is schematic; 28% and 66% are measured.
function heat(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const next = random(1203);
  const N = 256;
  const weight = Array.from({ length: N }, (_, r) => 1 / (r + 1) ** 0.9);
  const total = weight.reduce((a, b) => a + b, 0);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => next() - 0.5);
  const cells = order.map((rank, i) => {
    const cell = svg('rect', { class: 'expert-heat', x: 40 + (i % 16) * 20, y: 50 + Math.floor(i / 16) * 18, width: 16, height: 14 }, root);
    cell.style.setProperty('--h', Math.sqrt(weight[rank] / weight[0]));
    return { cell, rank };
  });
  const pick = (target, ranked) => {
    const chosen = new Set();
    let mass = 0;
    const list = ranked ? [...cells].sort((a, b) => a.rank - b.rank) : [...cells].sort(() => next() - 0.5);
    for (const c of list) { if (mass / total >= target) break; chosen.add(c); mass += weight[c.rank]; }
    return chosen;
  };
  const sets = [pick(0.28, false), pick(0.66, true)];
  const big = svg('text', { class: 'big-number', x: 390, y: 120 }, root);
  const note = svg('text', { class: 'fig-note', x: 390, y: 148 }, root);
  const speed = svg('text', { class: 'bar-label', x: 390, y: 186 }, root);
  svg('text', { class: 'fig-note', x: 40, y: 360 }, root).textContent = t('brighter = used more · outlined = kept in RAM · grid schematic', '越亮越常用 · 带框的留在内存里 · 方格为示意');
  return views(scene, [t('before', '学习前'), t('after', '学习后')], v => {
    cells.forEach(c => c.cell.classList.toggle('pinned', sets[v].has(c)));
    big.textContent = t(`${v ? 66 : 28}% fast`, `快读 ${v ? 66 : 28}%`);
    note.textContent = 'Framework 13 · colibri #12';
    speed.textContent = t(`${v ? '0.37' : '0.29'} words/s`, `每秒 ${v ? '0.37' : '0.29'} 个词`);
    caption(v
      ? t('Keep the experts your conversations actually use.', '留下你的对话真正常用的那些专家。')
      : t('A cache that does not know what is hot keeps a mixed bag.', '不知道哪些常用，缓存里留下的就是一堆杂货。'));
  });
}

// DeepSeek V4.1 Flash, per word: routed experts 6 × 40 layers × 18.8 MB; Engram about 48 rows × 264 bytes.
const EXPERT_BYTES = 6 * 40 * 18.8e6;
const ENGRAM_BYTES = 48 * 264;
const SSD = 14.8e9;

// 2.1 Bytes per word from each kind of weight, and what that costs from an SSD.
function pinch(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('text', { class: 'fig-label', x: 40, y: 40 }, root).textContent = t('READ PER WORD · DEEPSEEK V4.1 FLASH · LOG SCALE', '每个词要读多少 · DEEPSEEK V4.1 FLASH · 对数刻度');
  const x0 = 40, w = 560, lo = 3, hi = 10;
  const len = b => w * (Math.log10(b) - lo) / (hi - lo);
  const rows = [[t('experts', '专家'), EXPERT_BYTES, 'exp'], ['Engram', ENGRAM_BYTES, 'eng']].map(([label, bytes, kind], i) => {
    const y = 80 + i * 80;
    svg('text', { class: 'bar-label', x: x0, y: y - 8 }, root).textContent = `${label} · ${fmtBytes(bytes)}`;
    svg('rect', { class: 'bar-track', x: x0, y, width: w, height: 28 }, root);
    return svg('rect', { class: `bar-fill ${kind}`, x: x0, y, width: len(bytes), height: 28 }, root);
  });
  svg('text', { class: 'fig-note', x: x0, y: 230 }, root).textContent = t('over 300,000 times apart', '相差 30 多万倍');
  const big = svg('text', { class: 'big-number', x: x0, y: 300 }, root);
  const note = svg('text', { class: 'fig-note', x: x0, y: 328 }, root);
  return views(scene, [t('experts on SSD', '专家放硬盘'), t('Engram on SSD', 'Engram 放硬盘')], v => {
    rows.forEach((bar, i) => bar.classList.toggle('dim', i !== v));
    big.textContent = v ? t('< 1 ms per word', '每个词 < 1 毫秒') : t(`${(EXPERT_BYTES / SSD).toFixed(2)} s per word`, `每个词 ${(EXPERT_BYTES / SSD).toFixed(2)} 秒`);
    note.textContent = v
      ? t('a few dozen 264-byte reads, sent at once; latency, not bandwidth, sets the time', '几十次 264 字节的读取，同时发出；时间由延迟决定，不是带宽')
      : t(`${fmtBytes(EXPERT_BYTES)} ÷ 14.8 GB/s (PCIe 5.0 SSD)`, `${fmtBytes(EXPERT_BYTES)} ÷ 14.8 GB/s（PCIe 5.0 固态硬盘）`);
    caption(v
      ? t('A pinch: fine to keep in the warehouse.', '一撮：放在仓库也不碍事。')
      : t('A truckload: it has to live close by.', '一车：得放在近处。'));
  });
}

const LAYERS = 40, ENGRAM_AT = [1, 14];

// 2.2 Engram addresses come from the words alone, so reads can start before the layers that need them. Timing schematic.
function prefetch(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'prefetch' }, scene);
  const x0 = 40, step = 13.5, wait = 4;
  svg('text', { class: 'fig-label', x: x0, y: 60 }, root).textContent = t('ONE WORD, 40 LAYERS', '一个词，40 层');
  svg('text', { class: 'bar-label', x: x0, y: 100 }, root).textContent = t('compute', '计算');
  svg('text', { class: 'bar-label', x: x0, y: 162 }, root).textContent = t('Engram reads', '读 Engram');
  const layers = svg('g', {}, root), reads = svg('g', {}, root);
  const big = svg('text', { class: 'big-number', x: x0, y: 300 }, root);
  const note = svg('text', { class: 'fig-note', x: x0, y: 328 }, root);
  svg('text', { class: 'fig-note', x: x0, y: 372 }, root).textContent = t('timing schematic · Engram sits in layers 1 and 14', '时间为示意 · Engram 在第 1 层和第 14 层');
  const draw = early => {
    layers.replaceChildren();
    reads.replaceChildren();
    let x = x0, stalls = 0;
    for (let l = 0; l < LAYERS; l++) {
      if (!early && ENGRAM_AT.includes(l)) {
        svg('rect', { class: 'stall', x, y: 112, width: wait * step, height: 30 }, layers);
        svg('rect', { class: 'read', x, y: 174, width: wait * step, height: 14 }, reads);
        x += wait * step;
        stalls++;
      }
      svg('rect', { class: `layer-block${ENGRAM_AT.includes(l) ? ' eng' : ''}`, x, y: 112, width: step - 2, height: 30 }, layers);
      x += step;
    }
    if (early) ENGRAM_AT.forEach((_, i) => svg('rect', { class: 'read', x: x0, y: 174 + i * 18, width: wait * step, height: 14 }, reads));
    return stalls;
  };
  return views(scene, [t('read when needed', '用时再读'), t('read in advance', '提前读')], v => {
    const stalls = draw(v === 1);
    big.textContent = v ? t('no waiting', '不用等') : t(`${stalls} stalls per word`, `每个词停 ${stalls} 次`);
    note.textContent = v
      ? t('the reads are sent as soon as the word is known, while the layers compute', '词一到就发出读取，和各层的计算同时进行')
      : t('each Engram layer waits for its disk read', '每个用到 Engram 的层，都要停下来等硬盘');
    caption(v
      ? t('Known addresses can be fetched early. Experts cannot: they are chosen inside the model.', '地址提前就知道，就能提前取。专家做不到：用哪个是模型在内部才决定的。')
      : t('Reading at the last moment puts the disk on the critical path.', '到用时才读，硬盘就挡在了路上。'));
  });
}

// Lookup tables by size, billions of parameters. [label, size, kind]: trained, systems test only, or untried.
const TABLES = [
  [t('Engram scaling study, max', 'Engram 扩容实验上限'), 13, 'trained'],
  ['Engram-40B', 18.5, 'trained'],
  ['Qwen3.8-Flash-Next', 51, 'trained'],
  [t('100B in CPU RAM: −2.8%', '1000 亿放 CPU 内存：−2.8%'), 100, 'system'],
  ['DeepSeek V4.1 Flash', 196, 'trained'],
];

// 2.3 How big lookup tables have been made, and what is still untried.
function scale(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'scale' }, scene);
  const x0 = 60, x1 = 600, lo = 1, hi = 4;
  const X = b => x0 + (x1 - x0) * (Math.log10(b) - lo) / (hi - lo);
  svg('path', { class: 'axis', d: `M${x0} 300H${x1}` }, root);
  for (const b of [10, 100, 1000, 10000]) {
    svg('path', { class: 'grid-tick', d: `M${X(b)} 296V304` }, root);
    svg('text', { class: 'fig-note', x: X(b), y: 324, 'text-anchor': 'middle' }, root).textContent = b >= 1000 ? `${b / 1000}T` : `${b}B`;
  }
  svg('text', { class: 'fig-note', x: x1, y: 348, 'text-anchor': 'end' }, root).textContent = t('table parameters (at 8 bits, 1T ≈ 1 TB)', '表的参数量（按 8 位算，1T 参数约 1 TB）');
  const gap = svg('g', { class: 'untried' }, root);
  svg('rect', { x: X(1000), y: 60, width: X(10000) - X(1000), height: 230 }, gap);
  svg('text', { class: 'gap-label', x: (X(1000) + X(10000)) / 2, y: 90, 'text-anchor': 'middle' }, gap).textContent = t('several TB: untried', '几个 TB：没人做过');
  const pts = TABLES.map(([label, b, kind], i) => {
    const g = svg('g', { class: `table-pt ${kind}` }, root);
    const y = 270 - i * 38;
    svg('path', { class: 'stem', d: `M${X(b)} 300V${y}` }, g);
    svg('circle', { cx: X(b), cy: y, r: 6 }, g);
    svg('text', { x: X(b) + (b > 150 ? -10 : 10), y: y + 4, 'text-anchor': b > 150 ? 'end' : 'start' }, g).textContent = label;
    return [g, kind];
  });
  const LINES = [
    t('Trained tables so far top out around 200 GB.', '训练过的表，目前最大约 200 GB。'),
    t('Systems tests show big tables can live off the GPU cheaply.', '系统测试表明，大表放在 GPU 之外也很便宜。'),
    t('Nobody has trained a table of several terabytes.', '几个 TB 的表，还没有人训练过。'),
  ];
  return views(scene, [t('trained', '训练过的'), t('systems tests', '系统测试'), t('untried', '没人做过')], v => {
    root.dataset.view = v;
    pts.forEach(([g, kind]) => g.classList.toggle('dim', v === 0 ? kind !== 'trained' : v === 1 ? kind !== 'system' : false));
    caption(LINES[v]);
  });
}

const DOMAINS = [t('general', '通用'), t('code', '代码'), t('medicine', '医疗'), t('company docs', '公司文档')];

// 2.4 A frozen backbone with swappable tables on disk. A proposal, drawn as one.
function swap(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'swap' }, scene);
  svg('text', { class: 'gap-label', x: 40, y: 44 }, root).textContent = t('PROPOSAL · NOT YET TESTED', '设想 · 尚未验证');
  svg('rect', { class: 'backbone', x: 40, y: 80, width: 260, height: 150 }, root);
  svg('text', { class: 'bar-label', x: 60, y: 110 }, root).textContent = t('backbone (frozen)', '模型主干（冻结）');
  svg('text', { class: 'fig-note', x: 60, y: 132 }, root).textContent = t('GPU memory + RAM', '显存 + 内存');
  const slot = svg('rect', { class: 'slot', x: 60, y: 160, width: 220, height: 50 }, root);
  const mounted = svg('text', { class: 'bar-label slot-label', x: 170, y: 191, 'text-anchor': 'middle' }, root);
  svg('text', { class: 'fig-note', x: 380, y: 80 }, root).textContent = t('tables on SSD', '硬盘上的表');
  const tables = DOMAINS.map((name, i) => {
    const g = svg('g', { class: 'disk-table' }, root);
    svg('rect', { x: 380, y: 96 + i * 52, width: 220, height: 40 }, g);
    svg('text', { x: 396, y: 121 + i * 52 }, g).textContent = t(`${name} table`, `${name}表`);
    return g;
  });
  const link = svg('path', { class: 'mount-link' }, root);
  svg('text', { class: 'fig-note', x: 40, y: 290 }, root).textContent = t('Precedent, different kind of memory: kNN-LM swapped its text database', '先例（另一种记忆）：kNN-LM 换掉文本库');
  svg('text', { class: 'fig-note', x: 40, y: 312 }, root).textContent = t('for books: perplexity 34.8 → 20.5, no training.', '换成书籍：困惑度 34.8 → 20.5，零训练。');
  svg('text', { class: 'fig-note warn-note-text', x: 40, y: 350 }, root).textContent = t('Risk: the backbone was trained with its own table and may reject another.', '风险：主干是和自己那张表一起训练的，未必接受别的表。');
  return views(scene, DOMAINS, i => {
    tables.forEach((g, j) => g.classList.toggle('on', i === j));
    mounted.textContent = t(`${DOMAINS[i]} table`, `${DOMAINS[i]}表`);
    link.setAttribute('d', `M380 ${116 + i * 52}C330 ${116 + i * 52} 330 185 280 185`);
    slot.classList.remove('flash'); void slot.getBBox(); slot.classList.add('flash');
    caption(t('Swap the table, keep the model. Whether this works is an open question.', '换表，不换模型。行不行得通，还是开放的问题。'));
  });
}

// 3.1 Bandwidth of each passage: inside the GPU, RAM to GPU over PCIe 5.0 x16 (one direction), SSD to RAM.
const LINKS = [
  [t('inside the GPU: HBM', 'GPU 内部：显存'), 3350],
  [t('RAM → GPU: PCIe 5.0 x16', '内存 → 显卡：PCIe 5.0 x16'), 63],
  [t('SSD → RAM: PCIe 5.0 SSD', '硬盘 → 内存：PCIe 5.0 固态硬盘'), 14.8],
];

function stairs(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const rows = LINKS.map(([label, bw], i) => {
    const y = 80 + i * 90;
    svg('text', { class: 'bar-label', x: 40, y: y - 10 }, root).textContent = label;
    const pipe = svg('rect', { class: 'pipe', x: 40, y, height: 36 }, root);
    const value = svg('text', { class: 'bar-value', y: y + 24 }, root);
    value.textContent = `${bw.toLocaleString('en')} GB/s${i ? `  ·  ÷${Math.round(3350 / bw)}` : ''}`;
    return { pipe, value, bw };
  });
  return views(scene, [t('true scale', '真实比例'), t('log scale', '对数刻度')], v => {
    rows.forEach(({ pipe, value, bw }) => {
      const w = 420 * (v ? Math.log10(bw) / Math.log10(3350) : bw / 3350);
      pipe.setAttribute('width', Math.max(2, w));
      value.setAttribute('x', 40 + Math.max(2, w) + 10);
    });
    caption(v
      ? t('On a log scale every hop is still a big step down.', '换成对数刻度，每过一道，依然是一大截。')
      : t('At true scale the stairs almost vanish next to the room.', '按真实比例，楼梯窄到几乎看不见。'));
  });
}

// colibri user reports. [label, before, after, unit, profile before, profile after, source]
const ABS = [
  [t('faster SSD', '换更快的盘'), [0.10, t('PCIe 3.0 QLC · 1.51 GB/s', 'PCIe 3.0 QLC · 1.51 GB/s'), t('66% of time on disk', '66% 时间在等硬盘')], [0.28, t('PCIe 5.0 · 8.81 GB/s', 'PCIe 5.0 · 8.81 GB/s'), t('32% disk · 57% compute', '32% 等硬盘 · 57% 计算')], t('words/s · Ryzen 9 9950X · colibri #31', '词/秒 · Ryzen 9 9950X · colibri #31')],
  [t('a second SSD', '加一块盘'), [1, t('one NVMe', '一块 NVMe'), ''], [1.375, t('two independent NVMe', '两块独立的 NVMe'), '+37.5%'], t('relative decode speed · colibri multidisk', '相对解码速度 · colibri 多盘实测')],
  [t('add an RTX 5090', '加一张 RTX 5090'), [0.41, t('CPU (AVX-512)', 'CPU（AVX-512）'), t('36.5 s disk · 24.0 s compute', '36.5 秒等硬盘 · 24.0 秒计算')], [0.41, t('+ CUDA expert tier', '+ CUDA 专家层'), t('gain ≈ 0%', '提升 ≈ 0%')], t('words/s · Ryzen 7 9800X3D · colibri #101', '词/秒 · Ryzen 7 9800X3D · colibri #101')],
];

// 3.2 Three real A/B tests from colibri users.
function abtests(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const title = svg('text', { class: 'fig-label', x: 40, y: 50 }, root);
  const bars = [0, 1].map(i => {
    const y = 90 + i * 110;
    return {
      label: svg('text', { class: 'bar-label', x: 40, y: y - 8 }, root),
      track: svg('rect', { class: 'bar-track', x: 40, y, width: 440, height: 32 }, root),
      bar: svg('rect', { class: `bar-fill ${i ? 'after' : 'before'}`, x: 40, y, width: 0, height: 32 }, root),
      value: svg('text', { class: 'bar-value', y: y + 22 }, root),
      note: svg('text', { class: 'fig-note', x: 40, y: y + 54 }, root),
    };
  });
  return views(scene, ABS.map(([label]) => label), i => {
    const [, before, after, unit] = ABS[i];
    const max = Math.max(before[0], after[0]);
    title.textContent = unit;
    [before, after].forEach(([value, label, note], j) => {
      const b = bars[j], w = 440 * value / max;
      b.label.textContent = label;
      b.bar.setAttribute('width', w);
      b.value.setAttribute('x', 40 + Math.min(w, 440) + 10);
      b.value.textContent = i === 1 ? `×${value}` : value.toFixed(2);
      b.note.textContent = note;
    });
    caption([
      t('Same machine, faster disk: nearly 3×, until computing becomes the limit.', '同一台机器，换更快的盘：快了近 3 倍，直到计算成为瓶颈。'),
      t('A second, independent drive adds bandwidth, and speed follows.', '再加一块独立的盘，带宽变多，速度跟着上去。'),
      t('A faster cook does nothing while the ingredients are stuck on the stairs.', '食材卡在楼梯上，换个更快的厨师也没用。'),
    ][i]);
  });
}

// KTransformers' comparison: PCIe 4.0 x16 at 32 GB/s against dual-socket Xeon DDR5 at 440 GB/s. An expert of 19 MB; a 14 KB input.
const PCIE4 = 32e9, HOST = 440e9, EXPERT = 19e6, INPUT = 14e3;

// 3.3 Carry the weights to the GPU, or carry the input to the weights.
function movecompute(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'move' }, scene);
  svg('rect', { class: 'host', x: 30, y: 60, width: 300, height: 200 }, root);
  svg('text', { class: 'bar-label', x: 46, y: 88 }, root).textContent = t('CPU + RAM', 'CPU + 内存');
  svg('text', { class: 'fig-note', x: 46, y: 108 }, root).textContent = t('reads its RAM at 440 GB/s', '读自己的内存：440 GB/s');
  svg('rect', { class: 'expert-block', x: 60, y: 140, width: 110, height: 90 }, root);
  svg('text', { class: 'fig-note', x: 115, y: 190, 'text-anchor': 'middle' }, root).textContent = t('expert 19 MB', '专家 19 MB');
  svg('rect', { class: 'gpu-box', x: 450, y: 60, width: 160, height: 200 }, root);
  svg('text', { class: 'bar-label', x: 466, y: 88 }, root).textContent = 'GPU';
  svg('path', { class: 'pcie', d: 'M330 185H450' }, root);
  svg('text', { class: 'fig-note', x: 390, y: 160, 'text-anchor': 'middle' }, root).textContent = 'PCIe 4.0';
  svg('text', { class: 'fig-note', x: 390, y: 176, 'text-anchor': 'middle' }, root).textContent = '32 GB/s';
  const mover = svg('rect', { class: 'mover' }, root);
  const big = svg('text', { class: 'big-number', x: 30, y: 320 }, root);
  const note = svg('text', { class: 'fig-note', x: 30, y: 348 }, root);
  const ms = s => (s >= 1e-3 ? `${(s * 1e3).toFixed(2)} ms` : `${(s * 1e6).toFixed(1)} µs`);
  return views(scene, [t('move the weights', '搬权重'), t('move the compute', '搬计算')], v => {
    root.dataset.view = v;
    if (v) Object.entries({ x: 438, y: 179, width: 12, height: 12 }).forEach(([k, val]) => mover.setAttribute(k, val));
    else Object.entries({ x: 180, y: 160, width: 60, height: 50 }).forEach(([k, val]) => mover.setAttribute(k, val));
    mover.classList.remove('go'); void mover.getBBox(); mover.classList.add('go');
    big.textContent = v
      ? t(`${ms(EXPERT / HOST)} per expert`, `每个专家 ${ms(EXPERT / HOST)}`)
      : t(`${ms(EXPERT / PCIE4)} per expert`, `每个专家 ${ms(EXPERT / PCIE4)}`);
    note.textContent = v
      ? t(`14 KB input crosses in ${ms(INPUT / PCIE4)}; expert read in place`, `14 KB 的输入过 PCIe 只要 ${ms(INPUT / PCIE4)}；专家就地读`)
      : t('19 MB over PCIe 4.0, every time the expert is needed', '每次要用这个专家，19 MB 都要过一遍 PCIe 4.0');
    caption(v
      ? t('Send the small thing across the narrow passage, and compute where the big thing lives.', '让小的东西过窄通道，在大的东西所在的地方计算。')
      : t('The big thing crosses the narrowest passage, again and again.', '大的东西一遍又一遍地挤过最窄的通道。'));
  });
}

// 3.4 New passages between tiers.
const future = timeline([
  ['2022', 'NVLink-C2C', t('Grace Hopper links CPU and GPU at 900 GB/s, counted in both directions, about 7× PCIe 5.0.', 'Grace Hopper 把 CPU 和 GPU 连在一起，每秒 900 GB（双向合计），约为 PCIe 5.0 的 7 倍。')],
  ['2023', 'BaM', t('The GPU issues reads to SSDs itself, bypassing the CPU’s storage stack.', 'GPU 自己向固态硬盘发读请求，绕开 CPU 的存储软件栈。')],
  ['2026', t('High Bandwidth Flash', '高带宽闪存 HBF'), t('Flash stacked beside the GPU: 512 GB and 1.6 TB/s per stack, first samples planned for 2027.', '把闪存堆在 GPU 旁边：每堆 512 GB、每秒 1.6 TB，首批样品计划于 2027 年。')],
], t('Each one widens a passage between tiers.', '每一项，都是在拓宽层与层之间的通道。'));

const [one, two, three] = document.querySelectorAll('.scrolly-block');
scrolly(one, [ladder, kitchens, heat]);
scrolly(two, [pinch, prefetch, scale, swap]);
scrolly(three, [stairs, abtests, movecompute, future]);
