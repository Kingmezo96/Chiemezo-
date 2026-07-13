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
  updateServiceRows();
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

function updateServiceRows() {
  const rows = qsa('.service-row[data-preview]');
  if (!rows.length) return;

  rows.forEach(row => {
    if (prefersReducedMotion) {
      row.style.setProperty('--service-progress', '1');
      row.style.setProperty('--preview-opacity', '0');
      row.classList.remove('scroll-focus');
      return;
    }

    const rect = row.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const distance = Math.abs(midpoint - innerHeight * .52);
    const range = Math.max(innerHeight * .44, 260);
    const progress = Math.max(0, 1 - distance / range);
    const eased = Math.pow(progress, .75);

    row.style.setProperty('--service-progress', eased.toFixed(3));
    row.style.setProperty('--preview-opacity', (eased * .72).toFixed(3));
    row.classList.toggle('scroll-focus', eased > .58);
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
qsa('[data-project-deck]').forEach(setupProjectDeck);

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

function setupProjectDeck(deck) {
  const buttons = qsaFrom(deck, '.subproject-card');
  const details = qsaFrom(deck, '.subproject-detail');
  const nav = deck.querySelector('.subproject-nav');

  nav?.setAttribute('role', 'tablist');

  buttons.forEach(button => {
    const detail = details.find(item => item.id === button.dataset.detail);
    button.type = 'button';
    button.setAttribute('role', 'tab');
    if (detail) button.setAttribute('aria-controls', detail.id);

    button.addEventListener('click', () => {
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
      });

      details.forEach(detailItem => {
        const active = detailItem.id === button.dataset.detail;
        detailItem.classList.toggle('active', active);
        detailItem.hidden = !active;
      });
    });
  });

  details.forEach(detail => {
    detail.setAttribute('role', 'tabpanel');
    detail.hidden = !detail.classList.contains('active');
  });

  buttons.forEach(button => {
    button.setAttribute('aria-selected', String(button.classList.contains('active')));
  });
}

function qsaFrom(root, selector) {
  return [...root.querySelectorAll(selector)];
}

function setupPortfolioFilters() {
  const filters = qsa('.portfolio-filter button');
  const tiles = qsa('.portfolio-tile');
  if (!filters.length || !tiles.length) return;

  filters.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.projectFilter;
      filters.forEach(item => item.classList.toggle('active', item === button));

      tiles.forEach(tile => {
        const visible = filter === 'all' || tile.dataset.projectCategory === filter;
        tile.hidden = !visible;
        tile.classList.toggle('is-hidden', !visible);
      });
    });
  });
}

