begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', role text not null check (role in ('admin','recipient')), created_at timestamptz not null default now()
);
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin'); $$;
create function private.is_member() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid())); $$;
revoke all on function private.is_admin(), private.is_member() from public;
grant execute on function private.is_admin(), private.is_member() to authenticated;
create table public.letters (
 id uuid primary key default gen_random_uuid(), day integer unique not null check(day between 1 and 24),
 title text not null default '' check(length(title)<=200), content text not null default '' check(length(content)<=50000),
 dedication text not null default '' check(length(dedication)<=2000), content_type text not null default 'Carta' check(length(content_type)<=80),
 image_path text, image_paths text[] not null default '{}', music_url text not null default '' check(music_url='' or music_url ~ '^https://'),
 celebration_message text not null default '' check(length(celebration_message)<=2000), unlock_at timestamptz not null, is_published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not is_published or (length(trim(title))>0 and length(trim(content))>0)),
 check(unlock_at = make_timestamptz(2026,12,day,0,0,0,'America/Guayaquil')), check(cardinality(image_paths)<=12)
);
create table public.letter_drafts (
 letter_id uuid primary key references public.letters(id) on delete cascade,
 title text not null default '' check(length(title)<=200), content text not null default '' check(length(content)<=50000),
 dedication text not null default '' check(length(dedication)<=2000), content_type text not null default 'Carta' check(length(content_type)<=80),
 image_paths text[] not null default '{}', music_url text not null default '' check(music_url='' or music_url ~ '^https://'),
 celebration_message text not null default '' check(length(celebration_message)<=2000), updated_at timestamptz not null default now(), check(cardinality(image_paths)<=12)
);
create table public.letter_reads (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 letter_id uuid not null references public.letters(id) on delete cascade, opened_at timestamptz not null default now(), unique(user_id,letter_id)
);
create index letters_visibility on public.letters(is_published,unlock_at);
create index letter_reads_letter on public.letter_reads(letter_id);
create table public.app_settings (
 id integer primary key default 1 check(id=1), app_title text not null default 'Diciembre contigo' check(length(app_title) between 1 and 100),
 welcome_message text not null default 'Este diciembre quiero regalarte algo diferente. No serán 24 regalos materiales, sino 24 pequeños recordatorios de lo mucho que te amo y de lo feliz que me hace compartir mi vida contigo.' check(length(welcome_message)<=5000),
 final_message text not null default 'Nuestro diciembre terminó, pero nuestra historia apenas comienza.' check(length(final_message)<=2000),
 memory_message text not null default 'Diciembre pasó, pero todo lo que siento por ti sigue aquí.' check(length(memory_message)<=2000),
 accent_color text not null default '#A65D78' check(accent_color ~ '^#[0-9a-fA-F]{6}$'),
 start_date timestamptz not null default '2026-12-01 00:00:00-05' check(start_date='2026-12-01 00:00:00-05'::timestamptz),
 end_date timestamptz not null default '2026-12-24 00:00:00-05' check(end_date='2026-12-24 00:00:00-05'::timestamptz)
);
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=clock_timestamp();return new;end; $$;
create trigger letters_updated before update on public.letters for each row execute function private.touch_updated_at();
create trigger drafts_updated before update on public.letter_drafts for each row execute function private.touch_updated_at();
alter table public.profiles enable row level security;
alter table public.letters enable row level security;
alter table public.letter_drafts enable row level security;
alter table public.letter_reads enable row level security;
alter table public.app_settings enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_admin()));
create policy letter_read on public.letters for select to authenticated using((select private.is_admin()) or ((select private.is_member()) and is_published and unlock_at<=now()));
create policy drafts_admin on public.letter_drafts for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy reads_read on public.letter_reads for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy settings_read on public.app_settings for select to authenticated using((select private.is_member()));
create policy settings_update on public.app_settings for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
revoke all on public.profiles,public.letters,public.letter_drafts,public.letter_reads,public.app_settings from anon,authenticated;
grant select on public.profiles,public.letters,public.letter_reads,public.app_settings to authenticated;
grant select,insert,update,delete on public.letter_drafts to authenticated;
grant update(app_title,welcome_message,final_message,memory_message,accent_color) on public.app_settings to authenticated;
create function public.calendar_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_member() then raise exception 'Acceso no autorizado' using errcode='42501';end if;
 return jsonb_build_object('server_now',now(),'days',(select jsonb_agg(jsonb_build_object('day',l.day,'available',l.is_published and l.unlock_at<=now(),'unlocked',l.unlock_at<=now(),'is_read',exists(select 1 from public.letter_reads r where r.letter_id=l.id and r.user_id=auth.uid())) order by l.day) from public.letters l));
