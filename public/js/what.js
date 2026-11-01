import { t, reduced, svg, html, random } from './util.js';
import { STEPS } from './stream.js';

const QUESTIONS = [
  ['Why is the sky blue?', '天空为什么是蓝色的？'], ['Fix this bug', '这段代码哪里错了'], ['Draft an email', '帮我写封邮件'],
  ['Summarise this PDF', '总结一下这份 PDF'], ['Translate to French', '翻译成法语'], ['Plan a trip to Kyoto', '规划一次京都旅行'],
].map(([en, cn]) => t(en, cn));

// 1.1 Two rows on one timeline: training is a single block, inference is one tick per question that never stops.
export function trainOnce(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const x0 = 140, launch = 280, x1 = 600, axis = 330;
  svg('path', { class: 'axis', d: `M${x0} ${axis}H${x1}` }, root);
  svg('text', { class: 'fig-note', x: x1, y: axis + 22, 'text-anchor': 'end' }, root).textContent = t('time →', '时间 →');
  svg('path', { class: 'divider', d: `M${launch} 62V${axis}` }, root);
  svg('text', { class: 'fig-note', x: launch, y: 52, 'text-anchor': 'middle' }, root).textContent = t('launch', '上线');

  svg('text', { class: 'row-name', x: 30, y: 126 }, root).textContent = t('Training', '训练');
  svg('rect', { class: 'train-block', x: x0, y: 104, width: launch - x0, height: 34 }, root);
  svg('text', { class: 'bar-label', x: x0 + 12, y: 126 }, root).textContent = t('months', '几个月');
  svg('path', { class: 'idle', d: `M${launch} 121H${x1}` }, root);
  svg('text', { class: 'fig-note', x: launch + 14, y: 154 }, root).textContent = t('done. never runs again', '结束，不再进行');
  svg('text', { class: 'fig-label', x: x1, y: 92, 'text-anchor': 'end' }, root).textContent = t('1 TIME', '1 次');

  svg('text', { class: 'row-name', x: 30, y: 272 }, root).textContent = t('Inference', '推理');
  svg('text', { class: 'fig-note', x: (x0 + launch) / 2, y: 272, 'text-anchor': 'middle' }, root).textContent = t('not live', '还没上线');
  const counter = svg('text', { class: 'fig-label alt', x: x1, y: 212, 'text-anchor': 'end' }, root);
  const ask = svg('text', { class: 'ask', y: 232 }, root);
  svg('text', { class: 'fig-note', x: x0, y: axis + 22 }, root).textContent = t('each tick = one question answered', '每一根竖线 = 回答了一次提问');

  const next = random(20261102);
  const ticks = Array.from({ length: 240 }, () => launch + 6 + next() * (x1 - launch - 8)).sort((a, b) => a - b)
    .map(x => svg('line', { class: 'request', x1: x, x2: x, y1: 300, y2: 300 - 22 - next() * 26 }, root));
  let shown = 0, timer = 0;
  const render = () => {
    ticks.forEach((tick, i) => tick.classList.toggle('on', i < shown));
    counter.textContent = t(`${shown.toLocaleString('en')} TIMES AND COUNTING`, `${shown} 次，还在增加`);
    if (shown && shown % 24 === 0) {
      ask.textContent = `“${QUESTIONS[shown / 24 % QUESTIONS.length]}”`;
      ask.setAttribute('x', Math.min(+ticks[shown - 1].getAttribute('x1'), x1 - 150));
    }
    caption(shown < ticks.length
      ? t('Training happened once. After launch, every question runs the model again.', '训练只发生了一次。上线以后，每来一个问题，模型就要再跑一遍。')
      : t('Real services see far too many questions to draw.', '真实的服务里，这些竖线多到画不下。'));
  };

  return {
    enter() {
      if (reduced.matches) { shown = ticks.length; return render(); }
      shown = 0;
      render();
      timer = setInterval(() => { if (shown < ticks.length) { shown++; render(); } else clearInterval(timer); }, 45);
    },
    leave() { clearInterval(timer); },
  };
}