const projectCases = {
  edubridge: {
    title: 'EduBridge Initiative',
    tagline: 'An education support initiative connecting young people to learning tools, mentorship, and opportunity.',
    banner: 'assets/chiemezo/project-team-planning.jpg',
    thumb: 'assets/chiemezo/community-speaking.jpg',
    summary: 'EduBridge is built to make educational access more practical, supported, and connected to real opportunity.',
    description: 'The initiative brings structure to education-focused support through planning, partner coordination, mentorship pathways, and delivery systems that help young people move from interest to action.',
    client: 'EduBridge',
    industry: 'Education & Youth Development',
    category: 'Project Management',
    duration: 'Program Cycle',
    challenge: 'The challenge was creating an education support structure that could stay clear, practical, and useful for young people with different needs.',
    painPoints: [
      'Limited access to structured learning support and mentorship.',
      'Need for clearer coordination between partners, educators, and participants.',
      'Programs needed practical tracking, communication, and follow-through.'
    ],
    gallery: [
      'assets/chiemezo/project-team-planning.jpg',
      'assets/chiemezo/community-speaking.jpg',
      'assets/chiemezo/project-leadership.jpg',
      'assets/chiemezo/project-partners.jpg'
    ],
    resultTitle: 'A stronger project structure for education support, partner coordination, and youth opportunity.',
    results: [
      'Clearer program scope and delivery flow.',
      'Improved planning structure for outreach and mentorship.',
      'Stronger alignment between community needs and educational support.'
    ]
  },
  chaise: {
    title: 'CHAISE',
    tagline: "Africa's leading marketplace solution integrating freelancers and business owners together.",
    banner: 'assets/portfolio/chaise-marketplace-screens.jpeg',
    thumb: 'assets/portfolio/chaise-hero-phone.jpeg',
    summary: 'CHAISE connects freelancers and business owners through a focused marketplace experience.',
    description: 'A marketplace solution designed to make hiring, service discovery, and collaboration easier for African freelancers and business owners.',
    client: 'CHAISE',
    industry: 'Marketplace & Technology',
    category: 'Product Dev & Management',
    duration: 'Product Sprint',
    challenge: 'The product needed to make trust, discovery, hiring, and project management feel simple for two very different user groups.',
    painPoints: [
      'Freelancers needed a clearer way to show expertise and access opportunities.',
      'Business owners needed faster talent discovery and simpler hiring decisions.',
      'The platform needed a product story that could scale across talent, projects, and service categories.'
    ],
    gallery: [
      'assets/portfolio/chaise-marketplace-screens.jpeg',
      'assets/portfolio/chaise-hero-phone.jpeg',
      'assets/portfolio/chaise-product-flow.jpeg',
      'assets/portfolio/chaise-business-screen.jpeg'
    ],
    resultTitle: 'A clearer product direction for a marketplace built around talent discovery, hiring, and service delivery.',
    results: [
      'Defined the marketplace positioning and product experience.',
      'Clarified user journeys for freelancers and business owners.',
      'Created a stronger visual product story for future rollout.'
    ]
  },
  'big-smile': {
    title: 'Big Smile Initiative',
    tagline: 'A community care initiative creating moments of support, inclusion, and joy for children and families.',
    banner: 'assets/chiemezo/community-children.jpg',
    thumb: 'assets/projects/big-smile-endo.jpg',
    summary: 'Big Smile Initiative brings direct support and human attention to children and families through outreach-led engagement.',
    description: 'The work focuses on dignity, access, and care by bringing people, resources, and local coordination together around practical community needs.',
    client: 'Big Smile Initiative',
    industry: 'Community Development',
    category: 'Community Engagement',
    duration: 'Outreach Cycle',
    challenge: 'The initiative needed to translate care into organized outreach that felt warm, trustworthy, and useful to the community.',
    painPoints: [
      'Families needed practical support that reached them directly.',
      'Outreach activities needed clear planning and local coordination.',
      'The project needed to preserve dignity while delivering visible care.'
    ],
    gallery: [
      'assets/chiemezo/community-children.jpg',
      'assets/projects/big-smile-endo.jpg',
      'assets/chiemezo/community-child.jpg',
      'assets/chiemezo/community-gathering.jpg'
    ],
    resultTitle: 'A more organized community care experience centered on children, families, and human dignity.',
    results: [
      'Created a stronger structure for outreach planning.',
      'Improved visual storytelling around the initiative.',
      'Supported clearer community engagement and participation.'
    ]
  },
  'dont-bully-me': {
    title: "Don't Bully Me Initiative",
    tagline: 'A safer learning spaces initiative promoting empathy, confidence, and protection from bullying.',
    banner: 'assets/chiemezo/community-lineup.jpg',
    thumb: 'assets/chiemezo/community-portrait.jpg',
    summary: "Don't Bully Me helps young people understand safety, empathy, confidence, and respect in learning environments.",
    description: 'The initiative is designed for school and youth-centered engagement, combining awareness, conversation, and practical community participation.',
    client: "Don't Bully Me",
    industry: 'Youth Advocacy',
    category: 'Community Engagement',
    duration: 'Campaign Cycle',
    challenge: 'The project needed to communicate a sensitive issue clearly while creating a safe and encouraging atmosphere for young people.',
    painPoints: [
      'Students needed safer spaces to discuss bullying and confidence.',
      'The message had to be direct without making participants feel exposed.',
      'The program needed simple activities that schools and communities could understand.'
    ],
    gallery: [
      'assets/chiemezo/community-lineup.jpg',
      'assets/chiemezo/community-gathering.jpg',
      'assets/chiemezo/community-portrait.jpg',
      'assets/chiemezo/community-culture.jpg'
    ],
    resultTitle: 'A clearer awareness initiative for safer learning spaces and more empathetic youth engagement.',
    results: [
      'Shaped the initiative around safety, empathy, and confidence.',
      'Created a stronger community-facing message.',
      'Improved the structure for school and youth participation.'
    ]
  },
  kuepass: {
    title: 'Kuepass',
    tagline: 'A corporate minimal identity system across stationery, merchandise, and practical launch collateral.',
    banner: 'assets/portfolio/kuepass-brand-kit.jpeg',
    thumb: 'assets/portfolio/kuepass-cap.jpeg',
    summary: 'Kuepass uses a clean identity system to make the brand feel credible, practical, and easy to recognize.',
    description: 'The work extends the visual identity across stationery, branded objects, and presentation assets with a restrained corporate feel.',
    client: 'Kuepass',
    industry: 'Media & Technology',
    category: 'Branding & Strategy',
    duration: 'Brand Sprint',
    challenge: 'The brand needed a minimal identity that could work across physical merchandise, documents, and digital communication.',
    painPoints: [
      'The identity needed to stay consistent across many formats.',
      'Merchandise and stationery had to feel practical, not decorative.',
      'The system needed to support recognition without visual clutter.'
    ],
    gallery: [
      'assets/portfolio/kuepass-brand-kit.jpeg',
      'assets/portfolio/kuepass-cap.jpeg',
      'assets/portfolio/ambassadors-brand-deck.jpeg',
      'assets/portfolio/ambassadors-audience-deck.jpeg'
    ],
    resultTitle: 'A cleaner and more consistent identity system for brand recognition across collateral and merchandise.',
    results: [
      'Built a practical identity direction for everyday brand use.',
      'Extended the system into caps, stationery, and presentation materials.',
      'Improved consistency across brand touchpoints.'
    ]
  },
  viicsoft: {
    title: 'Viicsoft',
    tagline: 'A corporate minimal identity for a media brand extended into merchandise and launch-ready brand assets.',
    banner: 'assets/portfolio/viicsoft-notebooks.jpeg',
    thumb: 'assets/portfolio/viicsoft-shirts.jpeg',
    summary: 'Viicsoft turns a clean brand identity into a practical merchandise and stationery system.',
    description: 'The identity direction carries across notebooks, shirts, tote bags, bottles, and branded presentation assets with a sharp media-brand tone.',
    client: 'Viicsoft',
    industry: 'Media Brand',
    category: 'Branding & Strategy',
    duration: 'Brand Sprint',
    challenge: 'The brand needed a simple but recognizable identity system that could stretch across apparel, stationery, and merchandise.',
    painPoints: [
      'The identity needed enough flexibility for different product surfaces.',
      'Merchandise had to feel cohesive across color, object, and scale.',
      'The brand needed sharper presentation for launch and recognition.'
    ],
    gallery: [
      'assets/portfolio/viicsoft-notebooks.jpeg',
      'assets/portfolio/viicsoft-shirts.jpeg',
      'assets/portfolio/viicsoft-tote.jpeg',
      'assets/portfolio/viicsoft-bottle.jpeg'
    ],
    resultTitle: 'A cohesive visual system that gives Viicsoft stronger recognition across branded merchandise.',
    results: [
      'Extended the identity across multiple merchandise categories.',
      'Improved consistency for apparel and stationery mockups.',
      'Created a clean brand presentation for future rollout.'
    ]
  }
};

