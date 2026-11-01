import { t, html } from './util.js';

// Every published article, newest first. Each lives at /research/<slug>/.
export const ARTICLES = [];

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