// 1.2 The decoding loop: read everything, score the next word, append the pick, repeat.
export function loop(scene, caption) {
  const box = html('div', 'loop', scene);
  const seq = html('p', 'loop-seq', box);
  const model = html('div', 'loop-model mono', box);
  const cands = html('div', 'loop-cands mono', box);
  const button = html('button', 'scene-btn mono', scene);
  button.type = 'button';
  button.textContent = t('Step →', '下一步 →');
  const prompt = t('Why is the sky blue?', '天空为什么是蓝色的？');

  let n = 0, timer = 0, phase = 0;
  const render = () => {
    seq.replaceChildren();
    html('span', 'ltok prompt', seq).textContent = prompt;
    STEPS.slice(0, n).forEach(([word], i) => {
      html('span', `ltok gen${i === n - 1 && phase === 0 ? ' fresh' : ''}`, seq).textContent = word;
    });
    html('span', 'caret', seq);
  };
  const score = () => {
    const [word, candidates] = STEPS[n];
    model.textContent = t('↓ read everything so far · score every possible next word', '↓ 读完已有的全部文字 · 给每个可能的下一个词打分');
    cands.replaceChildren();
    for (const [candidate, p] of candidates) {
      const row = html('div', `choice-row${candidate === word.trim() ? ' picked' : ''}`, cands);
      html('span', 'choice-word', row).textContent = candidate;
      html('span', 'choice-bar', row).style.setProperty('--p', p);
      html('span', 'choice-p', row).textContent = `${Math.round(p * 100)}%`;
    }
    caption(t(`Loop ${n + 1}: pick “${word.trim()}”, append it, and read everything again.`, `第 ${n + 1} 圈：选出“${word}”，接到后面，再从头读一遍。`));
  };
  const advance = () => {
    if (phase === 0) {
      if (n === STEPS.length) { n = 0; render(); }
      score();
      phase = 1;
    } else {
      n++;
      phase = 0;
      render();
      if (n === STEPS.length) {
        model.textContent = t('↓ the answer is complete', '↓ 回答完成');
        cands.replaceChildren();
        caption(t(`${STEPS.length} loops, ${STEPS.length} words. Long answers take thousands.`, `${STEPS.length} 圈，${STEPS.length} 个词。长回答要转几千圈。`));
      }
    }
  };
  button.addEventListener('click', () => { clearInterval(timer); advance(); });

  return {
    enter() {
      if (reduced.matches) { n = 3; phase = 0; render(); score(); phase = 1; return; }
      n = 0; phase = 0; render(); advance();
      timer = setInterval(advance, 900);
    },
    leave() { clearInterval(timer); },
  };
}

// Llama 3 8B: 32 layers × 8 KV heads × 128 dims × (K and V) × 2 bytes per token; 8.03B parameters in 16 bits.
const KV_PER_TOKEN = 32 * 8 * 128 * 2 * 2;
const WEIGHTS_GB = 8.03e9 * 2 / 1e9;
const GPU_GB = 80;
const gb = v => (v < 1 ? v.toFixed(2) : v.toFixed(1));

// 1.3 The KV cache grows with the conversation and competes with the weights for GPU memory.
export function kvcache(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const x0 = 40, width = 560, scale = width / GPU_GB, y = 150;
  svg('text', { class: 'fig-label', x: x0, y: y - 24 }, root).textContent = t(`ONE ${GPU_GB} GB GPU · THE MODEL TAKES ${gb(WEIGHTS_GB)} GB`, `一块 ${GPU_GB} GB 的显卡 · 模型占 ${gb(WEIGHTS_GB)} GB`);
  svg('rect', { class: 'gpu', x: x0, y, width, height: 64 }, root);
  svg('rect', { class: 'weights', x: x0, y, width: WEIGHTS_GB * scale, height: 64 }, root);
  svg('text', { class: 'bar-label', x: x0 + 10, y: y + 37 }, root).textContent = t('model', '模型');
  const kv = svg('rect', { class: 'kv', x: x0 + WEIGHTS_GB * scale, y, height: 64 }, root);
  const others = svg('rect', { class: 'kv-others', y, height: 64 }, root);
  const kvLabel = svg('text', { class: 'bar-label kv-label', y: y + 98 }, root);
  const othersLabel = svg('text', { class: 'bar-label others-label', y: y + 37, 'text-anchor': 'middle' }, root);
  const fit = svg('text', { class: 'big-number', x: x0, y: 330 }, root);
  const fitNote = svg('text', { class: 'fig-note', x: x0, y: 356 }, root);

  const control = html('label', 'untangle-control mono', scene);
  control.append(t('1K words', '1K 词'));
  const slider = html('input', '', control);
  Object.assign(slider, { type: 'range', min: 0, max: 1000, value: 250 });
  slider.setAttribute('aria-label', t('Conversation length', '对话长度'));
  control.append('128K');

  const draw = () => {
    const tokens = Math.round(1024 * 128 ** (slider.value / 1000));
    const size = tokens * KV_PER_TOKEN / 1e9;
    const free = GPU_GB - WEIGHTS_GB;
    const fits = Math.floor(free / size);
    const w = Math.min(size, free) * scale;
    kv.setAttribute('width', w);
    others.setAttribute('x', x0 + WEIGHTS_GB * scale + w);
    others.setAttribute('width', Math.max(0, Math.min(fits - 1, 9999) * size * scale));
    kvLabel.setAttribute('x', x0 + WEIGHTS_GB * scale);
    kvLabel.textContent = t(`↑ one conversation: ${gb(size)} GB`, `↑ 一段对话：${gb(size)} GB`);
    othersLabel.setAttribute('x', x0 + WEIGHTS_GB * scale + w + Math.max(0, fits - 1) * size * scale / 2);
    othersLabel.textContent = fits > 1 ? t(`+ ${fits - 1} more`, `+ 另外 ${fits - 1} 段`) : '';
    fit.textContent = t(`${fits.toLocaleString('en')} conversations at once`, `同时只装得下 ${fits.toLocaleString('zh-CN')} 段对话`);
    fitNote.textContent = t(`each ${tokens.toLocaleString('en')} words long, with nothing else in memory`, `每段 ${tokens.toLocaleString('zh-CN')} 个词，且不算其他任何开销`);
    caption(t(`At ${Math.round(tokens / 1024)}K words, the notes for one conversation take ${gb(size)} GB.`, `对话长到 ${Math.round(tokens / 1024)}K 个词时，一段对话的笔记就要占 ${gb(size)} GB。`));
  };
  slider.addEventListener('input', draw);

  return { enter: draw, leave() {} };
}

