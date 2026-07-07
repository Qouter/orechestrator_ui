-- URL del PR de GitHub asociado al issue de Linear (de sus attachments).
alter table public.tasks add column if not exists pr_url text;
