import '/js/page.js';
import { t } from '/js/util.js';
import { scrolly } from '/js/scrolly.js';
import { drift, scores, coverage, ffnDrop, rsqBars, swapBars } from './figs.js';

document.title = t('Bolting a memory table onto a trained model — Infer', '给训练好的模型后装一张记忆表 — Infer');
const data = await (await fetch('./data.json')).json();
await document.fonts.ready;

const using = fig => (scene, caption) => fig(scene, caption, data);
const [hashed, codebook, repair, counted] = document.querySelectorAll('.scrolly-block');

scrolly(hashed, [
  using(drift([
    { label: t('1M rows', '100 万行'), runs: ['engram'], caption: t('The big hashed table helps at first, then gets worse at every check.', '哈希大表一开始有帮助，之后每次检查都更差。') },
    { label: t('+ 200k rows', '+ 20 万行'), runs: ['engram', 'hash200k'], caption: t('A table five times smaller drifts more slowly, in the same direction.', '小五倍的表漂移得慢一些，方向一样。') },
    { label: '+ LoRA', runs: ['engram', 'hash200k', 'lora8'], caption: t('LoRA, trained on the same data, stays put.', '用同样数据训练的 LoRA，一直很稳。') },
  ])),
  using(scores([{ run: 'engram' }, { run: 'hash200k' }, { run: 'lora8' }], [
    t('On held-out text the big table ends worse than having no table.', '在留出集上，大表最后比不装表还差。'),
    t('On different text, both hashed tables are worse.', '换一类文本，两张哈希表都更差。'),
    t('On facts, the big table loses about two points, as does LoRA.', '在事实问答上，大表掉了约两个百分点，LoRA 也是。'),
  ])),
  using(scores([{ run: 'engram' }, { run: 'engram', random: true }], [
    t('On held-out text, the real rows help a little over random ones.', '在留出集上，真实的行比随机的行好一点。'),
    t('On different text, the real rows do more harm than random ones.', '换一类文本，真实的行比随机的行危害更大。'),
    t('On facts, both lose ground.', '在事实问答上，两者都退步了。'),
  ])),
]);

scrolly(codebook, [
  using(coverage),
  using(drift([
    { label: t('codebook', '码表'), runs: ['hash200k', 'dict50'], caption: t('With fewer trainable numbers than the hashed table, the codebook stays flat.', '码表的参数比哈希表少，曲线却一直是平的。') },
    { label: t('+ looser', '+ 放宽门槛'), runs: ['hash200k', 'dict50', 'dict20', 'dict20_lr5'], caption: t('A looser codebook drifts slightly, more so with a five-fold learning rate.', '放宽门槛的码表略有漂移，学习率调高五倍漂得更多。') },
    { label: '+ LoRA', runs: ['hash200k', 'dict50', 'dict20', 'dict20_lr5', 'lora8'], caption: t('LoRA goes lower on held-out text.', '在留出集上，LoRA 降得更低。') },
  ])),
  using(scores([{ run: 'dict50' }, { run: 'dict20' }, { run: 'lora8' }], [
    t('The codebook lowers held-out perplexity by 2.4%; LoRA by 4.3%.', '码表把留出集困惑度降了 2.4%，LoRA 降了 4.3%。'),
    t('On different text, all three are within about one percent of no table.', '换一类文本，三者和不装表的差距都在 1% 上下。'),
    t('On facts, the codebooks stay within the noise; LoRA falls 1.9 points.', '在事实问答上，码表都在噪声范围内，LoRA 掉了 1.9 个百分点。'),
  ])),
  using(scores([{ run: 'dict50' }, { run: 'dict50', random: true }], [
    t('Random rows erase the held-out gain: it comes from what the rows hold.', '换成随机的行，留出集上的收益就没了：收益来自行里存的东西。'),
    t('On different text, real and random rows are level.', '换一类文本，真实的行和随机的行打成平手。'),
    t('On facts, the gap is within the noise.', '在事实问答上，差距在噪声范围内。'),
  ])),
]);

scrolly(repair, [
  using(ffnDrop),
  using(drift([
    { label: t('blocks 4–7 removed', '拿掉第 4–7 块'), runs: ['p2_heavy_dict', 'p2_heavy_lora'], caption: t('Unrepaired, perplexity is 85.7. Both repairs pull it back near 20; LoRA further.', '不修复时困惑度是 85.7。两种修复都把它拉回到 20 附近，LoRA 拉得更低。') },
    { label: t('blocks 4–5 removed', '拿掉第 4–5 块'), runs: ['p2_mid_dict', 'p2_mid_lora'], caption: t('Unrepaired, perplexity is 36.8. Again LoRA gets closer to the intact model.', '不修复时困惑度是 36.8。LoRA 同样更接近完整的模型。') },
  ], { lo: 15, hi: 22.5, ticks: [16, 18, 20, 22], steps: [1000, 2000, 3000, 4000, 5000], baseName: t('intact model', '完整模型') })),
  using(scores([{ run: 'p2_heavy_dict' }, { run: 'p2_heavy_dict', random: true }, { run: 'p2_heavy_lora' }], [
    t('Blocks 4–7 removed. Against the intact model, LoRA is closer; random rows make the codebook’s repair clearly worse.', '拿掉第 4–7 块。和完整的模型比，LoRA 更接近；换成随机的行，码表的修复明显变差。'),
    t('On different text, the same order.', '换一类文本，次序一样。'),
    t('On facts, both repairs recover about half, level with each other.', '在事实问答上，两种修复都只找回一半左右，彼此持平。'),
  ], { byRun: true, baseName: t('intact model', '完整模型') })),
  using(scores([{ run: 'p2_mid_dict' }, { run: 'p2_mid_dict', random: true }, { run: 'p2_mid_lora' }], [
    t('Blocks 4–5 removed. LoRA is closer to the intact model on held-out text.', '拿掉第 4–5 块。在留出集上，LoRA 更接近完整的模型。'),
    t('On different text, LoRA again.', '换一类文本，仍是 LoRA 更好。'),
    t('On facts, the codebook is ahead in this run: 13.30% against 10.55%.', '在事实问答上，这次实验里码表领先：13.30% 对 10.55%。'),
  ], { byRun: true, baseName: t('intact model', '完整模型') })),
]);

scrolly(counted, [
  using(rsqBars),
  using(swapBars),
  using(drift([
    { label: t('blocks 4–7 removed', '拿掉第 4–7 块'), runs: ['p2_heavy_dict', 'p2_heavy_lora', 'p3_mean_lora'], caption: t('Starting from the counted table, LoRA is ahead of LoRA alone from the first checkpoint.', '从统计表出发，LoRA 在第一个检查点就已经领先单独的 LoRA。') },
  ], { lo: 15, hi: 22.5, ticks: [16, 18, 20, 22], steps: [1000, 2000, 3000, 4000, 5000], baseName: t('intact model', '完整模型') })),
  using(scores([{ run: 'p3_mean' }, { run: 'p3_mean_lora' }, { run: 'p2_heavy_lora' }, { run: 'p2_heavy_dict' }], [
    t('Blocks 4–7 removed. The counted table plus LoRA is closest to the intact model.', '拿掉第 4–7 块。统计表加 LoRA 最接近完整的模型。'),
    t('On different text, the same.', '换一类文本，也是如此。'),
    t('On facts it recovers the most: 13.45%, against 10.45% for LoRA alone.', '在事实问答上它找回得最多：13.45%，单独的 LoRA 是 10.45%。'),
  ], { byRun: true, baseName: t('intact model', '完整模型') })),
]);