function setupProjectDetailsPage() {
  const page = qs('[data-project-detail-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const key = params.get('project') || 'chaise';
  const item = projectCases[key] || projectCases.chaise;

  setText('[data-detail-title]', item.title);
  setText('[data-detail-tagline]', item.tagline);
  setText('[data-detail-summary]', item.summary);
  setText('[data-detail-description]', item.description);
  setText('[data-detail-client]', item.client);
  setText('[data-detail-industry]', item.industry);
  setText('[data-detail-category]', item.category);
  setText('[data-detail-duration]', item.duration);
  setText('[data-detail-challenge]', item.challenge);
  setText('[data-detail-result-title]', item.resultTitle);

  const banner = qs('[data-detail-banner]');
  if (banner) {
    banner.src = item.banner;
    banner.alt = `${item.title} project banner`;
  }

  const thumb = qs('[data-detail-thumb]');
  if (thumb) {
    thumb.src = item.thumb;
    thumb.alt = `${item.title} project thumbnail`;
  }

  renderNumberedList('[data-detail-pain-points]', item.painPoints);
  renderNumberedList('[data-detail-results]', item.results);
  renderGallery(item);
  renderRelatedProjects(key);

  document.title = `${item.title} | Kingmezo Project Details`;
}

function setText(selector, value) {
  const element = qs(selector);
  if (element) element.textContent = value;
}

function renderNumberedList(selector, items) {
  const list = qs(selector);
  if (!list) return;

  list.innerHTML = items.map((item, index) => `
    <li><span>/${String(index + 1).padStart(2, '0')}</span><p>${item}</p></li>
  `).join('');
}

function renderGallery(item) {
  const gallery = qs('[data-detail-gallery]');
  if (!gallery) return;

  gallery.innerHTML = item.gallery.map(src => `
    <a href="${src}" class="case-gallery-item">
      <img src="${src}" alt="${item.title} project image">
    </a>
  `).join('');
}

function renderRelatedProjects(currentKey) {
  const related = qs('[data-related-projects]');
  if (!related) return;

  related.innerHTML = Object.entries(projectCases)
    .filter(([key]) => key !== currentKey)
    .slice(0, 3)
    .map(([key, item]) => `
      <article class="related-card">
        <a class="hover-img" href="project-details.html?project=${key}">
          <img src="${item.thumb}" alt="${item.title}">
        </a>
        <div>
          <h3><a href="project-details.html?project=${key}">${item.title}</a></h3>
          <p>${item.category}</p>
          <a class="arrow-btn" href="project-details.html?project=${key}">View Details <span>-></span></a>
        </div>
      </article>
    `).join('');
}

setupPortfolioFilters();
setupProjectDetailsPage();

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
