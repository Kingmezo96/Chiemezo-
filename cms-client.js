(function () {
  const STORAGE_KEY = 'kingmezo.cms.v1';
  const defaultData = window.KINGMEZO_DEFAULT_CMS || {};

  const clone = value => JSON.parse(JSON.stringify(value || {}));

  function mergeDeep(base, override) {
    if (Array.isArray(base) || Array.isArray(override)) return override === undefined ? clone(base) : clone(override);
    const next = { ...clone(base) };
    Object.entries(override || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && next[key] && typeof next[key] === 'object' && !Array.isArray(next[key])) {
        next[key] = mergeDeep(next[key], value);
      } else {
        next[key] = clone(value);
      }
    });
    return next;
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      console.warn('CMS local data could not be read.', error);
      return null;
    }
  }

  function writeLocal(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let data = mergeDeep(defaultData, readLocal() || {});
  let remoteStatus = 'local';
  let client = null;

  function isSupabaseConfigured() {
    const config = window.KINGMEZO_SUPABASE;
    return Boolean(config?.url && config?.publishableKey && window.supabase?.createClient);
  }

  function getClient() {
    if (!isSupabaseConfigured()) return null;
    if (!client) {
      client = window.supabase.createClient(window.KINGMEZO_SUPABASE.url, window.KINGMEZO_SUPABASE.publishableKey);
    }
    return client;
  }

  function projectCategorySlug(category = '') {
    const value = category.toLowerCase();
    if (value.includes('product')) return 'product-management';
    if (value.includes('community')) return 'community-engagement';
    if (value.includes('brand')) return 'branding-strategy';
    return 'project-management';
  }

  function pageRowsToPages(rows) {
    const pages = clone(defaultData.pages || {});
    (rows || []).forEach(row => {
      if (row.section === 'home.hero') {
        pages.home = {
          ...(pages.home || {}),
          heroNote: row.body || pages.home?.heroNote,
          heroTitle: row.title || pages.home?.heroTitle,
          heroImage: row.image_url || pages.home?.heroImage,
          ...(row.meta || {})
        };
      }
      if (row.section === 'home.about') pages.home = { ...(pages.home || {}), aboutTitle: row.title || pages.home?.aboutTitle };
      if (row.section === 'home.cta') pages.home = { ...(pages.home || {}), ctaTitle: row.title || pages.home?.ctaTitle };
      if (row.section === 'blog.hero') pages.blog = { ...(pages.blog || {}), heroTitle: row.title, heroBody: row.body, heroImage: row.image_url };
      if (row.section === 'project.hero') pages.project = { ...(pages.project || {}), heroTitle: row.title, heroBody: row.body, heroImage: row.image_url };
    });
    return pages;
  }

  function remoteProjectsToCases(rows) {
    const cases = {};
    (rows || []).forEach(row => {
      const meta = row.meta || {};
      cases[row.slug] = {
        title: row.title,
        tagline: row.subtitle || meta.tagline || '',
        banner: meta.banner || row.image_url || '',
        thumb: meta.thumb || row.image_url || '',
        summary: meta.summary || row.subtitle || '',
        description: row.description || '',
        client: meta.client || row.title,
        industry: meta.industry || '',
        category: meta.category || row.category_slug || '',
        duration: meta.duration || '',
        date: meta.date || '',
        publisher: meta.publisher || 'Chibuzo Ogbonnaya',
        challenge: meta.challenge || '',
        painPoints: meta.painPoints || [],
        gallery: meta.gallery || [],
        resultTitle: meta.resultTitle || '',
        results: meta.results || []
      };
    });
    return cases;
  }

  function remotePostsToPosts(rows) {
    return (rows || []).map(row => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || '',
      content: row.content || '',
      image: row.image_url || '',
      date: row.published_at || '',
      readTime: row.read_time || '',
      publisher: row.publisher || 'Chibuzo Ogbonnaya',
      status: row.status || 'published'
    }));
  }

  async function loadRemote() {
    const supabase = getClient();
    if (!supabase) {
      remoteStatus = 'not-configured';
      return data;
    }

    const [contentResult, projectsResult, postsResult] = await Promise.all([
      supabase.from('site_content').select('*').order('sort_order'),
      supabase.from('projects').select('*').order('sort_order'),
      supabase.from('blog_posts').select('*').order('sort_order')
    ]);

    const error = contentResult.error || projectsResult.error || postsResult.error;
    if (error) throw error;

    data = mergeDeep(data, {
      pages: pageRowsToPages(contentResult.data),
      projectCases: remoteProjectsToCases(projectsResult.data),
      blogPosts: remotePostsToPosts(postsResult.data)
    });
    writeLocal(data);
    remoteStatus = 'loaded';
    notify();
    return data;
  }

  function pagePayloadRows(next) {
    const home = next.pages?.home || {};
    const blog = next.pages?.blog || {};
    const project = next.pages?.project || {};
    return [
      { section: 'home.hero', title: home.heroTitle, body: home.heroNote, image_url: home.heroImage, meta: { heroLocation: home.heroLocation, featureImage: home.featureImage }, sort_order: 1 },
      { section: 'home.about', title: home.aboutTitle, body: '', image_url: home.featureImage, meta: {}, sort_order: 2 },
      { section: 'home.cta', title: home.ctaTitle, body: '', image_url: '', meta: {}, sort_order: 3 },
      { section: 'blog.hero', title: blog.heroTitle, body: blog.heroBody, image_url: blog.heroImage, meta: {}, sort_order: 4 },
      { section: 'project.hero', title: project.heroTitle, body: project.heroBody, image_url: project.heroImage, meta: {}, sort_order: 5 }
    ];
  }

  function projectPayloadRows(next) {
    return Object.entries(next.projectCases || {}).map(([slug, item], index) => ({
      slug,
      title: item.title,
      subtitle: item.tagline || item.summary || '',
      description: item.description || '',
      image_url: item.thumb || item.banner || '',
      category_slug: projectCategorySlug(item.category),
      layout: 'case-study',
      is_visible: true,
      is_featured: index < 3,
      sort_order: index + 1,
      meta: item
    }));
  }

  function blogPayloadRows(next) {
    return (next.blogPosts || []).map((post, index) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content || '',
      image_url: post.image || '',
      published_at: post.date || null,
      read_time: post.readTime || '',
      publisher: post.publisher || 'Chibuzo Ogbonnaya',
      status: post.status || 'published',
      sort_order: index + 1
    }));
  }

  async function saveRemote(next = data) {
    const supabase = getClient();
    if (!supabase) {
      remoteStatus = 'not-configured';
      return { ok: false, reason: 'Supabase publishable key is not configured.' };
    }

    const [contentResult, projectsResult, postsResult] = await Promise.all([
      supabase.from('site_content').upsert(pagePayloadRows(next), { onConflict: 'section' }),
      supabase.from('projects').upsert(projectPayloadRows(next), { onConflict: 'slug' }),
      supabase.from('blog_posts').upsert(blogPayloadRows(next), { onConflict: 'slug' })
    ]);

    const error = contentResult.error || projectsResult.error || postsResult.error;
    if (error) throw error;
    remoteStatus = 'saved';
    return { ok: true };
  }

  async function signInAdmin(email, password) {
    const supabase = getClient();
    if (!supabase?.auth?.signInWithPassword) return { ok: false, reason: 'Supabase auth is not configured.' };
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, user: authData.user };
  }

  async function signOutAdmin() {
    const supabase = getClient();
    if (supabase?.auth?.signOut) await supabase.auth.signOut();
  }

  function notify() {
    window.dispatchEvent(new CustomEvent('kingmezo:cms-updated', { detail: clone(data) }));
  }

  function setData(next) {
    data = mergeDeep(defaultData, next);
    writeLocal(data);
    notify();
    return data;
  }

  async function saveData(next, options = {}) {
    setData(next);
    if (options.remote) return saveRemote(data);
    return { ok: true, local: true };
  }

  function resetLocal() {
    localStorage.removeItem(STORAGE_KEY);
    data = clone(defaultData);
    notify();
    return data;
  }

  window.KingmezoCMS = {
    getData: () => clone(data),
    setData,
    saveData,
    loadRemote,
    saveRemote,
    signInAdmin,
    signOutAdmin,
    resetLocal,
    isSupabaseConfigured,
    getRemoteStatus: () => remoteStatus,
    projectCategorySlug,
    storageKey: STORAGE_KEY
  };

  window.dispatchEvent(new CustomEvent('kingmezo:cms-ready', { detail: clone(data) }));

  if (isSupabaseConfigured()) {
    loadRemote().catch(error => {
      remoteStatus = 'error';
      console.warn('CMS remote content could not be loaded. Local content is still available.', error);
    });
  }
})();
