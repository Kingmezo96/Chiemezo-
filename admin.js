(function () {
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  const sessionKey = 'kingmezo.admin.session';
  const cms = window.KingmezoCMS;
  let data = cms.getData();
  let currentTab = 'overview';

  const loginPanel = qs('[data-login-panel]');
  const adminApp = qs('[data-admin-app]');
  const status = qs('[data-admin-status]');
  const title = qs('[data-admin-title]');

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function slugify(value = '') {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `item-${Date.now()}`;
  }

  function setStatus(message, tone = '') {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function isLoggedIn() {
    return sessionStorage.getItem(sessionKey) === 'active';
  }

  function showApp() {
    loginPanel.hidden = true;
    adminApp.hidden = false;
    renderAll();
  }

  function showLogin() {
    loginPanel.hidden = false;
    adminApp.hidden = true;
  }

  qs('[data-login-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const settings = cms.getData().settings || {};

    if (email === (settings.adminEmail || '').toLowerCase() && password === settings.adminPassword) {
      const authResult = await cms.signInAdmin(email, password).catch(error => ({ ok: false, reason: error.message }));
      sessionStorage.setItem(sessionKey, 'active');
      showApp();
      setStatus(authResult.ok ? 'Logged in with Supabase sync enabled.' : `Logged in locally. Supabase sync needs an Auth user: ${authResult.reason}`, authResult.ok ? 'success' : 'warning');
      return;
    }

    qs('[data-login-status]').textContent = 'Incorrect email or password.';
  });

  qs('[data-admin-logout]')?.addEventListener('click', () => {
    cms.signOutAdmin?.();
    sessionStorage.removeItem(sessionKey);
    showLogin();
  });

  qsa('[data-admin-tab]').forEach(button => {
    button.addEventListener('click', () => {
      currentTab = button.dataset.adminTab;
      qsa('[data-admin-tab]').forEach(item => item.classList.toggle('active', item === button));
      qsa('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === currentTab));
      title.textContent = button.textContent;
      renderAll();
    });
  });

  qs('[data-save-local]')?.addEventListener('click', () => {
    collectVisibleForms();
    cms.saveData(data);
    setStatus('Saved on this browser. The public pages on this device will use the updated content.', 'success');
    renderAll();
  });

  qs('[data-sync-remote]')?.addEventListener('click', async () => {
    collectVisibleForms();
    try {
      await cms.saveData(data, { remote: true });
      setStatus('Synced to Supabase.', 'success');
    } catch (error) {
      setStatus(`Supabase sync failed: ${error.message}`, 'error');
    }
  });

  function panel(name) {
    return qs(`[data-panel="${name}"]`);
  }

  function renderAll() {
    data = cms.getData();
    if (currentTab === 'overview') renderOverview();
    if (currentTab === 'pages') renderPages();
    if (currentTab === 'blog') renderBlog();
    if (currentTab === 'projects') renderProjects();
    if (currentTab === 'media') renderMedia();
    if (currentTab === 'settings') renderSettings();
  }

  function renderOverview() {
    const posts = data.blogPosts || [];
    const projects = Object.keys(data.projectCases || {});
    panel('overview').innerHTML = `
      <div class="admin-grid">
        <article class="admin-card"><p>Blog Posts</p><strong>${posts.length}</strong></article>
        <article class="admin-card"><p>Projects</p><strong>${projects.length}</strong></article>
        <article class="admin-card"><p>Media Items</p><strong>${(data.media || []).length}</strong></article>
        <article class="admin-card"><p>Backend</p><strong>${cms.isSupabaseConfigured() ? 'On' : 'Local'}</strong></article>
      </div>
      <div class="admin-editor">
        <div class="admin-editor-header">
          <div><h2>Publishing Notes</h2><p class="admin-status">Use Save for immediate local edits. Add the Supabase publishable key in supabase-config.js when you want browser edits to sync across devices.</p></div>
        </div>
      </div>
    `;
  }

  function imagePreview(src) {
    return `<img class="admin-preview" src="${escapeHtml(src || 'assets/chiemezo/hero-community-team.jpg')}" alt="">`;
  }

  function field(path, label, value, type = 'text', wide = false) {
    const input = type === 'textarea'
      ? `<textarea data-field="${path}">${escapeHtml(value || '')}</textarea>`
      : `<input data-field="${path}" type="${type}" value="${escapeHtml(value || '')}">`;
    return `<label class="${wide ? 'wide' : ''}">${label}${input}</label>`;
  }

  function renderPages() {
    const home = data.pages?.home || {};
    const blog = data.pages?.blog || {};
    const project = data.pages?.project || {};
    panel('pages').innerHTML = `
      ${pageEditor('Homepage', [
        field('pages.home.heroTitle', 'Hero title', home.heroTitle),
        field('pages.home.heroNote', 'Hero note', home.heroNote, 'textarea', true),
        field('pages.home.heroLocation', 'Location line', home.heroLocation),
        field('pages.home.heroImage', 'Main banner image', home.heroImage),
        field('pages.home.featureImage', 'Featured image', home.featureImage),
        field('pages.home.aboutTitle', 'About heading', home.aboutTitle, 'textarea', true),
        field('pages.home.ctaTitle', 'CTA heading', home.ctaTitle)
      ], home.heroImage)}
      ${pageEditor('Blog Page', [
        field('pages.blog.heroTitle', 'Hero title', blog.heroTitle),
        field('pages.blog.heroBody', 'Hero body', blog.heroBody, 'textarea', true),
        field('pages.blog.heroImage', 'Hero image', blog.heroImage)
      ], blog.heroImage)}
      ${pageEditor('Project Page', [
        field('pages.project.heroTitle', 'Hero title', project.heroTitle),
        field('pages.project.heroBody', 'Hero body', project.heroBody, 'textarea', true),
        field('pages.project.heroImage', 'Hero image', project.heroImage)
      ], project.heroImage)}
    `;
  }

  function pageEditor(label, fields, preview) {
    return `
      <section class="admin-editor">
        <div class="admin-editor-header"><h2>${label}</h2></div>
        <div class="admin-form-grid">
          <div class="wide">${imagePreview(preview)}</div>
          ${fields.join('')}
        </div>
      </section>
    `;
  }

  function renderBlog() {
    const posts = data.blogPosts || [];
    panel('blog').innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor-header"><h2>Blog Posts</h2><button data-add-blog type="button">Add Post</button></div>
      </div>
      <div class="admin-table">
        ${posts.map((post, index) => `
          <div class="admin-table-row">
            <img src="${escapeHtml(post.image)}" alt="">
            <div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.date)} | ${escapeHtml(post.publisher)} | ${escapeHtml(post.status)}</p></div>
            <div class="admin-row-actions">
              <a href="blog-detail.html?post=${encodeURIComponent(post.slug)}" target="_blank" rel="noreferrer">View</a>
              <button data-edit-blog="${index}" type="button">Edit</button>
              <button class="secondary" data-delete-blog="${index}" type="button">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div data-blog-editor></div>
    `;
    bindBlogActions();
  }

  function bindBlogActions() {
    qs('[data-add-blog]')?.addEventListener('click', () => {
      data.blogPosts = data.blogPosts || [];
      data.blogPosts.unshift({
        slug: `new-post-${Date.now()}`,
        title: 'New Blog Post',
        excerpt: '',
        content: '',
        image: 'assets/chiemezo/community-gathering.jpg',
        date: new Date().toISOString().slice(0, 10),
        readTime: '4 mins read',
        publisher: 'Chibuzo Ogbonnaya',
        status: 'draft'
      });
      cms.setData(data);
      renderBlog();
      renderBlogEditor(0);
    });
    qsa('[data-edit-blog]').forEach(button => button.addEventListener('click', () => renderBlogEditor(Number(button.dataset.editBlog))));
    qsa('[data-delete-blog]').forEach(button => button.addEventListener('click', () => {
      data.blogPosts.splice(Number(button.dataset.deleteBlog), 1);
      cms.setData(data);
      renderBlog();
    }));
  }

  function renderBlogEditor(index) {
    const post = data.blogPosts[index];
    qs('[data-blog-editor]').innerHTML = `
      <section class="admin-editor">
        <div class="admin-editor-header"><h2>Edit Blog Post</h2><button data-close-editor type="button" class="secondary">Close</button></div>
        <div class="admin-form-grid">
          <div class="wide">${imagePreview(post.image)}</div>
          ${field(`blogPosts.${index}.title`, 'Title', post.title)}
          ${field(`blogPosts.${index}.slug`, 'Slug', post.slug)}
          ${field(`blogPosts.${index}.image`, 'Image path or URL', post.image)}
          ${field(`blogPosts.${index}.date`, 'Date published', post.date, 'date')}
          ${field(`blogPosts.${index}.publisher`, 'Publisher', post.publisher)}
          ${field(`blogPosts.${index}.readTime`, 'Read time', post.readTime)}
          ${field(`blogPosts.${index}.status`, 'Status', post.status)}
          ${field(`blogPosts.${index}.excerpt`, 'Excerpt', post.excerpt, 'textarea', true)}
          ${field(`blogPosts.${index}.content`, 'Body content', post.content, 'textarea', true)}
        </div>
      </section>
    `;
    qs('[data-close-editor]')?.addEventListener('click', () => qs('[data-blog-editor]').innerHTML = '');
  }

  function renderProjects() {
    const entries = Object.entries(data.projectCases || {});
    panel('projects').innerHTML = `
      <div class="admin-editor">
        <div class="admin-editor-header"><h2>Projects</h2><button data-add-project type="button">Add Project</button></div>
      </div>
      <div class="admin-table">
        ${entries.map(([slug, item]) => `
          <div class="admin-table-row">
            <img src="${escapeHtml(item.thumb || item.banner)}" alt="">
            <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)} | ${escapeHtml(item.date || '')} | ${escapeHtml(item.publisher || '')}</p></div>
            <div class="admin-row-actions">
              <a href="project-details.html?project=${encodeURIComponent(slug)}" target="_blank" rel="noreferrer">View</a>
              <button data-edit-project="${escapeHtml(slug)}" type="button">Edit</button>
              <button class="secondary" data-delete-project="${escapeHtml(slug)}" type="button">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div data-project-editor></div>
    `;
    bindProjectActions();
  }

  function bindProjectActions() {
    qs('[data-add-project]')?.addEventListener('click', () => {
      const slug = `new-project-${Date.now()}`;
      data.projectCases[slug] = {
        title: 'New Project',
        tagline: '',
        banner: 'assets/chiemezo/project-team-planning.jpg',
        thumb: 'assets/chiemezo/project-team-planning.jpg',
        summary: '',
        description: '',
        client: '',
        industry: '',
        category: 'Project Management',
        duration: '',
        date: new Date().toISOString().slice(0, 10),
        publisher: 'Chibuzo Ogbonnaya',
        challenge: '',
        painPoints: [],
        gallery: [],
        resultTitle: '',
        results: []
      };
      cms.setData(data);
      renderProjects();
      renderProjectEditor(slug);
    });
    qsa('[data-edit-project]').forEach(button => button.addEventListener('click', () => renderProjectEditor(button.dataset.editProject)));
    qsa('[data-delete-project]').forEach(button => button.addEventListener('click', () => {
      delete data.projectCases[button.dataset.deleteProject];
      cms.setData(data);
      renderProjects();
    }));
  }

  function renderProjectEditor(slug) {
    const item = data.projectCases[slug];
    qs('[data-project-editor]').innerHTML = `
      <section class="admin-editor">
        <div class="admin-editor-header"><h2>Edit Project</h2><button data-close-editor type="button" class="secondary">Close</button></div>
        <div class="admin-form-grid">
          <div class="wide">${imagePreview(item.banner || item.thumb)}</div>
          ${field(`projectCases.${slug}.title`, 'Title', item.title)}
          ${field(`projectKey.${slug}`, 'Slug', slug)}
          ${field(`projectCases.${slug}.category`, 'Category', item.category)}
          ${field(`projectCases.${slug}.date`, 'Date published', item.date, 'date')}
          ${field(`projectCases.${slug}.publisher`, 'Publisher', item.publisher)}
          ${field(`projectCases.${slug}.client`, 'Client', item.client)}
          ${field(`projectCases.${slug}.industry`, 'Industry', item.industry)}
          ${field(`projectCases.${slug}.duration`, 'Duration', item.duration)}
          ${field(`projectCases.${slug}.banner`, 'Banner image', item.banner)}
          ${field(`projectCases.${slug}.thumb`, 'Thumbnail image', item.thumb)}
          ${field(`projectCases.${slug}.tagline`, 'Tagline', item.tagline, 'textarea', true)}
          ${field(`projectCases.${slug}.summary`, 'Summary', item.summary, 'textarea', true)}
          ${field(`projectCases.${slug}.description`, 'Description', item.description, 'textarea', true)}
          ${field(`projectCases.${slug}.challenge`, 'Challenge', item.challenge, 'textarea', true)}
          ${field(`projectCases.${slug}.painPoints`, 'Pain points, one per line', (item.painPoints || []).join('\n'), 'textarea', true)}
          ${field(`projectCases.${slug}.gallery`, 'Gallery images, one per line', (item.gallery || []).join('\n'), 'textarea', true)}
          ${field(`projectCases.${slug}.resultTitle`, 'Result heading', item.resultTitle, 'textarea', true)}
          ${field(`projectCases.${slug}.results`, 'Results, one per line', (item.results || []).join('\n'), 'textarea', true)}
        </div>
      </section>
    `;
    qs('[data-close-editor]')?.addEventListener('click', () => qs('[data-project-editor]').innerHTML = '');
  }

  function renderMedia() {
    panel('media').innerHTML = `
      <section class="admin-editor">
        <div class="admin-editor-header"><h2>Media Library</h2></div>
        <div class="admin-form-grid">
          ${field('newMediaPath', 'Add image path or URL', '', 'text', true)}
          <button data-add-media type="button">Add Media</button>
        </div>
      </section>
      <div class="media-grid">
        ${(data.media || []).map((src, index) => `
          <article class="media-card">
            <img src="${escapeHtml(src)}" alt="">
            <code>${escapeHtml(src)}</code>
            <button class="secondary" data-delete-media="${index}" type="button">Remove</button>
          </article>
        `).join('')}
      </div>
    `;
    qs('[data-add-media]')?.addEventListener('click', () => {
      const input = qs('[data-field="newMediaPath"]');
      const value = input.value.trim();
      if (!value) return;
      data.media = [...new Set([...(data.media || []), value])];
      cms.setData(data);
      renderMedia();
    });
    qsa('[data-delete-media]').forEach(button => button.addEventListener('click', () => {
      data.media.splice(Number(button.dataset.deleteMedia), 1);
      cms.setData(data);
      renderMedia();
    }));
  }

  function renderSettings() {
    const settings = data.settings || {};
    panel('settings').innerHTML = `
      <section class="admin-editor">
        <div class="admin-editor-header"><h2>Admin & Site Settings</h2></div>
        <div class="admin-form-grid">
          ${field('settings.brand', 'Site brand', settings.brand)}
          ${field('settings.contactEmail', 'Public contact email', settings.contactEmail, 'email')}
          ${field('settings.linkedin', 'LinkedIn URL', settings.linkedin)}
          ${field('settings.adminEmail', 'Admin login email', settings.adminEmail, 'email')}
          ${field('settings.adminPassword', 'Admin password', settings.adminPassword, 'password')}
        </div>
      </section>
    `;
  }

  function setPath(path, value) {
    if (path === 'newMediaPath') return;
    if (path.startsWith('projectKey.')) {
      const oldSlug = path.replace('projectKey.', '');
      const newSlug = slugify(value);
      if (newSlug !== oldSlug && data.projectCases[oldSlug]) {
        data.projectCases[newSlug] = data.projectCases[oldSlug];
        delete data.projectCases[oldSlug];
      }
      return;
    }

    const parts = path.split('.');
    let target = data;
    while (parts.length > 1) {
      const part = parts.shift();
      target[part] = target[part] || (/^\d+$/.test(parts[0]) ? [] : {});
      target = target[part];
    }
    const key = parts[0];
    if (['painPoints', 'gallery', 'results'].includes(key)) {
      target[key] = value.split('\n').map(item => item.trim()).filter(Boolean);
    } else if (key === 'slug') {
      target[key] = slugify(value);
    } else {
      target[key] = value;
    }
  }

  function collectVisibleForms() {
    qsa('[data-field]').forEach(input => {
      setPath(input.dataset.field, input.value);
    });
  }

  if (isLoggedIn()) showApp();
  else showLogin();
})();
