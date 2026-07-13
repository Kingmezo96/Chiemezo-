alter table public.projects
add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.blog_posts
add column if not exists publisher text not null default 'Chibuzo Ogbonnaya';

create index if not exists projects_meta_gin_idx on public.projects using gin (meta);
