const qs = selector => document.querySelector(selector);
const qsa = selector => [...document.querySelectorAll(selector)];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const header = qs('.site-header');
const scrollTop = qs('.scroll-top');
const menuToggle = qs('.menu-toggle');
const siteNav = qs('.site-nav');
const cursor = qs('.cursor');

if (menuToggle) menuToggle.type = 'button';
if (scrollTop) scrollTop.type = 'button';

window.addEventListener('load', () => {
  document.body.classList.add('is-loaded');
  const loaderDelay = prefersReducedMotion ? 0 : 450;
  setTimeout(() => qs('.preloader')?.classList.add('hidden'), loaderDelay);
  updateScrollEffects();
});

let scrollTicking = false;
const requestScrollUpdate = () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    updateScrollEffects();
    scrollTicking = false;
  });
};

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', handleResize);

function updateScrollEffects() {
  const scrolled = window.scrollY > 40;
  header?.classList.toggle('scrolled', scrolled);
  scrollTop?.classList.toggle('show', window.scrollY > 500);
  parallax();
  updateTextReveal();
}

menuToggle?.addEventListener('click', () => {
  const open = siteNav?.classList.toggle('open') || false;
  setMenuState(open);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenuState(false);
});

qsa('.site-nav a').forEach(link => {
  link.addEventListener('click', () => setMenuState(false));
});

function setMenuState(open) {
  siteNav?.classList.toggle('open', open);
  menuToggle?.classList.toggle('open', open);
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuToggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
}

scrollTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

const splitTargets = new Set([
  ...qsa('.split-text'),
  ...qsa('.mega-title'),
  ...qsa('.display').filter(title => !title.closest('.site-footer')),
]);
splitTargets.forEach(title => splitIntoRevealLines(title));

let resizeTimer;

function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    splitTargets.forEach(title => splitIntoRevealLines(title, true));
    updateScrollEffects();
  }, 120);
}

function splitIntoRevealLines(element, force = false) {
  const bucket = getSplitBucket();
  if (!force && element.dataset.splitDone) return;
  if (force && element.dataset.splitBucket === bucket) return;

  const source = element.dataset.originalText || element.textContent.trim();
  element.dataset.originalText = source;
  element.dataset.splitDone = 'true';
  element.dataset.splitBucket = bucket;

  const words = source.split(/\s+/);
  const maxChars = getLineLimit(element);
  const lines = words.reduce((acc, word) => {
    const current = acc[acc.length - 1] || '';
    const candidate = current ? `${current} ${word}` : word;

    if (!current || candidate.length <= maxChars) {
      acc[acc.length - 1] = candidate;
    } else {
      acc.push(word);
    }

    return acc;
  }, ['']).filter(Boolean);

  element.textContent = '';
  lines.forEach(line => {
    const span = document.createElement('span');
    span.className = 'text-reveal-line';
    span.textContent = line;
    element.appendChild(span);
  });
}

function getSplitBucket() {
  if (innerWidth <= 420) return 'phone-small';
  if (innerWidth <= 620) return 'phone';
  if (innerWidth <= 980) return 'tablet';
  if (innerWidth <= 1199) return 'laptop';
  return 'desktop';
}

function getLineLimit(element) {
  const bucket = getSplitBucket();
  const isMega = element.classList.contains('mega-title');
  const limits = isMega
    ? { 'phone-small': 12, phone: 13, tablet: 14, laptop: 16, desktop: 18 }
    : { 'phone-small': 13, phone: 14, tablet: 18, laptop: 22, desktop: 24 };

  return limits[bucket];
}

applyRevealStagger();

function applyRevealStagger() {
  const groups = qsa('.stats-grid, .service-list, .featured-grid, .blog-ladder, .timeline, .contact-page, .contact-list');

  groups.forEach(group => {
    [...group.children].forEach((child, index) => {
      if (!child.classList.contains('reveal')) return;
      child.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);
    });
  });

  qsa('.footer-main li').forEach((item, index) => {
    item.style.setProperty('--item-delay', `${index * 55}ms`);
  });
}

function revealElement(el) {
  el.classList.add('visible');
  el.querySelectorAll('[data-count]').forEach(counter => animateCount(counter));
}

if ('IntersectionObserver' in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealElement(entry.target);
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .12 });

  qsa('.reveal, .stat').forEach(el => revealObserver.observe(el));
} else {
  qsa('.reveal, .stat').forEach(revealElement);
}

function animateCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = 'true';
  const target = Number(el.dataset.count);

  if (prefersReducedMotion) {
    el.textContent = target.toLocaleString();
    return;
  }

  let value = 0;
  const duration = 950;
  const start = performance.now();

  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    value = Math.round(target * eased);
    el.textContent = value.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

