import './page.js';
import { t } from './util.js';
import { scrolly } from './scrolly.js';
import { stream } from './stream.js';
import { trainOnce, loop, kvcache, stack } from './what.js';
import { meter, think, agent } from './why.js';
import { speed, quant, repeat, arch, fit } from './craft.js';
import { shard, formats, fusion, hierarchy, generations } from './chip.js';
import { milestones, settings, tradeoff, gaps } from './state.js';
import { renderIndex } from './articles.js';
import { exposed, copied, inject, guard, hijack } from './risk.js';

document.title = t('Infer — Inference · sec4.si', 'Infer — 推理 · sec4.si');
stream(document.getElementById('specimen'));
renderIndex(document.querySelector('.article-list'));

// Chapter figures are measured on build, so wait for the fonts first.
await document.fonts.ready;

scrolly(document.getElementById('what'), [trainOnce, loop, kvcache, stack]);
scrolly(document.getElementById('why'), [meter, think, agent]);
scrolly(document.getElementById('craft'), [speed, quant, repeat, arch, fit]);
scrolly(document.getElementById('chip'), [shard, formats, fusion, hierarchy, generations]);
scrolly(document.getElementById('risk'), [exposed, copied, inject, guard, hijack]);
scrolly(document.getElementById('state'), [milestones, settings, tradeoff, gaps]);
