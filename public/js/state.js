import { t, reduced, svg, html, views } from './util.js';
import { timeline } from './chip.js';

const MILESTONES = [
  ['2022.05', 'FlashAttention', t('Attention computed in on-chip memory instead of round trips to HBM: 3× faster end to end on GPT-2.', '把注意力留在芯片上算，少跑显存：GPT-2 端到端快 3 倍。')],
  ['2022.11', t('Speculative decoding', '投机解码'), t('A small model guesses, the big one checks: identical output, 2–3× faster.', '小模型先猜、大模型验证：输出完全不变，快 2～3 倍。')],
  ['2023.09', 'vLLM · PagedAttention', t('The KV cache managed in pages, like an operating system manages memory: almost no waste, 2–4× the throughput.', '像操作系统分页那样管理 KV cache：几乎不浪费显存，吞吐提高 2～4 倍。')],
  ['2023.12', 'SGLang · RadixAttention', t('Requests that share a beginning share its KV cache: up to 6.4× the throughput.', '开头相同的请求共用 KV cache：吞吐最高提高 6.4 倍。')],
  ['2024.01', 'DistServe', t('Prefill and decode moved onto separate machines.', '预填充和解码拆到不同的机器上。')],
  ['2024.05', 'DeepSeek-V2 · MLA', t('A new attention design cuts the KV cache by 93.3%.', '新的注意力设计，把 KV cache 压缩了 93.3%。')],
  ['2024.09', 'OpenAI o1', t('Thinking longer at inference buys better answers. Inference compute becomes a lever.', '推理时多想一会儿，答得更好。推理算力成了新的杠杆。')],
  ['2025.06', 'NVFP4', t('4-bit numbers with small-block scaling, computed directly on Blackwell.', '4 位数字配上小块缩放，在 Blackwell 上直接计算。')],
  ['2025.09', t('Batch-invariant kernels', '批次不变的算子'), t('The same prompt, run 1000 times, gives one answer.', '同一个提示词跑 1000 次，只有一个答案。')],
];

// 6.1 Milestones in inference.
export const milestones = timeline(MILESTONES, t('From getting models to run, to running them well.', '从“跑起来”，到“跑得好”。'));

// [setting, total throughput, speed per user], both relative and schematic.
const SETTINGS = [
  [t('short prompts · 256 users', '短问短答 · 256 人一起'), 1, 0.22],
  [t('long documents · 8 users', '长文档 · 8 人一起'), 0.3, 0.55],
  [t('one user chatting', '一个人聊天'), 0.07, 1],
];

// 6.2 One system, one chip, three test settings, three very different headline numbers.
export function settings(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  svg('text', { class: 'fig-label', x: 40, y: 50 }, root).textContent = t('SAME SYSTEM · SAME CHIP', '同一套系统 · 同一块卡');
  const setting = svg('text', { class: 'big-number', x: 40, y: 100 }, root);
  const bars = [[t('words per second, all users', '每秒总共多少词'), 'total'], [t('speed each user feels', '每个人感受到的速度'), 'each']].map(([label, kind], i) => {
    const y = 160 + i * 90;
    svg('text', { class: 'bar-label', x: 40, y: y - 10 }, root).textContent = label;
    svg('rect', { class: 'bar-track', x: 40, y, width: 560, height: 30 }, root);
    return svg('rect', { class: `bar-fill ${kind}`, x: 40, y, width: 0, height: 30 }, root);
  });
  svg('text', { class: 'fig-note', x: 40, y: 360 }, root).textContent = t('schematic: bar lengths show the pattern, not measurements', '示意：条的长短只表示规律，不是实测');

  return views(scene, SETTINGS.map(([label]) => label.split(' · ')[0]), i => {
    const [label, total, each] = SETTINGS[i];
    setting.textContent = label;
    bars[0].setAttribute('width', 560 * total);
    bars[1].setAttribute('width', 560 * each);
    caption(t('Change the settings and the headline number moves by several times.', '换一种设置，“每秒多少词”就能差出好几倍。'));
  });
}