qsa('.service-row[data-preview]').forEach(row => {
  row.style.setProperty('--preview-image', `url("${row.dataset.preview}")`);
});

function parallax() {
  if (prefersReducedMotion) return;

  qsa('.parallax-img img, .hero-banner img').forEach(img => {
    const rect = img.parentElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const progress = (innerHeight - rect.top) / (innerHeight + rect.height);
    img.style.setProperty('--parallax', `${(progress - .5) * -42}px`);
  });
}

function updateTextReveal() {
  qsa('.text-reveal-line').forEach(line => {
    if (prefersReducedMotion) {
      line.style.setProperty('--text-progress', '0%');
      return;
    }

    const rect = line.getBoundingClientRect();
    const start = innerHeight * .92;
    const end = innerHeight * .46;
    const rawProgress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
    const progress = 1 - Math.pow(1 - rawProgress, 2);
    line.style.setProperty('--text-progress', `${100 - progress * 100}%`);
  });
}

if (cursor && matchMedia('(pointer: fine)').matches && !prefersReducedMotion) {
  window.addEventListener('mousemove', event => {
    cursor.classList.add('active');
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  }, { passive: true });

  qsa('a, button, input, textarea, .service-row').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('big'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
  });
}

qsa('.tabs').forEach(setupTabs);

function setupTabs(tabs) {
  const buttons = qsaFrom(tabs, '.tab-links button');
  const panels = qsaFrom(tabs, '.tab-panel');
  tabs.querySelector('.tab-links')?.setAttribute('role', 'tablist');

  buttons.forEach(button => {
    const panel = tabs.querySelector(`#${button.dataset.tab}`);
    button.type = 'button';
    button.setAttribute('role', 'tab');
    if (panel) button.setAttribute('aria-controls', panel.id);

    button.addEventListener('click', () => {
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
      });

      panels.forEach(panelItem => {
        const active = panelItem.id === button.dataset.tab;
        panelItem.classList.toggle('active', active);
        panelItem.hidden = !active;
      });
    });
  });

  panels.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = !panel.classList.contains('active');
  });

  buttons.forEach(button => {
    button.setAttribute('aria-selected', String(button.classList.contains('active')));
  });
}

function qsaFrom(root, selector) {
  return [...root.querySelectorAll(selector)];
}

qsa('.accordion').forEach((accordion, accordionIndex) => {
  qsaFrom(accordion, 'article').forEach((item, itemIndex) => {
    const button = item.querySelector('button');
    const panel = item.querySelector('p');
    if (!button || !panel) return;

    const panelId = `accordion-${accordionIndex}-${itemIndex}`;
    button.type = 'button';
    button.setAttribute('aria-expanded', String(item.classList.contains('open')));
    button.setAttribute('aria-controls', panelId);
    panel.id = panelId;

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      qsaFrom(accordion, 'article').forEach(row => {
        row.classList.remove('open');
        row.querySelector('button')?.setAttribute('aria-expanded', 'false');
      });

      item.classList.toggle('open', !isOpen);
      button.setAttribute('aria-expanded', String(!isOpen));
    });
  });
});

const quotes = qsa('.quote-slider blockquote');
let quoteIndex = 0;
let quoteTimer;

function showQuote(index) {
  if (!quotes.length) return;
  quoteIndex = (index + quotes.length) % quotes.length;
  quotes.forEach((quote, i) => quote.classList.toggle('active', i === quoteIndex));
  const count = qs('#quoteCount');
  if (count) count.textContent = `${String(quoteIndex + 1).padStart(2, '0')} / ${String(quotes.length).padStart(2, '0')}`;
}

function queueNextQuote() {
  if (!quotes.length || prefersReducedMotion) return;
  clearInterval(quoteTimer);
  quoteTimer = setInterval(() => showQuote(quoteIndex + 1), 6000);
}

qs('#nextQuote')?.addEventListener('click', () => {
  showQuote(quoteIndex + 1);
  queueNextQuote();
});

qs('#prevQuote')?.addEventListener('click', () => {
  showQuote(quoteIndex - 1);
  queueNextQuote();
});

qsa('.slider-controls button').forEach(button => {
  button.type = 'button';
});

showQuote(0);
queueNextQuote();

const marquee = qs('.marquee');
if (marquee && !marquee.dataset.cloned) {
  marquee.dataset.cloned = 'true';
  marquee.innerHTML += marquee.innerHTML;
}

qsa('form').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    form.classList.add('submitted');

    const button = form.querySelector('button');
    if (button) button.textContent = 'Sent';

    let status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-status';
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }
    status.textContent = 'Thank you for reaching out.';
  });
});

updateScrollEffects();