const LAYERS = [
  [t('App / agent', '应用 / Agent'), t('What people type into. It sends the request and acts on the answer.', '人们打字的地方。它发出请求，再根据回答采取行动。')],
  [t('API', 'API'), t('The door to the outside world: keys, quotas and the request format.', '面向外界的大门：密钥、配额和请求格式都在这里。')],
  [t('Scheduler', '调度器'), t('Packs many users’ requests into one batch so the GPU never idles.', '把许多人的请求拼成一批，让 GPU 一刻不闲。')],
  [t('Inference engine', '推理引擎'), t('vLLM, SGLang and the like: runs the math and manages the KV cache.', 'vLLM、SGLang 之类：执行计算，管理 KV cache。')],
  [t('GPU + model file', 'GPU + 模型文件'), t('The weights loaded into GPU memory. The only part that came from training.', '加载进显存的权重。整套系统里只有这一层来自训练。')],
];

// 1.4 The serving stack between a model file and the app.
export function stack(scene, caption) {
  const root = svg('svg', { viewBox: '0 0 640 400' }, scene);
  const rows = LAYERS.map(([label], i) => {
    const g = svg('g', { class: 'layer-row' }, root);
    const y = 30 + i * 70;
    svg('rect', { x: 120, y, width: 400, height: 52 }, g);
    svg('text', { x: 140, y: y + 31 }, g).textContent = label;
    svg('text', { class: 'layer-no', x: 500, y: y + 31, 'text-anchor': 'end' }, g).textContent = `L${LAYERS.length - i}`;
    return g;
  });
  svg('path', { class: 'wire', d: 'M560 30V372' }, root);
  svg('path', { class: 'wire', d: 'M80 372V30' }, root);
  svg('text', { class: 'fig-note', x: 572, y: 30 }, root).textContent = t('request', '请求');
  svg('text', { class: 'fig-note', x: 68, y: 30, 'text-anchor': 'end' }, root).textContent = t('answer', '回答');
  if (!reduced.matches) {
    for (const [d, begin] of [['M560 30V372', 0], ['M80 372V30', 1.1]]) {
      const dot = svg('circle', { class: 'pulse', r: 3 }, root);
      svg('animateMotion', { dur: '2.2s', path: d, begin: `${begin}s`, repeatCount: 'indefinite' }, dot);
    }
  }
  root.pauseAnimations();

  let current = -1, timer = 0, hovering = false;
  const select = i => {
    rows[current]?.classList.remove('on');
    current = i;
    rows[i].classList.add('on');
    caption(LAYERS[i][1]);
  };
  rows.forEach((g, i) => {
    g.addEventListener('pointerenter', () => { hovering = true; select(i); });
    g.addEventListener('click', () => select(i));
    g.addEventListener('pointerleave', () => { hovering = false; });
  });

  return {
    enter() {
      root.unpauseAnimations();
      select(Math.max(current, 0));
      if (!reduced.matches) timer = setInterval(() => hovering || select((current + 1) % rows.length), 2400);
    },
    leave() { root.pauseAnimations(); clearInterval(timer); },
  };
}