// [label, speed, accuracy, label offset], schematic positions on a 0–1 square.
const CONFIGS = [
  [t('16 bits', '16 位'), 0.22, 0.92],
  ['FP8', 0.45, 0.91, -6, 22],
  [t('guess ahead', '投机解码'), 0.52, 0.92],
  ['INT4', 0.72, 0.84],
  [t('smaller model', '换小模型'), 0.9, 0.58],
];

// 6.3 Speed and accuracy on one chart: one axis at a time hides the trade-off.
export function tradeoff(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400', class: 'tradeoff' }, scene);
  const x0 = 90, x1 = 590, y0 = 320, y1 = 50;
  const X = v => x0 + (x1 - x0) * v, Y = v => y0 - (y0 - y1) * v;
  svg('path', { class: 'axis', d: `M${x0} ${y1}V${y0}H${x1}` }, root);
  svg('text', { class: 'fig-note', x: x1, y: y0 + 24, 'text-anchor': 'end' }, root).textContent = t('faster →', '更快 →');
  svg('text', { class: 'fig-note', x: x0 - 12, y: y1 + 4, 'text-anchor': 'end' }, root).textContent = t('more right', '更准');
  svg('path', { class: 'frontier', d: `M${X(0.22)} ${Y(0.92)}L${X(0.52)} ${Y(0.92)}L${X(0.72)} ${Y(0.84)}L${X(0.9)} ${Y(0.58)}` }, root);
  const points = CONFIGS.map(([label, , , dx = 10, dy = -10]) => {
    const g = svg('g', { class: 'config' }, root);
    svg('circle', { r: 6 }, g);
    svg('text', { x: dx, y: dy }, g).textContent = label;
    return g;
  });
  svg('text', { class: 'fig-note', x: x0, y: 372 }, root).textContent = t('schematic: positions show the idea, not measurements', '示意：位置只表达思路，不是实测');

  const LINES = [
    t('Speed alone: the smaller model looks best.', '只看速度：换小模型最好。'),
    t('Accuracy alone: nothing beats 16 bits.', '只看准确度：谁都比不过 16 位。'),
    t('Both together: the real choices lie along the edge.', '两个一起看：真正值得选的，都在这条边上。'),
  ];
  return views(scene, [t('speed only', '只看速度'), t('accuracy only', '只看准确度'), t('both', '一起看')], i => {
    root.dataset.view = i;
    CONFIGS.forEach(([, s, a], j) => points[j].setAttribute('transform', `translate(${i === 1 ? x0 : X(s)} ${i === 0 ? y0 : Y(a)})`));
    caption(LINES[i]);
  });
}

const CHIP_ROWS = [t('NVIDIA', '英伟达'), 'AMD', t('Huawei Ascend', '华为昇腾'), t('other domestic chips', '其他国产芯片')];
const MODEL_COLS = [t('small dense', '稠密小模型'), t('large dense', '稠密大模型'), t('large MoE', 'MoE 大模型')];

// 6.4 The grid we want to fill: every chip × model, measured the same way.
export function gaps(scene, caption) {
  const box = html('div', 'fit', scene);
  const grid = html('div', 'fit-grid gaps mono', box);
  html('span', '', grid);
  MODEL_COLS.forEach(name => { html('span', 'fit-head', grid).textContent = name; });
  const cells = [];
  CHIP_ROWS.forEach(name => {
    html('span', 'fit-chip', grid).textContent = name;
    MODEL_COLS.forEach(() => { const cell = html('span', 'fit-cell gap', grid); cell.textContent = '?'; cells.push(cell); });
  });
  html('p', 'fit-note mono', box).textContent = t('Each cell: speed, memory and accuracy, measured with one ruler.', '每一格：速度、显存、准确度，用同一把尺子量。');

  let timer = 0, n = 0;
  const render = () => cells.forEach((cell, i) => {
    cell.classList.toggle('todo', i < n);
    cell.textContent = i < n ? t('to measure', '待测') : '?';
  });
  return {
    enter() {
      caption(t('What runs is documented. How well it runs, comparably, mostly is not.', '能不能跑，有文档；跑得怎么样，缺少能放在一起比的数据。'));
      if (reduced.matches) { n = cells.length; return render(); }
      n = 0;
      render();
      timer = setInterval(() => { n++; render(); if (n === cells.length) clearInterval(timer); }, 220);
    },
    leave() { clearInterval(timer); },
  };
}
