create extension if not exists pgcrypto;

create or replace function public.cms_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
    or ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin')
    or ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'editor')
    or (lower(coalesce(auth.jwt() ->> 'email', '')) = 'chibuzoobonna01@gmail.com'),
    false
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.site_content (
  content_key text primary key,
  page text not null,
  label text not null,
  eyebrow text,
  title text,
  body text,
  image_url text,
  button_label text,
  button_url text,
  meta jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  title text not null,
  summary text,
  tags text[] not null default '{}'::text[],
  image_url text,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.project_categories (
  slug text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_slug text references public.project_categories(slug) on update cascade on delete set null,
  title text not null,
  subtitle text,
  description text,
  image_url text,
  layout text not null default 'standard',
  is_featured boolean not null default false,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text,
  image_url text,
  published_at timestamptz,
  read_time text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_content_page_idx on public.site_content(page, sort_order);
create index services_visible_sort_idx on public.services(is_visible, sort_order);
create index projects_category_sort_idx on public.projects(category_slug, is_visible, sort_order);
create index projects_featured_sort_idx on public.projects(is_featured, is_visible, sort_order);
create index blog_posts_status_sort_idx on public.blog_posts(status, published_at desc, sort_order);
create index contact_messages_status_created_idx on public.contact_messages(status, created_at desc);
create index newsletter_subscribers_status_created_idx on public.newsletter_subscribers(status, created_at desc);

create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create trigger set_site_content_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger set_project_categories_updated_at
before update on public.project_categories
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

create trigger set_contact_messages_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

create trigger set_media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.services enable row level security;
alter table public.project_categories enable row level security;
alter table public.projects enable row level security;
alter table public.blog_posts enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.media_assets enable row level security;

grant usage on schema public to anon, authenticated;
grant execute on function public.cms_is_admin() to authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.project_categories to anon, authenticated;
grant select on public.projects to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select on public.media_assets to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.site_content to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.project_categories to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.blog_posts to authenticated;
grant select, insert, update, delete on public.contact_messages to authenticated;
grant select, insert, update, delete on public.newsletter_subscribers to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;

create policy "Public can read site settings"
on public.site_settings for select
to anon
using (true);

create policy "Admins can manage site settings"
on public.site_settings for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read visible site content"
on public.site_content for select
to anon
using (is_visible);

create policy "Admins can manage site content"
on public.site_content for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read visible services"
on public.services for select
to anon
using (is_visible);

create policy "Admins can manage services"
on public.services for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read visible project categories"
on public.project_categories for select
to anon
using (is_visible);

create policy "Admins can manage project categories"
on public.project_categories for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read visible projects"
on public.projects for select
to anon
using (is_visible);

create policy "Admins can manage projects"
on public.projects for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read published blog posts"
on public.blog_posts for select
to anon
using (status = 'published');

create policy "Admins can manage blog posts"
on public.blog_posts for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Anyone can submit contact messages"
on public.contact_messages for insert
to anon
with check (
  length(trim(name)) between 2 and 120
  and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and length(trim(message)) between 5 and 4000
  and (subject is null or length(subject) <= 160)
);

create policy "Admins can manage contact messages"
on public.contact_messages for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Anyone can join the newsletter"
on public.newsletter_subscribers for insert
to anon
with check (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and length(email) <= 254
  and length(source) <= 80
);

create policy "Admins can manage newsletter subscribers"
on public.newsletter_subscribers for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

create policy "Public can read media assets"
on public.media_assets for select
to anon
using (true);

create policy "Admins can manage media assets"
on public.media_assets for all
to authenticated
using ((select public.cms_is_admin()))
with check ((select public.cms_is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read site media files"
on storage.objects for select
to authenticated
using (bucket_id = 'site-media' and (select public.cms_is_admin()));

create policy "Admins can upload site media files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media' and (select public.cms_is_admin()));

create policy "Admins can update site media files"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media' and (select public.cms_is_admin()))
with check (bucket_id = 'site-media' and (select public.cms_is_admin()));

create policy "Admins can delete site media files"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media' and (select public.cms_is_admin()));

insert into public.site_settings (key, value)
values
  ('brand', '{"logo":"c.chiemezo","name":"Chibuzo Ogbonnaya"}'),
  ('contact', '{"email":"ChibuzoObonna01@gmail.com","location":"Nigeria | Global Collaboration","linkedin":"https://www.linkedin.com/in/kingmezo/"}')
on conflict (key) do update set value = excluded.value;

insert into public.site_content (content_key, page, label, eyebrow, title, body, image_url, button_label, button_url, meta, sort_order)
values
  ('home.hero', 'home', 'Home hero', null, 'Impact Led By Community', 'I build programs that connect young people to education, technology, opportunity, and dignity.', 'assets/chiemezo/hero-community-team.jpg', 'Featured Initiative', 'project.html', '{"location":"Based in Nigeria, working across Africa"}', 1),
  ('home.about', 'home', 'About snapshot', 'About Me', 'Driving sustainable communities through systems and innovations.', 'Through community programs, digital inclusion, and practical development work, I help people and partners turn ideas into measurable value.', 'assets/chiemezo/about-leadership.jpg', 'About Me', 'about.html', '{}', 2),
  ('home.services', 'home', 'Services heading', 'Service', 'How I Can Help', null, null, null, null, '{}', 3),
  ('home.featured', 'home', 'Featured heading', 'Featured Project', 'Collaboration Highlights', null, null, 'View Projects', 'project.html', '{}', 4),
  ('home.cta', 'home', 'Main call to action', null, 'Ready to build meaningful impact?', null, null, 'Contact Now', 'contact.html', '{}', 5),
  ('home.blog', 'home', 'Blog heading', 'Blog', 'Insights For Impact', 'Notes on education, technology, public engagement, and durable programs.', null, 'View Blog', 'blog.html', '{}', 6),
  ('about.hero', 'about', 'About hero', 'About Me', 'Driving sustainable communities through systems and innovations.', null, 'assets/chiemezo/about-leadership.jpg', null, null, '{}', 1),
  ('about.profile', 'about', 'Profile section', 'Profile', 'I connect policy, technology, education, and sustainable development.', 'My work improves access to learning, digital skills, and opportunity for young people through practical community programs.', null, null, null, '{}', 2),
  ('project.hero', 'project', 'Projects hero', 'Projects', 'Selected Community Work', 'Programs, products, and brand systems shaped around education, inclusion, safe spaces, and measurable value.', 'assets/chiemezo/project-partners.jpg', null, null, '{}', 1),
  ('blog.hero', 'blog', 'Blog hero', 'Blog', 'Insight Meets Impact', 'Practical notes on community development, EdTech, digital inclusion, and youth engagement.', 'assets/chiemezo/community-gathering.jpg', null, null, '{}', 1),
  ('contact.hero', 'contact', 'Contact hero', 'Contact', 'Let''s Build Impact', 'For partnerships, speaking, programs, or community projects, send a clear note about the challenge and audience.', null, null, null, '{}', 1),
  ('contact.intro', 'contact', 'Contact intro', null, 'Open to partnerships, speaking, projects, and programs.', null, null, null, null, '{}', 2)
on conflict (content_key) do update
set page = excluded.page,
    label = excluded.label,
    eyebrow = excluded.eyebrow,
    title = excluded.title,
    body = excluded.body,
    image_url = excluded.image_url,
    button_label = excluded.button_label,
    button_url = excluded.button_url,
    meta = excluded.meta,
    sort_order = excluded.sort_order;

insert into public.services (sort_order, title, summary, tags, image_url, is_visible)
values
  (1, 'Community Engagement', 'Designing practical initiatives that connect people, partners, and local needs with clear outcomes.', array['Development', 'Planning', 'Strategy'], 'assets/chiemezo/community-gathering.jpg', true),
  (2, 'Project Management', 'Keeping programs structured from planning to execution, with timelines, teams, and impact goals aligned.', array['Scope', 'Coordination', 'Delivery'], 'assets/chiemezo/project-field-coordination.jpg', true),
  (3, 'Product Management', 'Shaping product ideas, feature priorities, and user experiences for mission-driven digital projects.', array['Roadmaps', 'User Journeys', 'Launch'], 'assets/chiemezo/project-leadership.jpg', true),
  (4, 'Branding & Consultancy', 'Clarifying brand direction, communication, and campaign identity for projects that need stronger visibility.', array['Positioning', 'Messaging', 'Advisory'], 'assets/chiemezo/project-partners.jpg', true);

insert into public.project_categories (slug, label, sort_order, is_visible)
values
  ('all', 'All', 0, true),
  ('community', 'Community', 1, true),
  ('education', 'Education', 2, true),
  ('digital', 'Digital', 3, true),
  ('advocacy', 'Advocacy', 4, true),
  ('product', 'Product', 5, true),
  ('branding', 'Branding', 6, true)
on conflict (slug) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible;

insert into public.projects (slug, category_slug, title, subtitle, description, image_url, layout, is_featured, is_visible, sort_order)
values
  ('big-smile-initiative', 'community', 'Big Smile Initiative', 'Humanitarian Impact', 'A community-centered outreach initiative focused on dignity, access, and practical support.', 'assets/chiemezo/community-children.jpg', 'tall', true, true, 1),
  ('edubridge', 'education', 'EduBridge', 'Education Access', 'Mentorship and learning access support for young people and underserved learners.', 'assets/chiemezo/community-child.jpg', 'standard', false, true, 2),
  ('digital-literacy', 'digital', 'Digital Literacy', 'Coding, Canva, Office', 'Digital inclusion work helping young people build practical technology and creative skills.', 'assets/chiemezo/project-team-planning.jpg', 'tall', true, true, 3),
  ('dont-bully-me', 'advocacy', 'Don''t Bully Me', 'Child Advocacy', 'Safe-school advocacy that supports kinder learning environments and youth wellbeing.', 'assets/chiemezo/community-lineup.jpg', 'tall', false, true, 4),
  ('climate-fellowship', 'advocacy', 'Climate Fellowship', 'Sustainability', 'Youth-centered sustainability and climate action engagement.', 'assets/chiemezo/community-culture.jpg', 'wide', false, true, 5),
  ('chase-project', 'product', 'Chase Project', 'Product Management', 'A product management project shaped around roadmaps, user journeys, and structured delivery.', 'assets/chiemezo/project-field-coordination.jpg', 'wide', true, true, 6),
  ('product-roadmap', 'product', 'Product Roadmap', 'Strategy', 'Planning product priorities, feature flow, and launch direction for mission-driven work.', 'assets/chiemezo/project-team-planning.jpg', 'standard', false, true, 7),
  ('brand-strategy', 'branding', 'Brand Strategy', 'Positioning', 'Brand positioning, message clarity, and campaign direction for purpose-led projects.', 'assets/chiemezo/project-partners.jpg', 'standard', false, true, 8),
  ('campaign-identity', 'branding', 'Campaign Identity', 'Messaging', 'Campaign identity and communication systems for public-facing initiatives.', 'assets/chiemezo/project-group.jpg', 'wide', false, true, 9)
on conflict (slug) do update
set category_slug = excluded.category_slug,
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    image_url = excluded.image_url,
    layout = excluded.layout,
    is_featured = excluded.is_featured,
    is_visible = excluded.is_visible,
    sort_order = excluded.sort_order;

insert into public.blog_posts (slug, title, excerpt, content, image_url, published_at, read_time, status, sort_order)
values
  ('designing-digital-literacy', 'Designing Digital Literacy', 'How digital programs can become practical, local, and useful for young people.', 'Digital literacy works best when it is tied to real tasks, confidence, and access. The goal is not only to teach tools, but to help people use those tools for education, work, creativity, and safer participation online.', 'assets/chiemezo/project-team-planning.jpg', '2026-06-03 09:00:00+00', '5 mins read', 'published', 1),
  ('making-policy-work-locally', 'Making Policy Work Locally', 'Turning broad development ideas into practical local coordination.', 'Policy becomes useful when communities can see what changes in their everyday lives. That means clearer goals, better partners, and feedback from the people affected by the work.', 'assets/chiemezo/community-gathering.jpg', '2026-04-22 09:00:00+00', '4 mins read', 'published', 2),
  ('safer-learning-spaces', 'Safer Learning Spaces', 'Why safety, dignity, and belonging matter in education programs.', 'Young people learn better where they feel protected and respected. Safer learning spaces require planning, trusted adults, and systems that respond early to harm.', 'assets/chiemezo/community-lineup.jpg', '2026-05-12 09:00:00+00', '6 mins read', 'published', 3),
  ('youth-participation-matters', 'Youth Participation Matters', 'Durable community projects should include young people in decisions, not just events.', 'Participation is more than attendance. It means young people can shape priorities, contribute ideas, and see evidence that their voices affected the outcome.', 'assets/chiemezo/hero-community-team.jpg', '2026-03-18 09:00:00+00', '5 mins read', 'published', 4)
on conflict (slug) do update
set title = excluded.title,
    excerpt = excluded.excerpt,
    content = excluded.content,
    image_url = excluded.image_url,
    published_at = excluded.published_at,
    read_time = excluded.read_time,
    status = excluded.status,
    sort_order = excluded.sort_order;