end;$$;
create function public.mark_letter_read(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_member() or not exists(select 1 from public.letters where id=target and is_published and unlock_at<=now()) then raise exception 'Carta no disponible' using errcode='42501';end if;
 insert into public.letter_reads(user_id,letter_id) values(auth.uid(),target) on conflict(user_id,letter_id) do nothing;
end;$$;
create function public.publish_letter(target uuid, expected_updated_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare d public.letter_drafts;
begin
 if not private.is_admin() then raise exception 'Solo el administrador puede publicar' using errcode='42501';end if;
 select * into d from public.letter_drafts where letter_id=target for update;
 if not found then raise exception 'Guarda el borrador primero';end if;
 if d.updated_at is distinct from expected_updated_at then raise exception 'El borrador cambió en otra sesión. Vuelve a cargarlo.';end if;
 if length(trim(d.title))=0 or length(trim(d.content))=0 then raise exception 'Escribe un título y el contenido antes de publicar';end if;
 if exists(select 1 from unnest(d.image_paths) p where p not like target::text || '/%' or not exists(select 1 from storage.objects o where o.bucket_id='letter-photos' and o.name=p)) then raise exception 'Hay fotografías que no se han subido correctamente';end if;
 update public.letters set title=d.title,content=d.content,dedication=d.dedication,content_type=d.content_type,image_paths=d.image_paths,image_path=d.image_paths[1],music_url=d.music_url,celebration_message=d.celebration_message,is_published=true where id=target;
end;$$;
create function public.unpublish_letter(target uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not private.is_admin() then raise exception 'Acceso no autorizado' using errcode='42501';end if;
 update public.letters set is_published=false where id=target;
end;$$;
revoke all on function public.calendar_state(),public.mark_letter_read(uuid),public.publish_letter(uuid,timestamptz),public.unpublish_letter(uuid) from public,anon;
grant execute on function public.calendar_state(),public.mark_letter_read(uuid),public.publish_letter(uuid,timestamptz),public.unpublish_letter(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('letter-photos','letter-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy photo_read on storage.objects for select to authenticated using(bucket_id='letter-photos' and ((select private.is_admin()) or ((select private.is_member()) and exists(select 1 from public.letters l where l.is_published and l.unlock_at<=now() and name=any(l.image_paths)))));
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='letter-photos' and (select private.is_admin()) and exists(select 1 from public.letters l where l.id::text=split_part(name,'/',1)));
-- Immutable names prevent changing a published image through a draft upload.
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='letter-photos' and (select private.is_admin()) and not exists(select 1 from public.letters l where name=any(l.image_paths)) and not exists(select 1 from public.letter_drafts d where name=any(d.image_paths)));
insert into public.letters(day,unlock_at) select d,make_timestamptz(2026,12,d,0,0,0,'America/Guayaquil') from generate_series(1,24) d on conflict(day) do nothing;
insert into public.letter_drafts(letter_id) select id from public.letters on conflict(letter_id) do nothing;
insert into public.app_settings(id) values(1) on conflict(id) do nothing;
commit;
