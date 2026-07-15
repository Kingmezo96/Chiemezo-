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
  ...qsa('.display').filter(title => !title.closest('.site-footer') && !title.classList.contains('no-split')),
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

setupServicePreview();

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
    row.classList.remove('scroll-focus');
    row.style.removeProperty('--service-progress');
    row.style.removeProperty('--preview-opacity');
  });
}

function setupServicePreview() {
  const rows = qsa('.service-row[data-preview]');
  if (!rows.length || !matchMedia('(pointer: fine)').matches || prefersReducedMotion) return;

  const preview = document.createElement('div');
  preview.className = 'service-preview-float';
  preview.setAttribute('aria-hidden', 'true');
  document.body.appendChild(preview);

  let activeRow = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let raf = null;

  const render = () => {
    currentX += (targetX - currentX) * .22;
    currentY += (targetY - currentY) * .22;
    preview.style.setProperty('--service-preview-x', `${currentX}px`);
    preview.style.setProperty('--service-preview-y', `${currentY}px`);

    if (activeRow) {
      raf = requestAnimationFrame(render);
    } else {
      raf = null;
    }
  };

  const movePreview = event => {
    targetX = event.clientX + 34;
    targetY = event.clientY - 18;
    if (!raf) {
      currentX = targetX;
      currentY = targetY;
      raf = requestAnimationFrame(render);
    }
  };

  rows.forEach(row => {
    row.addEventListener('mouseenter', event => {
      activeRow = row;
      preview.style.backgroundImage = `url("${row.dataset.preview}")`;
      preview.classList.add('active');
      movePreview(event);
    });

    row.addEventListener('mousemove', movePreview);

    row.addEventListener('mouseleave', () => {
      activeRow = null;
      preview.classList.remove('active');
    });
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

function getCmsData() {
  return window.KingmezoCMS?.getData?.() || window.KINGMEZO_DEFAULT_CMS || {};
}

function getCmsProjectCases() {
  return getCmsData().projectCases || projectCases;
}

function getCmsBlogPosts() {
  return (getCmsData().blogPosts || []).filter(post => post.status !== 'draft');
}

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatPostDate(date = '') {
  if (!date) return '';
  const normalizedDate = String(date).includes('T') ? date : `${date}T00:00:00`;
  const parsed = new Date(normalizedDate);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en', { month: 'long', day: '2-digit', year: 'numeric' });
}

function projectCategoryFilter(category = '') {
  const value = category.toLowerCase();
  if (value.includes('product')) return 'product-management';
  if (value.includes('community')) return 'community-engagement';
  if (value.includes('brand')) return 'branding-strategy';
  return 'project-management';
}

function setImage(selector, src, alt) {
  const image = qs(selector);
  if (!image || !src) return;
  image.src = src;
  if (alt) image.alt = alt;
}

function refreshSplitText(element) {
  if (!element) return;
  element.dataset.originalText = element.textContent.trim();
  element.dataset.splitDone = '';
  splitIntoRevealLines(element, true);
}

function applyCmsPublicContent() {
  const cmsData = getCmsData();
  applyCmsHome(cmsData);
  applyCmsBlogList(cmsData);
  applyCmsProjectList(cmsData);
  setupProjectDetailsPage();
  setupBlogDetailPage();
  applyRevealStagger();
  updateScrollEffects();
}

function applyCmsHome(cmsData) {
  if (document.body.dataset.page !== 'home') return;
  const home = cmsData.pages?.home;
  if (!home) return;

  setText('.hero-note', home.heroNote);
  setText('.location', home.heroLocation);
  setText('.about-snapshot .compact-display', home.aboutTitle);
  setText('.dark-cta .display', home.ctaTitle);
  setImage('.feature-card img', home.featureImage, 'Featured community initiative');
  setImage('.landing-hero-banner img', home.heroImage, 'Kingmezo community impact banner');

  const heroTitle = qs('.split-hero .mega-title');
  if (heroTitle && home.heroTitle) {
    heroTitle.textContent = home.heroTitle;
    refreshSplitText(heroTitle);
  }
}

function applyCmsBlogList(cmsData) {
  const posts = getCmsBlogPosts();
  const blogPage = document.body.dataset.page === 'blog';
  const homePage = document.body.dataset.page === 'home';
  if (!blogPage && !homePage) return;

  if (blogPage) {
    const blog = cmsData.pages?.blog || {};
    setText('.page-hero .mega-title', blog.heroTitle);
    setText('.page-hero .lead', blog.heroBody);
    setImage('.page-hero .hero-banner img', blog.heroImage, 'Community members gathered during development outreach');
    refreshSplitText(qs('.page-hero .mega-title'));
  }

  const list = blogPage ? qs('.blog-ladder.full') : qs('.blog-ladder');
  if (!list || !posts.length) return;
  list.innerHTML = posts.slice(0, blogPage ? posts.length : 3).map(post => `
    <article class="post-card reveal">
      <img src="${escapeHTML(post.image)}" alt="${escapeHTML(post.title)}">
      <div>
        <p>${escapeHTML(formatPostDate(post.date))} | ${escapeHTML(post.readTime || '')}</p>
        <h3>${escapeHTML(post.title)}</h3>
        <a href="blog-detail.html?post=${encodeURIComponent(post.slug)}">See Details</a>
      </div>
    </article>
  `).join('');
}

function applyCmsProjectList(cmsData) {
  if (document.body.dataset.page !== 'project') return;
  const page = cmsData.pages?.project || {};
  const cases = getCmsProjectCases();

  setText('.velisse-page-head .mega-title', page.heroTitle);
  setText('.velisse-page-head .lead', page.heroBody);
  setImage('.velisse-banner img', page.heroImage, 'Project portfolio banner');
  refreshSplitText(qs('.velisse-page-head .mega-title'));

  const grid = qs('.portfolio-grid');
  if (!grid) return;
  const entries = Object.entries(cases);
  const filters = [
    ['all', 'All Project'],
    ['project-management', 'Project Management'],
    ['product-management', 'Product Dev & Management'],
    ['community-engagement', 'Community Engagement'],
    ['branding-strategy', 'Branding & Strategy']
  ];
  const availableFilters = new Set(entries.map(([, item]) => projectCategoryFilter(item.category)));
  const filterNav = qs('.portfolio-filter');
  if (filterNav) {
    filterNav.innerHTML = filters
      .filter(([key]) => key === 'all' || availableFilters.has(key))
      .map(([key, label], index) => `<button class="${index === 0 ? 'active' : ''}" data-project-filter="${key}" type="button">${label}</button>`)
      .join('');
  }
  grid.innerHTML = Object.entries(cases).map(([slug, item]) => `
    <article class="portfolio-tile" data-project-category="${projectCategoryFilter(item.category)}">
      <a class="portfolio-thumb hover-img" href="project-details.html?project=${encodeURIComponent(slug)}" aria-label="View ${escapeHTML(item.title)} details">
        <img src="${escapeHTML(item.thumb || item.banner)}" alt="${escapeHTML(item.title)}">
        <span>View Details</span>
      </a>
      <div class="portfolio-info">
        <h3><a href="project-details.html?project=${encodeURIComponent(slug)}">${escapeHTML(item.title)}</a></h3>
        <p>${escapeHTML(item.category)}</p>
      </div>
    </article>
  `).join('');
  setupPortfolioFilters();
}

function setupPortfolioFilters() {
  const filters = qsa('.portfolio-filter button');
  const tiles = qsa('.portfolio-tile');
  if (!filters.length || !tiles.length) return;

  filters.forEach(button => {
    if (button.dataset.filterReady) return;
    button.dataset.filterReady = 'true';
    button.addEventListener('click', () => {
      const filter = button.dataset.projectFilter;
      filters.forEach(item => item.classList.toggle('active', item === button));

      qsa('.portfolio-tile').forEach(tile => {
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
    banner: 'assets/drive-projects/edubridge-01.jpg',
    thumb: 'assets/drive-projects/edubridge-02.jpg',
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
      'assets/drive-projects/edubridge-01.jpg',
      'assets/drive-projects/edubridge-02.jpg',
      'assets/drive-projects/edubridge-03.jpg',
      'assets/drive-projects/edubridge-04.jpg'
    ],
    resultTitle: 'A stronger project structure for education support, partner coordination, and youth opportunity.',
    results: [
      'Clearer program scope and delivery flow.',
      'Improved planning structure for outreach and mentorship.',
      'Stronger alignment between community needs and educational support.'
    ]
  },
  'digital-literacy': {
    title: 'Digital Literacy Program',
    tagline: 'An EduBridge learning program helping young people build practical digital confidence.',
    banner: 'assets/drive-projects/digital-literacy-01.jpg',
    thumb: 'assets/drive-projects/digital-literacy-02.jpg',
    summary: 'Digital Literacy Program supports young learners with access to practical technology exposure and guided learning.',
    description: 'The program sits under EduBridge and focuses on helping students understand computers, digital tools, and learning pathways they can use beyond the classroom.',
    client: 'EduBridge',
    industry: 'Education & Digital Inclusion',
    category: 'Project Management',
    duration: 'Learning Cohort',
    challenge: 'The program needed to make digital learning feel accessible, structured, and relevant for young learners.',
    painPoints: [
      'Learners needed guided exposure to computers and digital tools.',
      'The program needed practical classroom coordination.',
      'Digital inclusion work needed clear documentation and visual storytelling.'
    ],
    gallery: [
      'assets/drive-projects/digital-literacy-01.jpg',
      'assets/drive-projects/digital-literacy-02.jpg',
      'assets/drive-projects/digital-literacy-04.jpg',
      'assets/drive-projects/community-outreach-01.jpg'
    ],
    resultTitle: 'A clearer learning experience for digital skills, confidence, and classroom participation.',
    results: [
      'Supported structured digital literacy sessions.',
      'Improved documentation for learning activities.',
      'Connected EduBridge goals to practical digital inclusion outcomes.'
    ]
  },
  'big-smile': {
    title: 'Big Smile Initiative',
    tagline: 'A community care initiative creating moments of support, inclusion, and joy for children and families.',
    banner: 'assets/drive-projects/big-smile-endo-03.jpg',
    thumb: 'assets/drive-projects/big-smile-endo-01.jpg',
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
      'assets/drive-projects/big-smile-endo-03.jpg',
      'assets/drive-projects/big-smile-endo-01.jpg',
      'assets/drive-projects/big-smile-endo-02.jpg'
    ],
    resultTitle: 'A more organized community care experience centered on children, families, and human dignity.',
    results: [
      'Created a stronger structure for outreach planning.',
      'Improved visual storytelling around the initiative.',
      'Supported clearer community engagement and participation.'
    ]
  },
  'dont-bully-me': {
    title: "Don't Bully Me Campaign",
    tagline: 'A safer learning spaces initiative promoting empathy, confidence, and protection from bullying.',
    banner: 'assets/drive-projects/dont-bully-me-02.jpg',
    thumb: 'assets/drive-projects/dont-bully-me-04.jpg',
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
      'assets/drive-projects/dont-bully-me-02.jpg',
      'assets/drive-projects/dont-bully-me-04.jpg',
      'assets/drive-projects/dont-bully-me-01.jpg',
      'assets/drive-projects/dont-bully-me-03.jpg'
    ],
    resultTitle: 'A clearer awareness initiative for safer learning spaces and more empathetic youth engagement.',
    results: [
      'Shaped the initiative around safety, empathy, and confidence.',
      'Created a stronger community-facing message.',
      'Improved the structure for school and youth participation.'
    ]
  },
  'community-outreach': {
    title: 'Community Outreach',
    tagline: 'Community-focused learning and support activities designed around practical local needs.',
    banner: 'assets/drive-projects/community-outreach-02.jpg',
    thumb: 'assets/drive-projects/community-outreach-02.jpg',
    summary: 'Community Outreach brings targeted support, learning moments, and local engagement into spaces where young people can be reached directly.',
    description: 'The work focuses on practical engagement with children and young people, using organized sessions, partner support, and clear communication to meet community needs.',
    client: 'Reves African Foundation',
    industry: 'Community Development',
    category: 'Community Engagement',
    duration: 'Outreach Cycle',
    challenge: 'The outreach work needed to stay warm and personal while still being organized enough for documentation, partners, and future planning.',
    painPoints: [
      'Community activities needed clear coordination and follow-up.',
      'The visuals needed to reflect real people and local presence.',
      'The work needed to connect learning support with practical outreach.'
    ],
    gallery: [
      'assets/drive-projects/community-outreach-02.jpg',
      'assets/drive-projects/community-outreach-01.jpg'
    ],
    resultTitle: 'A more grounded outreach story that connects learning, care, and local engagement.',
    results: [
      'Organized community-facing activity documentation.',
      'Used relevant Drive images for the correct outreach context.',
      'Improved the distinction between outreach, campaigns, and education programs.'
    ]
  },
  'boys-champions-strategy': {
    title: 'Boys Champions Strategy',
    tagline: 'A visual strategy and brand document system created for a youth advocacy organization.',
    banner: 'assets/portfolio/boys-champions-strategy.jpeg',
    thumb: 'assets/portfolio/boys-champions-strategy.jpeg',
    summary: 'Boys Champions Strategy is presented here as branding work: a structured visual system for an advocacy organization, not the advocacy project itself.',
    description: 'The work shaped the organization strategy document into a clear, credible, and visually consistent brand asset. The design direction uses strong editorial layouts, blue campaign tones, photography, and clean information hierarchy to make the organization story easier to understand and present.',
    client: 'Boys Champions',
    industry: 'Advocacy Organization',
    category: 'Branding & Strategy',
    duration: 'Brand Document Sprint',
    challenge: 'The organization needed a strategy document that could communicate its mission, programs, and long-term direction with clarity and visual trust.',
    painPoints: [
      'The advocacy message needed a stronger visual structure for partners and stakeholders.',
      'The document had to organize dense strategy content without feeling heavy.',
      'The identity needed to feel purposeful, credible, and easy to recognize across pages.'
    ],
    gallery: [
      'assets/portfolio/boys-champions-strategy.jpeg',
      'assets/portfolio/boys-champions-strategy-cover.jpeg',
      'assets/portfolio/boys-champions-executive-summary.jpeg',
      'assets/portfolio/boys-champions-vision-mission.jpeg',
      'assets/portfolio/boys-champions-problem-statement.jpeg',
      'assets/portfolio/boys-champions-delivery-plan.jpeg'
    ],
    resultTitle: 'A polished brand and strategy document system for presenting Boys Champions with clarity and confidence.',
    results: [
      'Created a cohesive visual direction for the organization strategy document.',
      'Improved hierarchy across cover, executive summary, mission, and program pages.',
      'Built a presentation-ready brand asset for stakeholder communication.'
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
  const key = params.get('project') || 'edubridge';
  const cases = getCmsProjectCases();
  const item = cases[key] || cases.edubridge || Object.values(cases)[0];
  if (!item) return;

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

  list.innerHTML = (items || []).map((item, index) => `
    <li><span>/${String(index + 1).padStart(2, '0')}</span><p>${escapeHTML(item)}</p></li>
  `).join('');
}

function renderGallery(item) {
  const gallery = qs('[data-detail-gallery]');
  if (!gallery) return;

  gallery.innerHTML = (item.gallery || []).map(src => `
    <a href="${src}" class="case-gallery-item">
      <img src="${escapeHTML(src)}" alt="${escapeHTML(item.title)} project image">
    </a>
  `).join('');
}

function renderRelatedProjects(currentKey) {
  const related = qs('[data-related-projects]');
  if (!related) return;
  const cases = getCmsProjectCases();

  related.innerHTML = Object.entries(cases)
    .filter(([key]) => key !== currentKey)
    .slice(0, 3)
    .map(([key, item]) => `
      <article class="related-card">
        <a class="hover-img" href="project-details.html?project=${key}">
          <img src="${escapeHTML(item.thumb || item.banner)}" alt="${escapeHTML(item.title)}">
        </a>
        <div>
          <h3><a href="project-details.html?project=${key}">${escapeHTML(item.title)}</a></h3>
          <p>${escapeHTML(item.category)}</p>
          <a class="arrow-btn" href="project-details.html?project=${key}">View Details <span>-></span></a>
        </div>
      </article>
    `).join('');
}

function setupBlogDetailPage() {
  const page = qs('[data-blog-detail-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('post') || getCmsBlogPosts()[0]?.slug;
  const post = getCmsBlogPosts().find(item => item.slug === slug) || getCmsBlogPosts()[0];
  if (!post) return;

  setText('[data-blog-title]', post.title);
  setText('[data-blog-excerpt]', post.excerpt);
  setText('[data-blog-meta]', `${formatPostDate(post.date)} | ${post.readTime || ''} | ${post.publisher || ''}`);
  setImage('[data-blog-image]', post.image, post.title);
  const body = qs('[data-blog-content]');
  if (body) body.innerHTML = `<p>${escapeHTML(post.content || post.excerpt).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
  document.title = `${post.title} | Kingmezo Blog`;
}

setupPortfolioFilters();
setupProjectDetailsPage();
setupBlogDetailPage();

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

window.addEventListener('kingmezo:cms-ready', applyCmsPublicContent);
window.addEventListener('kingmezo:cms-updated', applyCmsPublicContent);
applyCmsPublicContent();
