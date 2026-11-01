import { t, html } from './util.js';

// Every published article, newest first. Each lives at /research/<slug>/.
export const ARTICLES = [
  {
    slug: 'hetero',
    date: '2026-11-02',
    title: ['Heterogeneous inference: putting every tier of storage to work', '异构推理：把每一层存储都用起来'],
    summary: ['GPU memory, RAM and disk are all storage at different speeds. How to place a model across them, whether slow space can buy time, and why the passages between tiers are the real bottleneck.', '显存、内存、硬盘都是存储，只是快慢不同。模型怎么分住在各层，慢的空间能不能换来时间，以及为什么层与层之间的通道才是真正的瓶颈。'],
  },
];

export function renderIndex(list) {
  if (!ARTICLES.length) {
    const empty = html('li', 'article-empty', list);
    html('span', 'mono', empty).textContent = t('IN PREPARATION', '准备中');
    html('p', '', empty).textContent = t('Our first article is being written. It will appear here.', '第一篇文章正在撰写中，完成后会出现在这里。');
    return;
  }
  for (const { slug, date, title, summary } of ARTICLES) {
    const link = html('a', 'article-row', html('li', '', list));
    link.href = `/research/${slug}/`;
    html('span', 'article-date mono', link).textContent = date;
    html('h3', '', link).textContent = t(...title);
    html('p', '', link).textContent = t(...summary);
    html('span', 'article-go mono', link).textContent = t('Read →', '阅读 →');
  }
}
