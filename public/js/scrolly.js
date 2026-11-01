import { t, html } from './util.js';

// Steps on the left drive the sticky figure on the right; each figure is entered and left as its step crosses the middle of the screen.
export function scrolly(section, factories) {
  const steps = [...section.querySelectorAll('.step')];
  const figure = section.querySelector('.stage-fig');
  const holder = section.querySelector('.stage-scenes');
  const scenes = factories.map(factory => {
    const el = html('div', 'scene', holder);
    const caption = html('p', 'scene-caption mono', el);
    return { el, ...factory(el, text => { caption.textContent = text; }) };
  });
  let current = -1, inView = false;

  const show = i => {
    if (i === current) return;
    if (current >= 0) {
      if (inView) scenes[current].leave();
      scenes[current].el.classList.remove('is-active');
      steps[current].classList.remove('is-active');
    }
    current = i;
    scenes[i].el.classList.add('is-active');
    steps[i].classList.add('is-active');
    figure.textContent = `${t('FIG', '图')} ${section.dataset.chapter}.${i + 1}`;
    if (inView) scenes[i].enter();
  };
  const band = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) show(steps.indexOf(entry.target));
  }, { rootMargin: '-55% 0px -44% 0px' });
  steps.forEach(step => band.observe(step));
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting === inView) return;
    inView = entry.isIntersecting;
    inView ? scenes[current].enter() : scenes[current].leave();
  }).observe(section.querySelector('.stage'));
  show(0);
}

// A single figure that stands in the text on its own, entered while it is on screen.
export function inline(stage, factory) {
  const el = html('div', 'scene is-active', stage.querySelector('.stage-scenes'));
  const caption = html('p', 'scene-caption mono', el);
  const scene = factory(el, text => { caption.textContent = text; });
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? scene.enter() : scene.leave()), { threshold: 0.4 }).observe(stage);
}
